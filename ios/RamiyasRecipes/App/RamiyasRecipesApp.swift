import SwiftData
import SwiftUI

// The iPad app (docs/APP_PLAN.md). Phase 2: reading the book, offline, matching the website.
@main
struct RamiyasRecipesApp: App {
    @State private var sync = Sync()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(sync)
                .tint(.accent)
                .preferredColorScheme(.light)
        }
        .modelContainer(for: Recipe.self)
    }
}

// The four tabs (a sidebar on iPadOS 18 when there's room), syncing on launch and whenever the
// app comes back to the front.
struct RootView: View {
    @Environment(Sync.self) private var sync
    @Environment(\.modelContext) private var context
    @Environment(\.scenePhase) private var phase
    @State private var tab = 0
    @State private var homePath = NavigationPath()

    var body: some View {
        tabs
            .task {
                await sync.run(context)
                #if DEBUG
                openForScreenshots()
                #endif
            }
            .onChange(of: phase) { _, now in
                if now == .active { Task { await sync.run(context) } }
            }
    }

    #if DEBUG
    // For screenshots from the command line: `-debugTab 1`, `-debugRecipe <slug>`,
    // `-debugBookPage YES` (launch arguments land in UserDefaults).
    private func openForScreenshots() {
        let defaults = UserDefaults.standard
        tab = defaults.integer(forKey: "debugTab")
        if let slug = defaults.string(forKey: "debugRecipe"),
           let recipe = try? context.fetch(FetchDescriptor<Recipe>(predicate: #Predicate { $0.slug == slug })).first {
            tab = 0
            homePath.append(recipe)
        }
    }
    #endif

    @ViewBuilder private var tabs: some View {
        let view = TabView(selection: $tab) {
            NavigationStack(path: $homePath) { HomeView().bookDestinations() }
                .tabItem { Label("Home", systemImage: "house") }.tag(0)
            NavigationStack { LibraryView().bookDestinations() }
                .tabItem { Label("Library", systemImage: "book") }.tag(1)
            NavigationStack { GroceriesView() }
                .tabItem { Label("Groceries", systemImage: "cart") }.tag(2)
            NavigationStack { SettingsView() }
                .tabItem { Label("Settings", systemImage: "gearshape") }.tag(3)
        }
        if #available(iOS 18.0, *) {
            view.tabViewStyle(.sidebarAdaptable)
        } else {
            view
        }
    }
}
