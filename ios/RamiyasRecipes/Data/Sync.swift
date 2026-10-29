import Foundation
import Observation
import SwiftData

// Keeps the iPad's copy of the recipe book up to date (docs/APP_PLAN.md Phase 2): on launch, when
// the app comes back to the front, and on pull to refresh. Only rows changed since the last sync
// are downloaded; deleted recipes are removed. Photos are saved too, so everything opens offline.
@MainActor
@Observable
final class Sync {
    enum State: Equatable { case idle, syncing, failed(String) }

    private(set) var state: State = .idle
    private(set) var lastSynced: Date? = UserDefaults.standard.object(forKey: Keys.lastSynced) as? Date

    private enum Keys {
        static let cursor = "sync.cursor" // the newest updated_at seen
        static let lastSynced = "sync.lastSynced"
    }

    func run(_ context: ModelContext) async {
        guard state != .syncing else { return }
        state = .syncing
        do {
            let rows = try await Supabase.changedRecipes(since: UserDefaults.standard.string(forKey: Keys.cursor))
            for row in rows {
                let id = row.id
                let existing = try context.fetch(FetchDescriptor<Recipe>(predicate: #Predicate { $0.id == id })).first
                if row.deleted_at != nil {
                    if let existing { context.delete(existing) }
                } else if let existing {
                    row.apply(to: existing)
                } else {
                    let recipe = Recipe(id: row.id)
                    row.apply(to: recipe)
                    context.insert(recipe)
                }
            }
            try context.save()
            if let newest = rows.last?.updated_at { UserDefaults.standard.set(newest, forKey: Keys.cursor) }
            let now = Date()
            lastSynced = now
            UserDefaults.standard.set(now, forKey: Keys.lastSynced)
            state = .idle
            let recipes = try context.fetch(FetchDescriptor<Recipe>())
            await ImageStore.shared.prefetch(recipes.compactMap(\.picture))
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    // Downloads the whole book again (Settings).
    func resync(_ context: ModelContext) async {
        UserDefaults.standard.removeObject(forKey: Keys.cursor)
        try? context.delete(model: Recipe.self)
        await run(context)
    }
}
