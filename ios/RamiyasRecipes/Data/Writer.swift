import Foundation

// Changes to the recipe book, through the save-recipe Edge Function with the write key from the
// Keychain (supabase/functions/save-recipe/index.ts). Reading stays in Supabase.swift.
enum Writer {
    enum Failure: LocalizedError {
        case locked, offline, refused(String)
        var errorDescription: String? {
            switch self {
            case .locked: "Editing is locked on this iPad. Unlock it in Settings."
            case .offline: "Couldn’t reach the recipe book. Your draft is kept on this iPad, so try again when you’re online."
            case .refused(let message): message
            }
        }
    }

    // Saves the recipe; returns its web address name (slug).
    @discardableResult
    static func save(_ recipe: RecipePayload) async throws -> String {
        struct Body: Encodable { let action = "save"; let recipe: RecipePayload }
        struct Saved: Decodable { struct R: Decodable { let slug: String }; let recipe: R }
        let data = try await call(Body(recipe: recipe))
        return try JSONDecoder().decode(Saved.self, from: data).recipe.slug
    }

    static func delete(id: String) async throws {
        struct Body: Encodable { let action = "delete"; let id: String }
        _ = try await call(Body(id: id))
    }

    // Uploads one file to a storage bucket ("photos" or "handwriting") through a signed upload
    // link; returns the path to save on the recipe.
    static func upload(_ file: Data, bucket: String, recipeId: String, ext: String, contentType: String) async throws -> String {
        struct Body: Encodable { let action = "upload-url"; let bucket: String; let recipeId: String; let ext: String }
        struct Link: Decodable { let path: String; let token: String }
        let link = try JSONDecoder().decode(Link.self, from: try await call(Body(bucket: bucket, recipeId: recipeId, ext: ext)))

        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "+&=")
        let token = link.token.addingPercentEncoding(withAllowedCharacters: allowed) ?? link.token
        guard let url = URL(string: "https://\(Supabase.host)/storage/v1/object/upload/sign/\(bucket)/\(link.path)?token=\(token)") else {
            throw Supabase.Failure.notConfigured
        }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.setValue(Supabase.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(Supabase.anonKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = file
        let status = try await send(request).1
        guard status == 200 else { throw Failure.refused("The picture didn’t upload (\(status)). Please try again.") }
        return link.path
    }

    private static func call(_ body: some Encodable) async throws -> Data {
        guard let key = Keychain.writeKey else { throw Failure.locked }
        guard !Supabase.host.isEmpty, let url = URL(string: "https://\(Supabase.host)/functions/v1/save-recipe") else {
            throw Supabase.Failure.notConfigured
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(key, forHTTPHeaderField: "x-write-key")
        request.httpBody = try JSONEncoder().encode(body)
        let (data, status) = try await send(request)
        if status == 401 { throw Failure.locked }
        guard status == 200 else {
            let message = (try? JSONDecoder().decode(Message.self, from: data))?.error
            throw Failure.refused(message.map { "The recipe book refused that: \($0)" } ?? Supabase.Failure.server(status).localizedDescription)
        }
        return data
    }

    private struct Message: Decodable { let error: String }

    private static func send(_ request: URLRequest) async throws -> (Data, Int) {
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
        } catch let e as URLError where [.notConnectedToInternet, .networkConnectionLost, .timedOut, .cannotFindHost, .cannotConnectToHost].contains(e.code) {
            throw Failure.offline
        }
    }
}
