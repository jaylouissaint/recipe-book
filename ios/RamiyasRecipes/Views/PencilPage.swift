import PencilKit
import SwiftUI
import UIKit
import Vision

// Page mode on the writing page (docs/APP_PLAN.md Phase 3): write anywhere on a ruled book page
// with the Apple Pencil. The page has printed areas for the title, ingredients (two columns),
// directions and notes, so Apple's on-device text recognition knows what each line is. The
// drawing is kept as the recipe's handwritten page. Nothing leaves the iPad until it's saved.
enum PencilPage {
    static let width: CGFloat = 760
    static let line: CGFloat = 36
    static let top: CGFloat = 32
    static let left: CGFloat = 56
    static let right: CGFloat = 40

    enum Area: CaseIterable {
        case title, ingredients, directions, notes

        var label: String {
            switch self {
            case .title: "recipe:"
            case .ingredients: "Ingredients"
            case .directions: "Directions"
            case .notes: "Notes"
            }
        }

        // Ruled lines to write on, after the area's label line (the title is written beside its label).
        var lines: Int {
            switch self {
            case .title: 2
            case .ingredients: 12
            case .directions: 18
            case .notes: 5
            }
        }
    }

    // Where each area starts, in lines from the top margin.
    static func firstLine(_ area: Area) -> Int {
        var n = 0
        for a in Area.allCases {
            if a == area { return n }
            n += (a == .title ? 0 : 1) + a.lines + 1 // label line, ruled lines, one spare line
        }
        return n
    }

    // The area, label line included, so writing next to a label counts.
    static func rect(_ area: Area) -> CGRect {
        let lines = (area == .title ? 0 : 1) + area.lines
        return CGRect(x: 0, y: top + CGFloat(firstLine(area)) * line, width: width, height: CGFloat(lines) * line)
    }

    static var size: CGSize {
        let r = rect(.notes)
        return CGSize(width: width, height: r.maxY + line + top)
    }

    // The middle of the ingredients area, between its two columns.
    static let columnSplit = left + (width - left - right) / 2
}

// The printed page: cream paper, rules, area labels and the dashed line between ingredient
// columns. When editing a recipe that already has a handwritten page, that page is shown instead.
struct PencilPaper: View {
    var picture: UIImage?

    var body: some View {
        ZStack(alignment: .topLeading) {
            if let picture {
                Image(uiImage: picture).resizable()
            } else {
                Color.paper
                rules
                ForEach(PencilPage.Area.allCases, id: \.self) { area in
                    label(area)
                }
            }
        }
        .frame(width: PencilPage.size.width, height: PencilPage.size.height)
    }

    private var rules: some View {
        Canvas { ctx, size in
            var y = PencilPage.top + PencilPage.line
            while y < size.height - PencilPage.top {
                ctx.fill(Path(CGRect(x: PencilPage.left - 16, y: y, width: size.width - PencilPage.left - PencilPage.right + 16, height: 1)), with: .color(.rule))
                y += PencilPage.line
            }
            let ing = PencilPage.rect(.ingredients)
            var split = Path()
            split.move(to: CGPoint(x: PencilPage.columnSplit, y: ing.minY + PencilPage.line + 6))
            split.addLine(to: CGPoint(x: PencilPage.columnSplit, y: ing.maxY - 6))
            ctx.stroke(split, with: .color(.rule), style: StrokeStyle(lineWidth: 1, dash: [4, 6]))
        }
    }

    private func label(_ area: PencilPage.Area) -> some View {
        let r = PencilPage.rect(area)
        return Group {
            if area == .title {
                Text(area.label).font(.slab(23)).foregroundStyle(Color.label)
            } else {
                Text(area.label).labelCaps(11)
            }
        }
        .frame(height: PencilPage.line - 8, alignment: .bottomLeading)
        .offset(x: PencilPage.left, y: r.minY)
    }
}

// The PencilKit canvas, with Apple's tool picker. Finger or Pencil follows the iPad's
// "Only Draw with Apple Pencil" setting (also in the tool picker's menu).
struct PencilCanvas: UIViewRepresentable {
    @Binding var drawing: PKDrawing

    func makeUIView(context: Context) -> PKCanvasView {
        let canvas = PKCanvasView()
        canvas.drawing = drawing
        canvas.backgroundColor = .clear
        canvas.isOpaque = false
        canvas.isScrollEnabled = false
        canvas.drawingPolicy = .default
        canvas.delegate = context.coordinator
        let pen = PKInkingTool(.pen, color: UIColor(Color.ink), width: 3)
        canvas.tool = pen
        let picker = PKToolPicker()
        picker.selectedTool = pen
        picker.addObserver(canvas)
        picker.setVisible(true, forFirstResponder: canvas)
        context.coordinator.picker = picker
        DispatchQueue.main.async { canvas.becomeFirstResponder() }
        return canvas
    }

    func updateUIView(_ canvas: PKCanvasView, context: Context) {
        if canvas.drawing != drawing { canvas.drawing = drawing }
    }

    static func dismantleUIView(_ canvas: PKCanvasView, coordinator: Coordinator) {
        coordinator.picker?.setVisible(false, forFirstResponder: canvas)
        coordinator.picker?.removeObserver(canvas)
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, PKCanvasViewDelegate {
        let parent: PencilCanvas
        var picker: PKToolPicker?
        init(_ parent: PencilCanvas) { self.parent = parent }

        func canvasViewDrawingDidChange(_ canvas: PKCanvasView) {
            parent.drawing = canvas.drawing
        }
    }
}

// Turning the page's writing into the recipe's text, on the iPad (Vision).
enum HandwritingReader {
    struct Found: Equatable {
        let text: String
        let frame: CGRect // in page points, from the top left
    }

    // The page as a picture: the paper (or the saved page) with the ink on top.
    @MainActor
    static func render(drawing: PKDrawing, picture: UIImage?, paper: Bool) -> UIImage {
        let size = PencilPage.size
        let format = UIGraphicsImageRendererFormat()
        format.scale = 2
        let background: UIImage? = {
            if let picture { return picture }
            guard paper else { return nil }
            let r = ImageRenderer(content: PencilPaper())
            r.scale = 2
            return r.uiImage
        }()
        let ink = drawing.image(from: CGRect(origin: .zero, size: size), scale: 2)
        return UIGraphicsImageRenderer(size: size, format: format).image { ctx in
            let rect = CGRect(origin: .zero, size: size)
            if let background {
                background.draw(in: rect)
            } else {
                UIColor.white.setFill()
                ctx.fill(rect)
            }
            ink.draw(in: rect)
        }
    }

    // Every line of writing Vision finds, with where it is on the page.
    static func lines(in image: CGImage) async throws -> [Found] {
        try await withCheckedThrowingContinuation { done in
            let request = VNRecognizeTextRequest { request, error in
                if let error { return done.resume(throwing: error) }
                let found = (request.results as? [VNRecognizedTextObservation] ?? []).compactMap { o -> Found? in
                    guard let text = o.topCandidates(1).first?.string else { return nil }
                    let b = o.boundingBox // 0–1, from the bottom left
                    let size = PencilPage.size
                    return Found(text: text, frame: CGRect(x: b.minX * size.width, y: (1 - b.maxY) * size.height,
                                                           width: b.width * size.width, height: b.height * size.height))
                }
                done.resume(returning: found)
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.recognitionLanguages = ["en-US"]
            request.customWords = ["TB", "tsp", "tbsp", "lbs", "oz", "sriracha", "marinade"]
            do {
                try VNImageRequestHandler(cgImage: image).perform([request])
            } catch {
                done.resume(throwing: error)
            }
        }
    }

    // The writing as recipe text with headings, for Parse.recipeText: each line goes to the area
    // it was written in, ingredients column by column, a gap of a line or more stays a blank line
    // (so sections like "marinade" are found), and in directions an indented line is a "–" sub-step.
    static func recipeText(_ found: [Found]) -> String {
        func inArea(_ area: PencilPage.Area) -> [Found] {
            found.filter { PencilPage.rect(area).contains(CGPoint(x: $0.frame.midX, y: $0.frame.midY)) }
                .filter { !Pattern(#"^(recipe\s*:|ingredients|directions|notes)$"#, ignoreCase: true).matches($0.text.trimmingCharacters(in: .whitespaces)) }
        }

        let title = rows(inArea(.title)).map(\.text).joined(separator: " ")

        let ingredients = inArea(.ingredients)
        let left = rows(ingredients.filter { $0.frame.midX < PencilPage.columnSplit })
        let right = rows(ingredients.filter { $0.frame.midX >= PencilPage.columnSplit })

        let steps = rows(inArea(.directions))
        let margin = steps.map(\.frame.minX).min() ?? 0
        let directions = steps.map { row -> String in
            let t = row.text
            if t.isEmpty { return t }
            let marked = Pattern(#"^(?:[▷►▶>]|[-–—•*])"#).matches(t)
            if marked { return t }
            return row.frame.minX > margin + 28 ? "- \(t)" : "▷ \(t)"
        }

        let notes = rows(inArea(.notes)).map(\.text)

        var text: [String] = [title, "Ingredients"]
        text += spaced(left).map(\.text)
        text.append("")
        text += spaced(right).map(\.text)
        text.append("Directions")
        text += directions
        text.append("Notes")
        text += notes
        return text.joined(separator: "\n")
    }

    // Pieces on the same ruled line join into one row, left to right; rows go top to bottom.
    private static func rows(_ found: [Found]) -> [Found] {
        var rows: [[Found]] = []
        for f in found.sorted(by: { $0.frame.midY < $1.frame.midY }) {
            if let last = rows.last?.last, abs(last.frame.midY - f.frame.midY) < PencilPage.line * 0.5 {
                rows[rows.count - 1].append(f)
            } else {
                rows.append([f])
            }
        }
        return rows.map { row in
            let sorted = row.sorted { $0.frame.minX < $1.frame.minX }
            let frame = sorted.dropFirst().reduce(sorted[0].frame) { $0.union($1.frame) }
            return Found(text: sorted.map(\.text).joined(separator: " "), frame: frame)
        }
    }

    // A blank row wherever a line or more was left empty, as between sections in the book.
    private static func spaced(_ rows: [Found]) -> [Found] {
        var out: [Found] = []
        for (i, r) in rows.enumerated() {
            if i > 0, r.frame.minY - rows[i - 1].frame.maxY > PencilPage.line * 0.9 {
                out.append(Found(text: "", frame: .zero))
            }
            out.append(r)
        }
        return out
    }
}
