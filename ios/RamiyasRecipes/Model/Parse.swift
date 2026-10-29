import Foundation

// The website's parsing rules (src/lib/parse.ts and src/lib/pasteText.ts), so the writing page
// sorts lines the same way in both. No AI: just patterns. shared/fixtures/*.json holds the cases
// both must pass.

// A regular expression with JavaScript-like matching (ICU), for porting the website's patterns.
struct Pattern {
    private let re: NSRegularExpression

    init(_ pattern: String, ignoreCase: Bool = false) {
        // The patterns are fixed in this file, so a bad one is a programming error.
        re = try! NSRegularExpression(pattern: pattern, options: ignoreCase ? [.caseInsensitive] : [])
    }

    // The match and its groups (nil for a group that didn't take part), or nil if no match.
    func match(_ s: String) -> [String?]? {
        let ns = s as NSString
        guard let m = re.firstMatch(in: s, range: NSRange(location: 0, length: ns.length)) else { return nil }
        return (0..<m.numberOfRanges).map { i in
            let r = m.range(at: i)
            return r.location == NSNotFound ? nil : ns.substring(with: r)
        }
    }

    func matches(_ s: String) -> Bool { match(s) != nil }

    func all(_ s: String) -> [[String?]] {
        let ns = s as NSString
        return re.matches(in: s, range: NSRange(location: 0, length: ns.length)).map { m in
            (0..<m.numberOfRanges).map { i in
                let r = m.range(at: i)
                return r.location == NSNotFound ? nil : ns.substring(with: r)
            }
        }
    }

    // Replaces the first match only, as a JavaScript replace without /g does.
    func replace(_ s: String, with template: String = "") -> String {
        let ns = s as NSString
        guard let m = re.firstMatch(in: s, range: NSRange(location: 0, length: ns.length)) else { return s }
        return ns.replacingCharacters(in: m.range, with: re.replacementString(for: m, in: s, offset: 0, template: template))
    }
}

// One line of directions on the writing page: a ▷ step or a "–" sub-step.
struct DirectionLine: Codable, Hashable {
    enum Kind: String, Codable { case step, sub }
    var kind: Kind
    var text: String
}

struct PastedRecipe: Equatable {
    var title = ""
    var servings: Int?
    var prepMin: Int?
    var cookMin: Int?
    var ingredientGroups: [IngredientGroup] = []
    var stepGroups: [StepGroup] = []
    var notes = ""
}

enum Parse {
    // ---- ingredient lines (parse.ts)

    // Case matters: "T"/"TB"/"Tbsp" are tablespoons and "t"/"tsp" teaspoons, as cooks write them.
    private static let units: Set<String> = [
        "c", "C", "cup", "cups",
        "T", "TB", "Tb", "Tbsp", "tbsp", "tbs", "Tbs", "tablespoon", "tablespoons",
        "t", "tsp", "teaspoon", "teaspoons",
        "lb", "lbs", "pound", "pounds", "oz", "ounce", "ounces",
        "g", "kg", "ml", "mL", "l", "L",
        "qt", "pt", "gal",
        "clove", "cloves", "pinch", "dash", "can", "cans", "stick", "sticks", "pkg", "slice", "slices",
    ]

    // 2 | 1/3 | 1 1/2 | ½ | 1½ | 1 ½ | 1-2 | 1.5
    private static let qty = #"(?:\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?(?:\s+\d+\/\d+|\s?[½⅓⅔¼¾⅛])?|\d+\/\d+|[½⅓⅔¼¾⅛])"#
    private static let line = Pattern(#"^("# + qty + #")\s*([A-Za-z]+)?\.?(?:\s+|$)(.*)$"#)
    private static let spaces = try! NSRegularExpression(pattern: #"\s+"#)

    static func collapse(_ s: String) -> String {
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
        return spaces.stringByReplacingMatches(in: t, range: NSRange(location: 0, length: (t as NSString).length), withTemplate: " ")
    }

    // "1/3 c sweet chili sauce" -> 1/3, c, sweet chili sauce. A word right after the amount only
    // counts as a unit if it's a known one, so "2 garlic cloves" keeps "garlic cloves" as the item.
    // Lines without an amount ("pinch of salt") are all item.
    static func ingredient(_ text: String) -> Ingredient {
        let l = collapse(text)
        guard let m = line.match(l) else { return Ingredient(quantity: "", unit: "", item: l) }
        let quantity = (m[1] ?? "").trimmingCharacters(in: .whitespaces)
        let word = m[2] ?? ""
        let rest = m[3] ?? ""
        if !word.isEmpty && units.contains(word) {
            return Ingredient(quantity: quantity, unit: word, item: rest.trimmingCharacters(in: .whitespaces))
        }
        let item = [word, rest].filter { !$0.isEmpty }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
        return Ingredient(quantity: quantity, unit: "", item: item)
    }

    // The line as the cook wrote it, for editing (no fraction characters swapped in).
    static func text(_ i: Ingredient) -> String {
        [i.quantity, i.unit, i.item].filter { !$0.isEmpty }.joined(separator: " ")
    }

    // ---- direction lines (parse.ts)

    private static let subStart = Pattern(#"^\s*[-–—]\s*(.*)$"#)

    // Writing "-" or "–" at the start of a line makes it a sub-step.
    static func directionLine(_ text: String, kind: DirectionLine.Kind) -> DirectionLine {
        if let m = subStart.match(text) { return DirectionLine(kind: .sub, text: m[1] ?? "") }
        return DirectionLine(kind: kind, text: String(text.drop { $0.isWhitespace }))
    }

    static func stepGroups(_ lines: [DirectionLine]) -> [StepGroup] {
        var groups: [StepGroup] = []
        for l in lines {
            let t = l.text.trimmingCharacters(in: .whitespacesAndNewlines)
            if t.isEmpty { continue }
            // A sub-step before any step becomes a step of its own.
            if l.kind == .step || groups.isEmpty {
                groups.append(StepGroup(title: t, steps: []))
            } else {
                groups[groups.count - 1].steps.append(t)
            }
        }
        return groups
    }

    static func directionLines(_ groups: [StepGroup]) -> [DirectionLine] {
        groups.flatMap { g in [DirectionLine(kind: .step, text: g.title)] + g.steps.map { DirectionLine(kind: .sub, text: $0) } }
    }

    // ---- a whole recipe's text (pasteText.ts): Live Text, the page's handwriting, or pasted

    private enum Section { case head, ingredients, directions, notes }

    private static let headings: [(Section, Pattern)] = [
        (.ingredients, Pattern(#"^(ingredients?|you(?:'|’)ll need|what you(?:'|’)ll need|what you need)\s*:?$"#, ignoreCase: true)),
        (.directions, Pattern(#"^(directions?|instructions?|method|steps?|preparation|how to make (?:it|this))\s*:?$"#, ignoreCase: true)),
        (.notes, Pattern(#"^(notes?|tips?|cook(?:'|’)?s notes?)\s*:?$"#, ignoreCase: true)),
    ]

    private static let bullet = Pattern(#"^(?:[•·*▢□☐◻○◦]|o(?=\s))\s*"#)
    private static let stepMark = Pattern(#"^(?:[▷►▶>]|\d{1,2}\s*[.)]|step\s*\d+\s*[:.)]?)\s*"#, ignoreCase: true)
    private static let subMark = Pattern(#"^[-–—•*]\s*"#)
    // Words that make a short line an ingredient ("salt", "fresh basil"), not a section name.
    private static let ingredientish = Pattern(#"\b(of|salt|pepper|taste|garnish|optional|oil|water|butter|sugar|fresh|chopped)\b"#, ignoreCase: true)

    private static func heading(_ line: String) -> Section? {
        headings.first { $0.1.matches(line) }?.0
    }

    private static func hasQuantity(_ line: String) -> Bool {
        !ingredient(bullet.replace(line)).quantity.isEmpty
    }

    // "1 hr 20 min", "45 min", "1 hour", "30" -> minutes.
    static func duration(_ text: String) -> Int? {
        let h = Pattern(#"(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\b"#, ignoreCase: true).match(text)
        let m = Pattern(#"(\d+)\s*(?:m|min|mins|minutes?)\b"#, ignoreCase: true).match(text)
        if h != nil || m != nil {
            let hours = Double(h?[1] ?? "0") ?? 0
            let minutes = Double(m?[1] ?? "0") ?? 0
            return Int((hours * 60 + minutes).rounded())
        }
        if let n = Pattern(#"^\s*(\d+)\s*$"#).match(text) { return Int(n[1] ?? "") }
        return nil
    }

    // "1 hr 5 mins", "45 min", "20": longer unit names first so "hr" isn't read as "h".
    private static let durationPattern = #"[\d.]+\s*(?:hours?|hrs|hr|h|minutes?|mins|min|m)?\b(?:\s*\d+\s*(?:minutes?|mins|min|m)\b)?"#
    private static let serves1 = Pattern(#"\b(?:serves|servings?|yield|makes)\s*:?\s*(\d+)"#, ignoreCase: true)
    private static let serves2 = Pattern(#"^(\d+)\s+servings?\b"#, ignoreCase: true)
    private static let prep = Pattern(#"\bprep(?:aration)?(?:\s*time)?\s*:?\s*("# + durationPattern + ")", ignoreCase: true)
    private static let cook = Pattern(#"\b(?:cook|bake|baking|cooking)(?:\s*time)?\s*:?\s*("# + durationPattern + ")", ignoreCase: true)

    // Reads the stats on one line ("Serves 4", "Prep time: 15 min"); returns whether it found any.
    private static func readStats(_ line: String, _ out: inout PastedRecipe) -> Bool {
        var found = false
        if let s = serves1.match(line) ?? serves2.match(line) {
            if out.servings == nil { out.servings = Int(s[1] ?? "") }
            found = true
        }
        if let p = prep.match(line) {
            if out.prepMin == nil { out.prepMin = duration(p[1] ?? "") }
            found = true
        }
        if let c = cook.match(line) {
            if out.cookMin == nil { out.cookMin = duration(c[1] ?? "") }
            found = true
        }
        return found
    }

    // The book page's tag checkboxes ("o QUICK & EASY o SLOW COOKER"): skipped.
    private static func isTagLine(_ line: String) -> Bool {
        let upper = line.uppercased()
        return Book.tags.contains { upper.contains($0.label.uppercased()) }
    }

    private static let colonEnd = Pattern(#":$"#)
    private static let forThe = Pattern(#"^for (?:the )?"#, ignoreCase: true)
    private static let forTheStart = Pattern(#"^for (?:the )?\S"#, ignoreCase: true)

    private static func groupName(_ line: String, prev: String?, next: String?) -> String? {
        let text = bullet.replace(line)
        if colonEnd.matches(text) && !hasQuantity(text) {
            return forThe.replace(colonEnd.replace(text)).trimmingCharacters(in: .whitespaces)
        }
        if forTheStart.matches(text) && !hasQuantity(text) {
            return forThe.replace(text).trimmingCharacters(in: .whitespaces)
        }
        guard !hasQuantity(text), let next, hasQuantity(next) else { return nil }
        if text.count > 2 && text == text.uppercased() && text.contains(where: { ("A"..."Z").contains($0) }) {
            return text.lowercased()
        }
        // A short line on its own, right before an amount, as on the book page ("marinade").
        if prev == nil || prev == "" {
            if text.split(separator: " ").count <= 4 && !ingredientish.matches(text) { return text }
        }
        return nil
    }

    private static func nextNonEmpty(_ lines: [String], after i: Int) -> String? {
        lines[(i + 1)...].first { !$0.isEmpty }
    }

    private static func ingredients(_ lines: [String]) -> [IngredientGroup] {
        var groups = [IngredientGroup(name: "", items: [])]
        for (i, line) in lines.enumerated() where !line.isEmpty {
            if let name = groupName(line, prev: i > 0 ? lines[i - 1] : nil, next: nextNonEmpty(lines, after: i)) {
                groups.append(IngredientGroup(name: name, items: []))
            } else {
                groups[groups.count - 1].items.append(ingredient(bullet.replace(line)))
            }
        }
        return groups.filter { !$0.items.isEmpty }
    }

    // ▷ / 1. / Step 1 start a step and "-" a sub-step. When there are marks, a line without one
    // continues the line above it (text that wrapped); with no marks at all, every line is a step.
    private static func directions(_ lines: [String]) -> [StepGroup] {
        let text = lines.filter { !$0.isEmpty }
        let marked = text.contains { stepMark.matches($0) || subMark.matches($0) }
        var out: [DirectionLine] = []
        for line in text {
            if !marked {
                out.append(DirectionLine(kind: .step, text: line))
            } else if stepMark.matches(line) {
                out.append(DirectionLine(kind: .step, text: stepMark.replace(line)))
            } else if subMark.matches(line) {
                out.append(DirectionLine(kind: .sub, text: subMark.replace(line)))
            } else if !out.isEmpty {
                out[out.count - 1].text += " \(line)"
            } else {
                out.append(DirectionLine(kind: .step, text: line))
            }
        }
        return stepGroups(out)
    }

    private static let onlySymbols = Pattern(#"^[^\p{L}\p{N}]+$"#)
    private static let statLabels = Pattern(#"^servings\s+prep\s*time\s+cook\s*time$"#, ignoreCase: true)
    private static let statValues = Pattern(#"(\d+)\s*(?:min)?"#, ignoreCase: true)
    private static let recipeLabel = Pattern(#"^recipe\s*:\s*"#, ignoreCase: true)
    private static let lowercaseStart = Pattern(#"^\p{Ll}"#)

    static func recipeText(_ text: String) -> PastedRecipe {
        var out = PastedRecipe()
        let lines = text.components(separatedBy: "\n")
            .map { collapse($0.replacingOccurrences(of: "\r", with: "")) }
            .map { onlySymbols.matches($0) ? "" : $0 } // a lone "*" or bullet counts as blank

        var sections: [Section: [String]] = [.head: [], .ingredients: [], .directions: [], .notes: []]
        var section = Section.head
        for line in lines {
            if let h = heading(line) { section = h } else { sections[section]!.append(line) }
        }

        // With no headings, amounts are ingredients until the first line that isn't one.
        if sections[.ingredients]!.isEmpty && sections[.directions]!.isEmpty {
            let head = sections[.head]!
            if let first = head.firstIndex(where: hasQuantity) {
                let rest = Array(head[first...])
                let end = rest.indices.first { i in
                    let l = rest[i]
                    return !l.isEmpty && !hasQuantity(l)
                        && groupName(l, prev: i > 0 ? rest[i - 1] : nil, next: i + 1 < rest.count ? rest[i + 1] : nil) == nil
                }
                sections[.head] = Array(head[..<first])
                sections[.ingredients] = end.map { Array(rest[..<$0]) } ?? rest
                sections[.directions] = end.map { Array(rest[$0...]) } ?? []
            }
        }

        // Head: the title, stats and the book page's tag boxes.
        let head = sections[.head]!.filter { !$0.isEmpty }
        var i = 0
        while i < head.count {
            let line = head[i]
            defer { i += 1 }
            // The book page's stat box comes through as its labels, then its values: "4 45 min 15 min".
            if statLabels.matches(line) {
                let values = statValues.all(i + 1 < head.count ? head[i + 1] : "").compactMap { Int($0[1] ?? "") }
                if values.count >= 3 { (out.servings, out.prepMin, out.cookMin) = (values[0], values[1], values[2]) }
                i += 1
                continue
            }
            if isTagLine(line) || readStats(line, &out) { continue }
            if out.title.isEmpty {
                let book = recipeLabel.matches(line)
                out.title = recipeLabel.replace(line)
                // A handwritten title that wraps onto a second line
                if book, i + 1 < head.count, lowercaseStart.matches(head[i + 1]), !isTagLine(head[i + 1]) {
                    out.title += " \(head[i + 1])"
                    i += 1
                }
            }
        }

        out.ingredientGroups = ingredients(sections[.ingredients]!)
        out.stepGroups = directions(sections[.directions]!)
        out.notes = sections[.notes]!.filter { !$0.isEmpty }.joined(separator: "\n")
        return out
    }
}
