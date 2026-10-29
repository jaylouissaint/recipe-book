import SwiftData
import SwiftUI
import UIKit

// The whole recipe book to flip through like the spiral book (docs/DESIGN.md "Book view"): the
// cover, contents with page numbers, then every recipe in category order. One page at a time in
// portrait; an open two-page spread with the spiral down the middle in landscape. Pages turn with
// the iPad's page curl (swipe, or the ‹ › buttons); the side tabs jump to a section.
struct BookScreen: View {
    var startAt: String? // a recipe id to open at
    @Query private var recipes: [Recipe]
    @State private var layout: BookLayout.Pages?
    @State private var shownLeaf = 0
    @State private var request: Int?
    @State private var keptPage: Int? // keeps your place when the page size changes
    @State private var opened: Recipe?

    var body: some View {
        VStack(spacing: 0) {
            GeometryReader { proxy in
                let g = BookLayout.Geometry(width: proxy.size.width - 16, height: proxy.size.height - 16)
                ZStack {
                    if let layout, layout.geometry == g {
                        book(layout)
                    } else {
                        Text("opening the book…").font(.hand(24)).foregroundStyle(Color.muted)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .task(id: LayoutKey(geometry: g, recipes: recipes.map { "\($0.id)@\($0.updatedAt)" })) {
                    let current = layout.flatMap { pageOn(leaf: shownLeaf, $0) }
                    let new = BookLayout.pages(recipes, g)
                    var start = startAt.flatMap { new.firstPage[$0] }
                    #if DEBUG
                    // `-debugBookAt 3` opens at that page, for screenshots.
                    let debugPage = UserDefaults.standard.integer(forKey: "debugBookAt")
                    if debugPage > 0 { start = debugPage }
                    #endif
                    let page = keptPage ?? current ?? start ?? 0
                    shownLeaf = new.leaf(ofPage: min(page, new.pages.count - 1))
                    keptPage = page
                    layout = new
                }
            }
            if let layout { controls(layout) }
        }
        .navigationDestination(item: $opened) { RecipeView(recipe: $0) }
    }

    private struct LayoutKey: Equatable {
        let geometry: BookLayout.Geometry
        let recipes: [String]
    }

    private func pageOn(leaf: Int, _ l: BookLayout.Pages) -> Int? {
        let leaves = l.leaves
        guard leaf < leaves.count else { return nil }
        return leaves[leaf] ?? (leaf + 1 < leaves.count ? leaves[leaf + 1] : nil)
    }

    private func book(_ l: BookLayout.Pages) -> some View {
        let g = l.geometry
        let width = g.pageW * (g.spread ? 2 : 1)
        let rightPage = pageOn(leaf: shownLeaf, l).map { l.pages[$0] }
        return HStack(alignment: .top, spacing: 0) {
            PageCurl(count: l.leaves.count, spread: g.spread, start: shownLeaf, shown: $shownLeaf, request: $request) { leaf in
                AnyView(face(l, leaf: leaf))
            }
            .id(g) // a new page size starts a new book (the spine can't change)
            .frame(width: width, height: g.pageH)
            .shadow(color: .black.opacity(0.14), radius: 10, y: 3)
            .overlay(alignment: .leading) {
                Spiral(ringHeight: g.line * 0.8)
                    .frame(width: g.line * 1.8)
                    .padding(.vertical, g.pageH * 0.015)
                    .offset(x: g.spread ? g.pageW - g.line * 0.9 : -g.line * 0.55)
                    .allowsHitTesting(false)
            }
            tabs(l, active: rightPage?.recipe?.category).padding(.top, g.pageH * 0.12)
        }
        .padding(.leading, BookLayout.tabWidth)
        .onChange(of: shownLeaf) { _, leaf in keptPage = pageOn(leaf: leaf, l) }
    }

    private func face(_ l: BookLayout.Pages, leaf: Int) -> some View {
        let number = l.leaves[leaf]
        let side: BookFace.Side = !l.geometry.spread ? .single : leaf % 2 == 0 ? .left : .right
        return BookFace(page: number.map { l.pages[$0] }, geometry: l.geometry, side: side, firstPage: l.firstPage,
                        jump: { turn(to: l.leaf(ofPage: $0)) }, open: { opened = $0 })
    }

    private func turn(to leaf: Int) {
        guard let l = layout, leaf >= 0, leaf < l.leaves.count else { return }
        request = leaf
    }

    // The colored category tabs on the outer edge; each jumps to its first recipe.
    private func tabs(_ l: BookLayout.Pages, active: String?) -> some View {
        VStack(spacing: 8) {
            ForEach(Book.categories) { c in
                let first = BookLayout.bookOrder(recipes).first { $0.category == c.slug }.flatMap { l.firstPage[$0.id] }
                Button { if let first { turn(to: l.leaf(ofPage: first)) } } label: {
                    Text(c.name)
                        .labelCaps(9, color: .white)
                        .fixedSize()
                        .frame(width: 110, height: 30)
                        .background(c.color)
                        .rotationEffect(.degrees(90))
                        .frame(width: 30, height: 110)
                        .clipShape(UnevenRoundedRectangle(bottomTrailingRadius: 6, topTrailingRadius: 6))
                        .offset(x: c.slug == active ? 4 : 0)
                }
                .buttonStyle(.plain)
                .disabled(first == nil)
                .opacity(first == nil ? 0.4 : 1)
                .accessibilityLabel("Go to \(c.name)")
            }
        }
        .frame(width: BookLayout.tabWidth, alignment: .leading)
    }

    private func controls(_ l: BookLayout.Pages) -> some View {
        let step = l.geometry.spread ? 2 : 1
        let first = l.geometry.spread ? shownLeaf - shownLeaf % 2 : shownLeaf
        let shown = (first..<min(first + step, l.leaves.count)).compactMap { l.leaves[$0] }.filter { $0 > 0 }
        let label = shown.isEmpty ? "cover" : "page \(shown.map(String.init).joined(separator: "–")) of \(l.pages.count - 1)"
        return HStack(spacing: 24) {
            Button { turn(to: first - step) } label: {
                Image(systemName: "chevron.left").font(.system(size: 17, weight: .semibold)).frame(width: 44, height: 44).card(radius: 22)
            }
            .disabled(first == 0)
            .accessibilityLabel("Previous page")
            Text(label).font(.ui(14)).foregroundStyle(Color.muted).frame(minWidth: 120)
            Button { turn(to: first + step) } label: {
                Image(systemName: "chevron.right").font(.system(size: 17, weight: .semibold)).frame(width: 44, height: 44).card(radius: 22)
            }
            .disabled(first + step >= l.leaves.count)
            .accessibilityLabel("Next page")
        }
        .padding(.vertical, 10)
    }
}

// One page of the book.
struct BookFace: View {
    enum Side { case left, right, single }

    let page: BookLayout.Page?
    let geometry: BookLayout.Geometry
    let side: Side
    let firstPage: [String: Int]
    let jump: (Int) -> Void
    let open: (Recipe) -> Void

    private var g: BookLayout.Geometry { geometry }
    private var em: CGFloat { g.em }
    // The inner margin (by the spiral) is wider than the outer one.
    private var padLeft: CGFloat { side == .left ? g.padOuter : g.padInner }
    private var padRight: CGFloat { side == .left ? g.padInner : g.padOuter }

    var body: some View {
        Group {
            switch page?.kind {
            case nil: Color.clear
            case .cover: cover
            default: paper
            }
        }
        .frame(width: g.pageW, height: g.pageH)
    }

    private var cover: some View {
        ZStack {
            Color.cover
            VStack(spacing: 12) {
                Text("Ramiya’s Recipes").font(.serif(g.line * 1.7)).multilineTextAlignment(.center)
                Text("recipe book").labelCaps(g.line * 0.42, color: .white.opacity(0.8))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .overlay(Rectangle().stroke(.white.opacity(0.8), lineWidth: 1))
            .padding(g.pageW * 0.05)
        }
    }

    private var paper: some View {
        ZStack(alignment: .topLeading) {
            Color.paper
            rules
            VStack(alignment: .leading, spacing: 0) {
                ForEach(page?.blocks ?? []) { b in
                    block(b).frame(width: g.contentW, height: CGFloat(b.lines) * g.line, alignment: .topLeading)
                }
            }
            .padding(.top, g.line * BookLayout.topLines)
            .padding(.leading, padLeft)
        }
        .overlay(alignment: side == .left ? .bottomLeading : .bottomTrailing) {
            if let n = page?.number {
                Text("\(n)").labelCaps(g.line * 0.36).padding(.horizontal, g.line * 0.9).padding(.bottom, g.line * 0.45)
            }
        }
        .overlay(alignment: side == .left ? .bottomTrailing : .bottomLeading) {
            if page?.first == true, let r = page?.recipe {
                Button { open(r) } label: { Text("open recipe →").labelCaps(em * 0.45, color: .accent) }
                    .buttonStyle(.plain)
                    .padding(side == .left ? .trailing : .leading, side == .left ? padRight : padLeft)
                    .padding(.bottom, g.line * 0.45)
            }
        }
        .clipped()
    }

    // The ruled lines, across the writing area only.
    private var rules: some View {
        Canvas { ctx, size in
            var y = g.line * (BookLayout.topLines + 1)
            while y <= size.height - g.line * BookLayout.bottomLines + 0.5 {
                ctx.fill(Path(CGRect(x: padLeft, y: y - 0.5, width: g.contentW, height: 1)), with: .color(.rule))
                y += g.line
            }
        }
    }

    // ---- blocks

    @ViewBuilder private func block(_ b: BookLayout.Block) -> some View {
        switch b.kind {
        case let .header(title, stacked, columns): header(b.recipe!, title: title, stacked: stacked, columns: columns)
        case .continued: continued(b.recipe!)
        case let .ingredients(left, right):
            VStack(alignment: .leading, spacing: 0) {
                ingredientsLabel
                HStack(alignment: .top, spacing: em * 1.5) {
                    ingredientColumn(left)
                    ingredientColumn(right)
                }
            }
            .background(Color.paper)
        case .ingLabel: ingredientsLabel
        case let .ingRow(l): ingredientRow(l)
        case .dirLabel:
            sectionLabel("Directions")
                .overlay(alignment: .bottomLeading) {
                    Image("WhiskAndSpoon").resizable().scaledToFit().frame(width: em * 3.8, height: em * 3.2)
                        .offset(x: em * 6.5, y: -em * 0.2)
                }
                .overlay(alignment: .bottomTrailing) {
                    Image("PlateSetting").resizable().scaledToFit().frame(width: em * 4.4, height: em * 2.2).offset(y: -em * 0.15)
                }
        case let .dirLine(sub, lines): direction(sub: sub, lines: lines)
        case .notesLabel: sectionLabel("Notes")
        case let .notes(lines): VStack(alignment: .leading, spacing: 0) { ForEach(Array(lines.enumerated()), id: \.offset) { written($0.element) } }
        case .gap: Color.clear
        case .contentsTitle:
            Text("contents").font(.slab(em * 1.3)).foregroundStyle(Color.label)
                .frame(maxHeight: .infinity, alignment: .bottomLeading).padding(.bottom, g.line * 0.2)
        case let .contentsCategory(slug):
            let c = Book.category(slug) ?? Book.categories[0]
            HStack(spacing: em * 0.5) {
                Circle().fill(c.color).frame(width: em * 0.6, height: em * 0.6)
                Text(c.name).labelCaps(em * 0.5)
            }
            .frame(height: g.line, alignment: .bottomLeading)
            .padding(.bottom, g.line * 0.2)
            .frame(height: g.line, alignment: .bottomLeading)
        case .contentsEntry: contentsEntry(b.recipe!)
        }
    }

    // One ruled line of text, sitting on its rule.
    private func onRule<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(height: g.line, alignment: .bottomLeading)
            .padding(.bottom, g.line * 0.06)
            .frame(height: g.line, alignment: .bottom)
    }

    private func written(_ text: String, scale: CGFloat = 1) -> some View {
        onRule { Text(text).font(.hand(em * scale)).foregroundStyle(Color.ink).lineLimit(1).minimumScaleFactor(0.85) }
    }

    private func header(_ r: Recipe, title: [String], stacked: Bool, columns: Int) -> some View {
        let titleView = VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(title.enumerated()), id: \.offset) { i, t in
                onRule {
                    HStack(alignment: .firstTextBaseline, spacing: em * 0.4) {
                        Text("recipe:").font(.slab(em * 1.05)).foregroundStyle(Color.label).opacity(i == 0 ? 1 : 0)
                        Text(t).font(.hand(em * 1.4)).foregroundStyle(Color.ink).lineLimit(1).minimumScaleFactor(0.85)
                    }
                }
            }
        }
        let rows = Array(stride(from: 0, to: Book.tags.count, by: columns)).map { Array(Book.tags[$0..<min($0 + columns, Book.tags.count)]) }
        return VStack(alignment: .leading, spacing: 0) {
            if stacked {
                titleView
                statBox(r).frame(height: g.line * 2, alignment: .center)
            } else {
                HStack(alignment: .top, spacing: em) {
                    titleView.frame(maxWidth: .infinity, alignment: .leading)
                    statBox(r).padding(.top, g.line * 0.25)
                }
                .frame(height: CGFloat(max(title.count, 2)) * g.line, alignment: .top)
            }
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    HStack(spacing: 0) {
                        ForEach(row, id: \.id) { t in
                            let on = r.tags.contains(t.id)
                            HStack(spacing: em * 0.3) {
                                TagCircle(on: on).scaleEffect(em * 0.7 / 13)
                                    .frame(width: em * 0.7, height: em * 0.7)
                                Text(t.label).labelCaps(em * 0.42, color: on ? .ink : .label).lineLimit(1).minimumScaleFactor(0.7)
                            }
                            .frame(width: BookLayout.tagColumnEm * em, alignment: .leading)
                        }
                    }
                    .frame(height: g.line * 0.5)
                }
            }
            .padding(.top, g.line * 0.15)
            Spacer(minLength: 0)
            Rectangle().fill(Color.rule).frame(height: 1)
        }
        .background(Color.paper)
    }

    private func statBox(_ r: Recipe) -> some View {
        HStack(spacing: 0) {
            statCell("Servings", r.servings.map { "\($0)" } ?? "", first: true)
            statCell("Prep time", r.prepMin.map { "\($0) min" } ?? "")
            statCell("Cook time", r.cookMin.map { "\($0) min" } ?? "")
        }
        .frame(width: BookLayout.statBoxEm * em)
        .overlay(Rectangle().stroke(Color.mauve, lineWidth: 1))
    }

    private func statCell(_ label: String, _ value: String, first: Bool = false) -> some View {
        VStack(spacing: 0) {
            Text(label).labelCaps(em * 0.42, color: .white).lineLimit(1).minimumScaleFactor(0.6)
                .frame(maxWidth: .infinity).padding(.vertical, em * 0.15).background(Color.mauve)
            Text(value).font(.hand(em * 1.05)).foregroundStyle(Color.ink).frame(height: em * 1.6)
        }
        .overlay(alignment: .leading) {
            if !first { Rectangle().fill(Color.mauve).frame(width: 1) }
        }
    }

    private func continued(_ r: Recipe) -> some View {
        onRule {
            HStack(alignment: .firstTextBaseline, spacing: em * 0.4) {
                Text("recipe:").font(.slab(em * 0.9)).foregroundStyle(Color.label)
                Text(r.title).font(.hand(em)).foregroundStyle(Color.ink).lineLimit(1)
                Text("(continued)").font(.hand(em * 0.85)).foregroundStyle(Color.label).fixedSize()
            }
        }
        .background(Color.paper)
    }

    private var ingredientsLabel: some View {
        HStack(alignment: .bottom, spacing: em) {
            Text("Ingredients").labelCaps(em * 0.5)
            Image("RollingPin").resizable().scaledToFit().frame(width: em * 5, height: em * 0.9).padding(.bottom, em * 0.1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, g.line * 0.2)
        .frame(height: g.line, alignment: .bottomLeading)
    }

    private func ingredientColumn(_ lines: [Format.Line]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(lines.enumerated()), id: \.offset) { _, l in
                ingredientRow(l).overlay(alignment: .bottom) { Rectangle().fill(Color.rule).frame(height: 1) }
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func ingredientRow(_ l: Format.Line) -> some View {
        onRule {
            Text(l.text.isEmpty ? " " : l.text)
                .font(.hand(em * (l.kind == .name ? 0.9 : 1)))
                .foregroundStyle(Color.ink.opacity(l.kind == .name ? 0.8 : 1))
                .lineLimit(1).truncationMode(.tail)
                .frame(maxWidth: .infinity, alignment: l.kind == .name ? .trailing : .leading)
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text).labelCaps(em * 0.5)
            .padding(.bottom, g.line * 0.2)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
    }

    private func direction(sub: Bool, lines: [String]) -> some View {
        let indent = (sub ? BookLayout.subIndentEm : BookLayout.stepIndentEm) * em
        return VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(lines.enumerated()), id: \.offset) { i, t in
                onRule {
                    HStack(alignment: .firstTextBaseline, spacing: 0) {
                        Text(i > 0 ? "" : sub ? "–" : "▷")
                            .font(sub ? .hand(em) : .system(size: em * 0.75))
                            .foregroundStyle(Color.ink)
                            .frame(width: sub ? em * 0.8 : indent, alignment: .leading)
                        Text(t).font(.hand(em)).foregroundStyle(Color.ink).lineLimit(1).minimumScaleFactor(0.85)
                    }
                    .padding(.leading, sub ? indent - em * 0.8 : 0)
                }
            }
        }
    }

    private func contentsEntry(_ r: Recipe) -> some View {
        Button {
            if let p = firstPage[r.id] { jump(p) }
        } label: {
            onRule {
                HStack(alignment: .lastTextBaseline, spacing: em * 0.5) {
                    Text(r.title).font(.hand(em)).foregroundStyle(Color.ink).lineLimit(1)
                    Line().stroke(Color.label.opacity(0.6), style: StrokeStyle(lineWidth: 1, dash: [1, 3]))
                        .frame(height: 1).frame(minWidth: em)
                    Text(firstPage[r.id].map(String.init) ?? "").font(.hand(em * 0.95)).foregroundStyle(Color.ink)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(r.title), page \(firstPage[r.id] ?? 0)")
    }

    private struct Line: Shape {
        func path(in rect: CGRect) -> Path {
            var p = Path()
            p.move(to: CGPoint(x: rect.minX, y: rect.midY))
            p.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
            return p
        }
    }
}

// UIKit's page curl, for turning the book's pages. `count` leaves; in an open book they come in
// pairs (left, right) around a spine down the middle. `shown` is the right-hand leaf on show;
// setting `request` turns to that leaf.
struct PageCurl: UIViewControllerRepresentable {
    let count: Int
    let spread: Bool
    let start: Int
    @Binding var shown: Int
    @Binding var request: Int?
    let leaf: (Int) -> AnyView

    func makeUIViewController(context: Context) -> UIPageViewController {
        let spine: UIPageViewController.SpineLocation = spread ? .mid : .min
        let pvc = UIPageViewController(transitionStyle: .pageCurl, navigationOrientation: .horizontal,
                                       options: [.spineLocation: NSNumber(value: spine.rawValue)])
        pvc.isDoubleSided = spread
        pvc.dataSource = context.coordinator
        pvc.delegate = context.coordinator
        pvc.view.backgroundColor = .clear
        pvc.setViewControllers(context.coordinator.controllers(around: start), direction: .forward, animated: false)
        // Taps are for the page's own buttons (contents, "open recipe"); swipes turn pages.
        for g in pvc.gestureRecognizers where g is UITapGestureRecognizer { g.isEnabled = false }
        return pvc
    }

    func updateUIViewController(_ pvc: UIPageViewController, context: Context) {
        let c = context.coordinator
        c.parent = self
        // Redraw what's on show (a recipe may have changed).
        for case let page as Leaf in pvc.viewControllers ?? [] { page.rootView = leaf(page.index) }
        guard let target = request else { return }
        DispatchQueue.main.async { request = nil }
        let current = c.shownLeaf(pvc)
        let pair = spread ? target - target % 2 : target
        let currentPair = spread ? current - current % 2 : current
        guard pair != currentPair, pair >= 0, pair < count else { return }
        pvc.setViewControllers(c.controllers(around: target), direction: pair > currentPair ? .forward : .reverse,
                               animated: !UIAccessibility.isReduceMotionEnabled)
        let now = spread ? min(pair + 1, count - 1) : pair
        DispatchQueue.main.async { shown = now }
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Leaf: UIHostingController<AnyView> {
        let index: Int
        init(_ index: Int, _ view: AnyView) {
            self.index = index
            super.init(rootView: view)
            self.view.backgroundColor = .clear
            safeAreaRegions = []
        }

        @available(*, unavailable)
        required init?(coder: NSCoder) { fatalError("not used") }
    }

    final class Coordinator: NSObject, UIPageViewControllerDataSource, UIPageViewControllerDelegate {
        var parent: PageCurl
        init(_ parent: PageCurl) { self.parent = parent }

        func make(_ i: Int) -> Leaf { Leaf(i, parent.leaf(i)) }

        func controllers(around leaf: Int) -> [UIViewController] {
            let i = max(0, min(leaf, parent.count - 1))
            if parent.spread {
                let left = i - i % 2
                return [make(left), make(min(left + 1, parent.count - 1))]
            }
            return [make(i)]
        }

        func shownLeaf(_ pvc: UIPageViewController) -> Int {
            (pvc.viewControllers?.last as? Leaf)?.index ?? 0
        }

        func pageViewController(_ pvc: UIPageViewController, viewControllerBefore vc: UIViewController) -> UIViewController? {
            guard let i = (vc as? Leaf)?.index, i > 0 else { return nil }
            return make(i - 1)
        }

        func pageViewController(_ pvc: UIPageViewController, viewControllerAfter vc: UIViewController) -> UIViewController? {
            guard let i = (vc as? Leaf)?.index, i + 1 < parent.count else { return nil }
            return make(i + 1)
        }

        func pageViewController(_ pvc: UIPageViewController, didFinishAnimating finished: Bool,
                                previousViewControllers: [UIViewController], transitionCompleted completed: Bool) {
            if completed { parent.shown = shownLeaf(pvc) }
        }
    }
}
