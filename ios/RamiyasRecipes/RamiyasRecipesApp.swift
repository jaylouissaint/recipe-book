import SwiftUI

// Phase 0 (docs/APP_PLAN.md): a small app that proves SideStore can install it and keep it
// refreshed. It shows when this copy was built and the recipes it can read from the database.
@main
struct RamiyasRecipesApp: App {
    var body: some Scene {
        WindowGroup {
            HelloView()
        }
    }
}
