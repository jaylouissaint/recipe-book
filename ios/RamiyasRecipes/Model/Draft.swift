import Foundation

// The writing page's contents while it's being written or edited (the website's Draft in
// RecipeEditor.tsx). Kept on the iPad after every change, so nothing is lost if the app quits.
struct Draft: Codable, Equatable {
    struct Group: Codable, Equatable {
        var name: String
        var lines: [String]
    }

    var id: String // the recipe's id, made up front for a new recipe so uploads can use it
    var title = ""
    var servings = ""
    var prepMin = ""
    var cookMin = ""
    var category = "mains"
    var tags: [String] = []
    var groups = [Group(name: "", lines: [])]
    var directions: [DirectionLine] = []
    var notes = ""
    var author = ""
    var sourceName = ""
    var sourceUrl = ""
    var summary = ""
    var source = "scribble" // typed | scribble | pencil | scan | upload
    var photoPath = ""
    var handwritingPath = ""
    var originalFilePath = ""

    init(id: String = UUID().uuidString.lowercased()) {
        self.id = id
    }

    init(recipe r: Recipe) {
        id = r.id
        title = r.title
        servings = r.servings.map(String.init) ?? ""
        prepMin = r.prepMin.map(String.init) ?? ""
        cookMin = r.cookMin.map(String.init) ?? ""
        category = r.category
        tags = r.tags
        groups = r.ingredientGroups.isEmpty
            ? [Group(name: "", lines: [])]
            : r.ingredientGroups.map { Group(name: $0.name, lines: $0.items.map(Parse.text)) }
        directions = Parse.directionLines(r.stepGroups)
        notes = r.notes
        author = r.author
        sourceName = r.sourceName
        sourceUrl = r.sourceUrl
        summary = r.summary
        source = r.source
        photoPath = r.photoPath ?? ""
        handwritingPath = r.handwritingPath ?? ""
        originalFilePath = r.originalFilePath ?? ""
    }

    var hasContent: Bool {
        groups.contains { $0.lines.contains { !$0.trimmingCharacters(in: .whitespaces).isEmpty } }
            || directions.contains { !$0.text.trimmingCharacters(in: .whitespaces).isEmpty }
    }

    // Recognized or pasted text fills the page; what it didn't find is left as it was.
    mutating func fill(from p: PastedRecipe) {
        if !p.title.isEmpty { title = p.title }
        if let s = p.servings { servings = String(s) }
        if let m = p.prepMin { prepMin = String(m) }
        if let m = p.cookMin { cookMin = String(m) }
        if !p.ingredientGroups.isEmpty {
            groups = p.ingredientGroups.map { Group(name: $0.name, lines: $0.items.map(Parse.text)) }
        }
        if !p.stepGroups.isEmpty { directions = Parse.directionLines(p.stepGroups) }
        if !p.notes.isEmpty { notes = [notes, p.notes].filter { !$0.isEmpty }.joined(separator: "\n") }
    }

    struct Invalid: LocalizedError {
        let errorDescription: String?
    }

    // A whole number or empty; anything else is refused with a message (FR-WRITE-005).
    static func number(_ label: String, _ value: String) throws -> Int? {
        let v = Pattern(#"\s*min(ute)?s?$"#, ignoreCase: true).replace(value.trimmingCharacters(in: .whitespaces))
        if v.isEmpty { return nil }
        guard v.allSatisfy(\.isASCII), let n = Int(v), n >= 0 else { throw Invalid(errorDescription: "\(label) should be a number") }
        return n
    }

    // What save-recipe stores (the same fields the website sends).
    func payload() throws -> RecipePayload {
        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { throw Invalid(errorDescription: "Give the recipe a title") }
        let servings = try Self.number("Servings", servings)
        func blankIsNil(_ s: String) -> String? {
            let v = s.trimmingCharacters(in: .whitespacesAndNewlines)
            return v.isEmpty ? nil : v
        }
        return RecipePayload(
            id: id,
            title: t,
            servings: servings == 0 ? nil : servings,
            prepMin: try Self.number("Prep time", prepMin),
            cookMin: try Self.number("Cook time", cookMin),
            category: category,
            tags: tags,
            notes: notes.trimmingCharacters(in: .whitespacesAndNewlines),
            source: source,
            originalFilePath: blankIsNil(originalFilePath),
            handwritingPath: blankIsNil(handwritingPath),
            author: author,
            sourceName: sourceName,
            sourceUrl: sourceUrl,
            description: summary.trimmingCharacters(in: .whitespacesAndNewlines),
            photoPath: blankIsNil(photoPath),
            imported: false, // saving from the writing page counts as checking an import
            ingredientGroups: groups
                .map { g in
                    IngredientGroup(
                        name: g.name.trimmingCharacters(in: .whitespaces),
                        items: g.lines.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.map(Parse.ingredient)
                    )
                }
                .filter { !$0.items.isEmpty },
            stepGroups: Parse.stepGroups(directions)
        )
    }
}

// The recipe as save-recipe takes it (see save_recipe in supabase/migrations).
struct RecipePayload: Encodable {
    let id: String
    let title: String
    let servings: Int?
    let prepMin: Int?
    let cookMin: Int?
    let category: String
    let tags: [String]
    let notes: String
    let source: String
    let originalFilePath: String?
    let handwritingPath: String?
    let author: String
    let sourceName: String
    let sourceUrl: String
    let description: String
    let photoPath: String?
    let imported: Bool
    let ingredientGroups: [IngredientGroup]
    let stepGroups: [StepGroup]
}

// Drafts on the iPad, in Application Support/Drafts: the page as JSON, plus the Pencil drawing
// and a chosen photo that isn't uploaded yet. One draft per recipe, and one for a new recipe.
enum DraftStore {
    enum Part: String { case page = "json", drawing = "drawing", photo = "jpg" }

    private static let folder: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appending(path: "Drafts", directoryHint: .isDirectory)
    }()

    // "new", or the id of the recipe being edited.
    static func url(_ key: String, _ part: Part) -> URL {
        folder.appending(path: "\(key).\(part.rawValue)")
    }

    static func load(_ key: String) -> Draft? {
        guard let data = try? Data(contentsOf: url(key, .page)) else { return nil }
        return try? JSONDecoder().decode(Draft.self, from: data)
    }

    static func save(_ draft: Draft, key: String) {
        guard let data = try? JSONEncoder().encode(draft) else { return }
        write(data, key, .page)
    }

    static func data(_ key: String, _ part: Part) -> Data? {
        try? Data(contentsOf: url(key, part))
    }

    // nil removes that part.
    static func write(_ data: Data?, _ key: String, _ part: Part) {
        let file = url(key, part)
        guard let data else {
            try? FileManager.default.removeItem(at: file)
            return
        }
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try? data.write(to: file, options: .atomic)
    }

    static func remove(_ key: String) {
        for part in [Part.page, .drawing, .photo] { write(nil, key, part) }
    }
}
