import Foundation

// Reads recipe titles with the public, read-only key, the same way the website does.
enum RecipeTitles {
    struct Row: Decodable { let title: String }

    enum Failure: LocalizedError {
        case notConfigured, server(Int)
        var errorDescription: String? {
            switch self {
            case .notConfigured: "the app was built without the Supabase settings (scripts/ios-secrets.sh)."
            case .server(let code): "the server answered \(code)."
            }
        }
    }

    static func fetch() async throws -> [String] {
        let info = Bundle.main.infoDictionary
        guard let host = info?["SupabaseHost"] as? String, !host.isEmpty,
              let key = info?["SupabaseAnonKey"] as? String, !key.isEmpty,
              let url = URL(string: "https://\(host)/rest/v1/recipes?select=title&deleted_at=is.null&order=title")
        else { throw Failure.notConfigured }
        var request = URLRequest(url: url)
        request.setValue(key, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode != 200 { throw Failure.server(http.statusCode) }
        return try JSONDecoder().decode([Row].self, from: data).map(\.title)
    }
}
