import Foundation

// The website's formatting rules (src/lib/format.ts, src/lib/bookLayout.ts), so both show a
// recipe the same way.
enum Format {
    private static let fractions = ["1/2": "½", "1/3": "⅓", "2/3": "⅔", "1/4": "¼", "3/4": "¾"]

    // An ingredient as written, with common fractions shown as ½ ⅓ ⅔ ¼ ¾.
    static func ingredient(_ i: Ingredient) -> String {
        let q = i.quantity.replacing(/\d+\/\d+/) { fractions[String($0.output)] ?? String($0.output) }
        let amount = !q.isEmpty && !i.unit.isEmpty ? "\(q) \(i.unit)" : q
        return [amount, i.item].filter { !$0.isEmpty }.joined(separator: " ")
    }

    // "smittenkitchen.com" from a link, or "" if the link can't be read.
    static func siteName(_ url: String) -> String {
        guard let host = URL(string: url)?.host() else { return "" }
        return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }

    enum SourceKind { case link, hand, photo, typed }

    // The source line on cards and the recipe view.
    static func source(_ r: Recipe) -> (kind: SourceKind, text: String) {
        if !r.sourceName.isEmpty { return (r.sourceUrl.isEmpty ? .typed : .link, r.sourceName) }
        switch r.source {
        case "scribble", "pencil": return (.hand, "Written by hand")
        case "scan", "upload": return (.photo, "From a photo")
        default: return (.typed, "From my recipe book")
        }
    }

    struct Line: Equatable {
        enum Kind { case name, item, blank, pad }
        var kind: Kind
        var text: String
    }

    // Ingredient groups split into two balanced columns, as on the book page: the left column takes
    // the first half of the lines (a blank line between groups), never ending on a group name or a
    // blank. Both columns are padded to the same height plus one spare line.
    static func splitColumns(_ groups: [IngredientGroup]) -> ([Line], [Line]) {
        var all: [Line] = []
        for g in groups {
            if !all.isEmpty { all.append(Line(kind: .blank, text: "")) }
            if !g.name.isEmpty { all.append(Line(kind: .name, text: g.name)) }
            all += g.items.map { Line(kind: .item, text: ingredient($0)) }
        }
        var cut = (all.count + 1) / 2
        while cut > 0 && (all[cut - 1].kind == .name || all[cut - 1].kind == .blank) { cut -= 1 }
        var left = Array(all[..<cut])
        var right = Array(all[cut...])
        while right.first?.kind == .blank { right.removeFirst() }
        let height = max(left.count, right.count) + 1
        while left.count < height { left.append(Line(kind: .pad, text: "")) }
        while right.count < height { right.append(Line(kind: .pad, text: "")) }
        right[right.count - 1].kind = .blank
        return (left, right)
    }

    // Words for Library search: title, author, source and ingredients.
    static func searchText(_ r: Recipe) -> String {
        ([r.title, r.author, r.sourceName, r.summary] + r.ingredientGroups.flatMap { g in g.items.map(\.item) })
            .joined(separator: " ")
            .lowercased()
    }
}
