import Foundation

// The database, read with the public, read-only key, the same way the website reads it
// (src/lib/recipes.ts). The write key is only ever sent to the save-recipe function.
enum Supabase {
    static let host = Bundle.main.infoDictionary?["SupabaseHost"] as? String ?? ""
    static let anonKey = Bundle.main.infoDictionary?["SupabaseAnonKey"] as? String ?? ""
    static let website = URL(string: "https://ramiyas-recipes.vercel.app")!

    enum Failure: LocalizedError {
        case notConfigured, server(Int), wrongKey
        var errorDescription: String? {
            switch self {
            case .notConfigured: "The app was built without the database settings (scripts/ios-secrets.sh)."
            case .server(let code): "The recipe book answered with an error (\(code))."
            case .wrongKey: "That write key isn't right."
            }
        }
    }

    // A recipe row with its groups, ingredients and steps.
    static let select =
        "*,ingredient_groups(name,position,ingredients(quantity,unit,item,position)),step_groups(title,position,steps(text,position))"

    // Recipes changed since `since` (an updated_at value from an earlier sync), oldest first,
    // including deleted ones so their deletes reach the iPad.
    static func changedRecipes(since: String?) async throws -> [RecipeRow] {
        var query = [("select", select), ("order", "updated_at.asc")]
        if let since { query.append(("updated_at", "gt.\(since)")) }
        let data = try await get("/rest/v1/recipes", query: query)
        return try JSONDecoder().decode([RecipeRow].self, from: data)
    }

    static func publicFileURL(bucket: String, path: String) -> URL? {
        URL(string: "https://\(host)/storage/v1/object/public/\(bucket)/\(path)")
    }

    // Asks save-recipe whether a write key is right, without changing anything.
    static func checkWriteKey(_ key: String) async throws {
        guard !host.isEmpty, let url = URL(string: "https://\(host)/functions/v1/save-recipe") else {
            throw Failure.notConfigured
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(key, forHTTPHeaderField: "x-write-key")
        request.httpBody = Data(#"{"action":"check"}"#.utf8)
        let (_, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 { throw Failure.wrongKey }
        if status != 200 { throw Failure.server(status) }
    }

    private static func get(_ path: String, query: [(String, String)]) async throws -> Data {
        guard !host.isEmpty, !anonKey.isEmpty else { throw Failure.notConfigured }
        // Encoded by hand: "+" in a timestamp must stay a plus sign, not become a space.
        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "+&=,")
        let q = query.map { "\($0)=\($1.addingPercentEncoding(withAllowedCharacters: allowed) ?? $1)" }.joined(separator: "&")
        guard let url = URL(string: "https://\(host)\(path)?\(q)") else { throw Failure.notConfigured }
        var request = URLRequest(url: url)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else { throw Failure.server(status) }
        return data
    }
}

// A recipe row as the database sends it (snake_case, children with positions).
struct RecipeRow: Decodable {
    struct GroupRow: Decodable {
        struct Item: Decodable { let quantity: String?; let unit: String?; let item: String; let position: Int }
        let name: String?
        let position: Int
        let ingredients: [Item]
    }

    struct StepGroupRow: Decodable {
        struct Step: Decodable { let text: String; let position: Int }
        let title: String
        let position: Int
        let steps: [Step]
    }

    let id: String
    let slug: String
    let title: String
    let servings: Int?
    let prep_min: Int?
    let cook_min: Int?
    let category: String
    let tags: [String]?
    let notes: String?
    let source: String?
    let original_file_path: String?
    let handwriting_path: String?
    let photo_path: String?
    let created_at: String
    let updated_at: String
    let deleted_at: String?
    let author: String?
    let source_name: String?
    let source_url: String?
    let description: String?
    let times_cooked: Int?
    let imported: Bool?
    let ingredient_groups: [GroupRow]?
    let step_groups: [StepGroupRow]?

    func apply(to r: Recipe) {
        r.slug = slug
        r.title = title
        r.servings = servings
        r.prepMin = prep_min
        r.cookMin = cook_min
        r.category = category
        r.tags = tags ?? []
        r.notes = notes ?? ""
        r.source = source ?? "typed"
        r.originalFilePath = original_file_path
        r.handwritingPath = handwriting_path
        r.photoPath = photo_path
        r.createdAt = created_at
        r.updatedAt = updated_at
        r.author = author ?? ""
        r.sourceName = source_name ?? ""
        r.sourceUrl = source_url ?? ""
        r.summary = description ?? ""
        r.timesCooked = times_cooked ?? 0
        r.imported = imported ?? false
        r.ingredientGroups = (ingredient_groups ?? []).sorted { $0.position < $1.position }.map { g in
            IngredientGroup(
                name: g.name ?? "",
                items: g.ingredients.sorted { $0.position < $1.position }.map {
                    Ingredient(quantity: $0.quantity ?? "", unit: $0.unit ?? "", item: $0.item)
                }
            )
        }
        r.stepGroups = (step_groups ?? []).sorted { $0.position < $1.position }.map { g in
            StepGroup(title: g.title, steps: g.steps.sorted { $0.position < $1.position }.map(\.text))
        }
    }
}
