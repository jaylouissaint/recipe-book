import UIKit

// The flip-through book (docs/DESIGN.md "Book view"; the website's src/lib/bookLayout.ts and
// BookView.tsx): every page is the same size and holds a whole number of ruled lines. Each recipe
// becomes blocks measured in lines, and blocks are packed onto pages; a recipe that doesn't fit
// continues on the next page. Text is wrapped here, line by line, so every line sits on a rule.
enum BookLayout {
    static let aspect: CGFloat = 0.78 // page width / height, close to the spiral book
    static let topLines: CGFloat = 2 // margin above the first line
    static let bottomLines: CGFloat = 1.5
    static let tabWidth: CGFloat = 34 // the category tabs stick out on the right

    struct Geometry: Hashable {
        let pageW: CGFloat
        let pageH: CGFloat
        let line: CGFloat
        let lines: Int // ruled lines per page
        let capacity: Int // lines available for content
        let spread: Bool // an open two-page book
        let narrow: Bool // one ingredient column
        let padInner: CGFloat // by the spiral
        let padOuter: CGFloat
        var contentW: CGFloat { pageW - padInner - padOuter }
        var em: CGFloat { line * 0.58 } // the page's text size, as on the website

        init(width availW: CGFloat, height availH: CGFloat) {
            let single = min(availH, (availW - tabWidth) / aspect)
            let twoUp = min(availH, (availW - tabWidth) / (2 * aspect))
            // An open book on landscape screens with room for two readable pages.
            spread = availW >= 1.15 * availH && twoUp >= 420
            pageH = (spread ? twoUp : single).rounded(.down)
            pageW = (pageH * aspect).rounded(.down)
            // Fewer, bigger lines on small pages so the writing stays readable.
            lines = max(18, min(30, Int((pageH / 24).rounded())))
            line = pageH / CGFloat(lines)
            capacity = Int((CGFloat(lines) - topLines - bottomLines).rounded(.down))
            padInner = line * 2.2
            padOuter = line * 1.1
            narrow = pageW - padInner - padOuter < 300 // two ingredient columns need about 300 points
        }
    }

    // ---- fonts, sized from the line (the website's em sizes)

    static func hand(_ g: Geometry, _ scale: CGFloat = 1) -> UIFont {
        UIFont(name: "PatrickHand-Regular", size: g.em * scale) ?? .systemFont(ofSize: g.em * scale)
    }

    static func slab(_ g: Geometry, _ scale: CGFloat) -> UIFont {
        UIFont(name: "ZillaSlab-Light", size: g.em * scale) ?? .systemFont(ofSize: g.em * scale)
    }

    // Words onto lines no wider than `width` (a word longer than a line gets a line of its own).
    static func wrap(_ text: String, font: UIFont, width: CGFloat) -> [String] {
        let attrs: [NSAttributedString.Key: Any] = [.font: font]
        func fits(_ s: String) -> Bool { (s as NSString).size(withAttributes: attrs).width <= width }
        var lines: [String] = []
        var current = ""
        for word in text.split(whereSeparator: \.isWhitespace).map(String.init) {
            let next = current.isEmpty ? word : "\(current) \(word)"
            if current.isEmpty || fits(next) {
                current = next
            } else {
                lines.append(current)
                current = word
            }
        }
        if !current.isEmpty || lines.isEmpty { lines.append(current) }
        return lines
    }

    // ---- blocks

    enum Kind: Equatable {
        case header(title: [String], stacked: Bool, tagColumns: Int)
        case continued
        case ingredients(left: [Format.Line], right: [Format.Line])
        case ingLabel
        case ingRow(Format.Line)
        case dirLabel
        case dirLine(sub: Bool, lines: [String])
        case notesLabel
        case notes([String])
        case gap
        case contentsTitle
        case contentsCategory(String)
        case contentsEntry
    }

    struct Block: Identifiable {
        let id: String
        let kind: Kind
        let recipe: Recipe?
        let lines: Int
    }

    // Header pieces, in ems: the stat box is 15em wide, the title at least 55% of the page.
    static let statBoxEm: CGFloat = 15
    static let tagColumnEm: CGFloat = 7.2
    static let stepIndentEm: CGFloat = 1.1
    static let subIndentEm: CGFloat = 2.6

    static func headerKind(_ r: Recipe, _ g: Geometry) -> (Kind, Int) {
        let statW = statBoxEm * g.em
        let stacked = g.contentW * 0.45 < statW + g.em
        let prefix = ("recipe: " as NSString).size(withAttributes: [.font: slab(g, 1.05)]).width
        let titleW = (stacked ? g.contentW : g.contentW - statW - g.em) - prefix
        let title = wrap(r.title + (r.isFavorite ? " *" : ""), font: hand(g, 1.4), width: titleW)
        let columns = max(2, Int(g.contentW / (tagColumnEm * g.em)))
        let tagRows = (Book.tags.count + columns - 1) / columns
        let tagLines = Int((CGFloat(tagRows) * 0.5 + 0.35).rounded(.up))
        let top = stacked ? title.count + 2 : max(title.count, 2)
        return (.header(title: title, stacked: stacked, tagColumns: columns), top + tagLines)
    }

    static func recipeBlocks(_ r: Recipe, _ g: Geometry) -> [Block] {
        func b(_ key: String, _ kind: Kind, lines: Int = 1) -> Block { Block(id: "\(r.id):\(key)", kind: kind, recipe: r, lines: lines) }
        let (header, headerLines) = headerKind(r, g)
        var blocks = [b("header", header, lines: headerLines), b("gap1", .gap)]
        let (left, right) = Format.splitColumns(r.ingredientGroups)
        if g.narrow {
            blocks.append(b("ingLabel", .ingLabel))
            for (i, l) in (left + right).filter({ $0.kind != .pad }).enumerated() { blocks.append(b("ing:\(i)", .ingRow(l))) }
        } else {
            blocks.append(b("ingredients", .ingredients(left: left, right: right), lines: 1 + left.count))
        }
        blocks += [b("gap2", .gap), b("dirLabel", .dirLabel)]
        let font = hand(g)
        for (i, s) in r.stepGroups.enumerated() {
            let title = wrap(s.title, font: font, width: g.contentW - stepIndentEm * g.em)
            blocks.append(b("dir:\(i)", .dirLine(sub: false, lines: title), lines: title.count))
            for (j, step) in s.steps.enumerated() {
                let lines = wrap(step, font: font, width: g.contentW - subIndentEm * g.em)
                blocks.append(b("dir:\(i):\(j)", .dirLine(sub: true, lines: lines), lines: lines.count))
            }
        }
        let notes = r.notes.split(whereSeparator: \.isNewline).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        if !notes.isEmpty {
            blocks += [b("gap3", .gap), b("notesLabel", .notesLabel)]
            for (i, n) in notes.enumerated() {
                let lines = wrap(n, font: font, width: g.contentW)
                blocks.append(b("notes:\(i)", .notes(lines), lines: lines.count))
            }
        }
        return blocks
    }

    static func continued(_ r: Recipe) -> Block {
        Block(id: "\(r.id):continued", kind: .continued, recipe: r, lines: 1)
    }

    // Recipes in book order: by category (the side tabs' order), then title.
    static func bookOrder(_ recipes: [Recipe]) -> [Recipe] {
        func rank(_ slug: String) -> Int { Book.categories.firstIndex { $0.slug == slug } ?? Book.categories.count }
        return recipes.sorted {
            let (a, b) = (rank($0.category), rank($1.category))
            return a != b ? a < b : $0.title.localizedStandardCompare($1.title) == .orderedAscending
        }
    }

    static func contentsBlocks(_ recipes: [Recipe]) -> [Block] {
        var blocks = [Block(id: "contents:title", kind: .contentsTitle, recipe: nil, lines: 2)]
        for c in Book.categories {
            let inCategory = recipes.filter { $0.category == c.slug }
            if inCategory.isEmpty { continue }
            blocks.append(Block(id: "contents:\(c.slug)", kind: .contentsCategory(c.slug), recipe: nil, lines: 1))
            blocks += inCategory.map { Block(id: "contents:\($0.id)", kind: .contentsEntry, recipe: $0, lines: 1) }
        }
        return blocks
    }

    private static func keepsWithNext(_ k: Kind) -> Bool {
        switch k {
        case .dirLabel, .notesLabel, .contentsCategory, .ingLabel: true
        default: false
        }
    }

    // Packs blocks onto pages of `capacity` lines. Gaps at the top of a page are dropped, a label
    // moves to the next page together with the block after it, and every page after the first
    // starts with `continued` (if given).
    static func pack(_ blocks: [Block], capacity: Int, continued: Block? = nil) -> [[Block]] {
        var pages: [[Block]] = []
        var page: [Block] = []
        var used = 0
        func atTop() -> Bool { page.count == (continued != nil && !pages.isEmpty ? 1 : 0) }
        for (i, b) in blocks.enumerated() {
            if b.kind == .gap && atTop() { continue }
            let next = i + 1 < blocks.count ? blocks[i + 1] : nil
            let need = b.lines + (keepsWithNext(b.kind) ? next?.lines ?? 0 : 0)
            if used + need > capacity && !atTop() {
                pages.append(page)
                page = continued.map { [$0] } ?? []
                used = continued?.lines ?? 0
                if b.kind == .gap { continue }
            }
            page.append(b)
            used += b.lines
        }
        if !page.isEmpty { pages.append(page) }
        return pages
    }

    // ---- pages

    enum PageKind { case cover, contents, recipe, blank }

    struct Page: Identifiable {
        let number: Int // 0 is the cover
        let kind: PageKind
        let blocks: [Block]
        let recipe: Recipe?
        let first: Bool // a recipe's first page ("open recipe →")
        var id: Int { number }
    }

    struct Pages {
        let geometry: Geometry
        let pages: [Page]
        let firstPage: [String: Int] // recipe id -> its first page

        // The page curl's leaves. In an open book the cover sits alone on the right, so the
        // leaves start with an empty inside cover on the left (nil).
        var leaves: [Int?] { geometry.spread ? [nil] + pages.map(\.number) : pages.map(\.number) }

        func leaf(ofPage p: Int) -> Int { geometry.spread ? p + 1 : p }
    }

    static func pages(_ unordered: [Recipe], _ g: Geometry) -> Pages {
        let recipes = bookOrder(unordered)
        var out = [Page(number: 0, kind: .cover, blocks: [], recipe: nil, first: false)]
        for blocks in pack(contentsBlocks(recipes), capacity: g.capacity) {
            out.append(Page(number: out.count, kind: .contents, blocks: blocks, recipe: nil, first: false))
        }
        var firstPage: [String: Int] = [:]
        for r in recipes {
            firstPage[r.id] = out.count
            for (i, blocks) in pack(recipeBlocks(r, g), capacity: g.capacity, continued: continued(r)).enumerated() {
                out.append(Page(number: out.count, kind: .recipe, blocks: blocks, recipe: r, first: i == 0))
            }
        }
        // An open book ends on a full spread.
        if g.spread && out.count % 2 == 0 { out.append(Page(number: out.count, kind: .blank, blocks: [], recipe: nil, first: false)) }
        return Pages(geometry: g, pages: out, firstPage: firstPage)
    }
}
