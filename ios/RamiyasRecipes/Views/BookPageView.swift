import SwiftUI
import UIKit

// The recipe as a page of the spiral book (the sweet chili chicken photo, docs/DESIGN.md): cream
// ruled paper, "recipe:" title, mauve stat box, tag circles, two ingredient columns, ▷ steps and
// "–" sub-steps, the spiral on the left and the category tabs on the right.

private let line: CGFloat = 36 // one ruled line
private let handSize: CGFloat = 22

// Extra space so every wrapped line of handwriting sits on a rule.
private let handLineHeight = UIFont(name: "PatrickHand-Regular", size: handSize)?.lineHeight ?? 26
private let gap = max(0, line - handLineHeight)
private let lift: CGFloat = 6 // how far the writing sits above its rule

// Handwriting that wraps line by line onto the page's rules; its height is a whole number of lines.
private struct Written: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.hand(handSize))
            .foregroundStyle(Color.ink)
            .lineSpacing(gap)
            .padding(.top, gap - lift)
            .padding(.bottom, lift)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
    }
}

struct BookPageScreen: View {
    let recipe: Recipe
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                BookPage(recipe: recipe)
                    .frame(maxWidth: 860)
                    .padding(.leading, 40)
                    .padding(.trailing, 48)
                    .padding(.vertical, 32)
                    .frame(maxWidth: .infinity)
            }
            .background(Color(hex: 0xE9E4DA))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Done") { dismiss() } }
        }
    }
}

struct BookPage: View {
    let recipe: Recipe

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            ruled
        }
        .padding(.leading, 44)
        .padding(.trailing, 36)
        .padding(.vertical, 32)
        .background(Color.paper)
        .clipShape(RoundedRectangle(cornerRadius: 3))
        .shadow(color: .black.opacity(0.14), radius: 10, y: 3)
        .overlay(alignment: .leading) { Spiral().frame(width: 40).padding(.vertical, 24).offset(x: -20) }
        .overlay(alignment: .topTrailing) { SideTabs(current: recipe.category).offset(x: 34).padding(.top, 96) }
    }

    // ---- top of the page: title, stat box, tags

    private var header: some View {
        VStack(alignment: .leading, spacing: 14) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: 20) { title; statBox }
                VStack(alignment: .leading, spacing: 14) { title; statBox }
            }
            FlowLayout(spacing: 14, lineSpacing: 6) {
                ForEach(Book.tags, id: \.id) { t in
                    let on = recipe.tags.contains(t.id)
                    HStack(spacing: 5) {
                        TagCircle(on: on)
                        Text(t.label).labelCaps(8.5, color: on ? .ink : .label)
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
            .padding(.bottom, 10)
            Rectangle().fill(Color.rule).frame(height: 1)
        }
    }

    private var title: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("recipe:").font(.slab(23)).foregroundStyle(Color.label)
            (Text(recipe.title).font(.hand(30)).foregroundColor(.ink)
                + (recipe.isFavorite ? Text("  *").font(.system(size: 34, weight: .bold)).foregroundColor(.teal) : Text("")))
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(minWidth: 300, maxWidth: .infinity, alignment: .leading)
    }

    private var statBox: some View {
        HStack(spacing: 0) {
            statCell("Servings", recipe.servings.map { "\($0)" } ?? "", first: true)
            statCell("Prep time", recipe.prepMin.map { "\($0) min" } ?? "")
            statCell("Cook time", recipe.cookMin.map { "\($0) min" } ?? "")
        }
        .frame(width: 290)
        .overlay(Rectangle().stroke(Color.mauve, lineWidth: 1))
    }

    private func statCell(_ label: String, _ value: String, first: Bool = false) -> some View {
        VStack(spacing: 0) {
            Text(label).labelCaps(8, color: .white)
                .frame(maxWidth: .infinity).padding(.vertical, 3).background(Color.mauve)
            Text(value).font(.hand(22)).foregroundStyle(Color.ink).frame(height: 38)
        }
        .overlay(alignment: .leading) {
            if !first { Rectangle().fill(Color.mauve).frame(width: 1) }
        }
    }

    // ---- the ruled part: everything is a whole number of lines tall, so writing sits on the rules

    private var ruled: some View {
        VStack(alignment: .leading, spacing: 0) {
            Color.clear.frame(height: line)
            sectionLabel("Ingredients") {
                Image("RollingPin").resizable().scaledToFit().frame(width: 100, height: 20).padding(.leading, 18).padding(.bottom, 6)
            }
            ingredientColumns
            Color.clear.frame(height: line)
            sectionLabel("Directions") {
                Image("WhiskAndSpoon").resizable().scaledToFit().frame(width: 62, height: 56).padding(.leading, 24).padding(.bottom, 4)
                Spacer()
                Image("PlateSetting").resizable().scaledToFit().frame(width: 84, height: 44).padding(.bottom, 4)
            }
            ForEach(Array(recipe.stepGroups.enumerated()), id: \.offset) { _, g in
                marked("▷", indent: 0, g.title)
                ForEach(Array(g.steps.enumerated()), id: \.offset) { _, s in marked("–", indent: 48, s) }
            }
            if !recipe.notes.isEmpty {
                Color.clear.frame(height: line)
                sectionLabel("Notes") { EmptyView() }
                ForEach(recipe.notes.split(separator: "\n").map(String.init), id: \.self) { Written(text: $0) }
            }
            Color.clear.frame(height: line * 2)
        }
        .background(alignment: .top) {
            RuledLines(spacing: line).padding(.top, 0)
        }
    }

    private func sectionLabel<Extra: View>(_ text: String, @ViewBuilder extra: () -> Extra) -> some View {
        HStack(alignment: .bottom, spacing: 0) {
            Text(text).labelCaps(11).padding(.bottom, 8)
            extra()
        }
        .frame(height: line, alignment: .bottomLeading)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var ingredientColumns: some View {
        let (left, right) = Format.splitColumns(recipe.ingredientGroups)
        return HStack(alignment: .top, spacing: 28) {
            column(left)
            column(right)
        }
    }

    private func column(_ lines: [Format.Line]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(lines.enumerated()), id: \.offset) { _, l in
                Text(l.text.isEmpty ? " " : l.text)
                    .font(.hand(l.kind == .name ? handSize * 0.9 : handSize))
                    .foregroundStyle(Color.ink.opacity(l.kind == .name ? 0.8 : 1))
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .padding(.bottom, lift)
                    .frame(maxWidth: .infinity, minHeight: line, maxHeight: line, alignment: l.kind == .name ? .bottomTrailing : .bottomLeading)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func marked(_ mark: String, indent: CGFloat, _ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(mark).font(.system(size: mark == "▷" ? 15 : handSize)).foregroundStyle(Color.ink)
                .frame(width: 18, alignment: .leading)
            Written(text: text)
        }
        .padding(.leading, indent)
    }
}

// The book's tag checkbox: a thin circle, crossed through in ink when checked.
struct TagCircle: View {
    let on: Bool
    var body: some View {
        Canvas { ctx, size in
            let s = size.width / 12
            ctx.stroke(Path(ellipseIn: CGRect(x: 1.5 * s, y: 1.5 * s, width: 9 * s, height: 9 * s)), with: .color(.label), lineWidth: 1)
            if on {
                var x = Path()
                x.move(to: CGPoint(x: 2.2 * s, y: 2.6 * s))
                x.addCurve(to: CGPoint(x: 10 * s, y: 10.2 * s), control1: CGPoint(x: 4.5 * s, y: 5 * s), control2: CGPoint(x: 7 * s, y: 7.6 * s))
                x.move(to: CGPoint(x: 9.6 * s, y: 2 * s))
                x.addCurve(to: CGPoint(x: 2.4 * s, y: 9.8 * s), control1: CGPoint(x: 7.4 * s, y: 4.6 * s), control2: CGPoint(x: 4.8 * s, y: 7.4 * s))
                ctx.stroke(x, with: .color(.ink), style: StrokeStyle(lineWidth: 1.6, lineCap: .round))
            }
        }
        .frame(width: 13, height: 13)
    }
}

// The wire binding: one ring repeated down the whole page (the website's Spiral).
struct Spiral: View {
    var ringHeight: CGFloat = 18
    var body: some View {
        Canvas { ctx, size in
            let s = ringHeight / 18
            var y: CGFloat = 0
            while y + ringHeight <= size.height {
                func p(_ x: CGFloat, _ yy: CGFloat) -> CGPoint { CGPoint(x: x * s, y: y + yy * s) }
                ctx.fill(Path(ellipseIn: CGRect(x: 27.5 * s, y: y + 9.5 * s, width: 5 * s, height: 5 * s)), with: .color(.page))
                var front = Path()
                front.move(to: p(30, 12))
                front.addCurve(to: p(4, 10), control1: p(22, 3), control2: p(4, 3))
                ctx.stroke(front, with: .color(.ring), style: StrokeStyle(lineWidth: 3 * s, lineCap: .round))
                var back = Path()
                back.move(to: p(4, 10))
                back.addCurve(to: p(26, 13), control1: p(4, 16), control2: p(18, 17))
                ctx.stroke(back, with: .color(.ring.opacity(0.6)), style: StrokeStyle(lineWidth: 3 * s, lineCap: .round))
                y += ringHeight
            }
        }
        .accessibilityHidden(true)
    }
}

// The colored category tabs down the right edge; the recipe's own category sticks out further.
private struct SideTabs: View {
    let current: String
    var body: some View {
        VStack(spacing: 8) {
            ForEach(Book.categories) { c in
                Text(c.name)
                    .labelCaps(9, color: .white)
                    .fixedSize()
                    .frame(width: 110, height: 30)
                    .background(c.color)
                    .rotationEffect(.degrees(90))
                    .frame(width: 30, height: 110)
                    .clipShape(UnevenRoundedRectangle(bottomTrailingRadius: 6, topTrailingRadius: 6))
                    .offset(x: c.slug == current ? 6 : 0)
                    .opacity(c.slug == current ? 1 : 0.75)
            }
        }
        .accessibilityHidden(true)
    }
}
