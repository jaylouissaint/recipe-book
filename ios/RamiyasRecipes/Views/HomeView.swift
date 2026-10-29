import SwiftData
import SwiftUI

// Home: the book shelf (category tabs, Family Favorites, Recently added).
struct HomeView: View {
    @Environment(Sync.self) private var sync
    @Environment(\.modelContext) private var context
    @Query(sort: \Recipe.title) private var recipes: [Recipe]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 40) {
                Text("Ramiya’s Recipes").font(.serif(52)).foregroundStyle(Color.fg)
                    .padding(.bottom, -16)
                ShelfTabs(recipes: recipes)
                if recipes.isEmpty {
                    EmptyBook()
                } else {
                    RecipeStrip(title: "Family Favorites", recipes: recipes.filter(\.isFavorite))
                    RecipeStrip(title: "Recently added", recipes: Array(recipes.sorted { $0.createdAt > $1.createdAt }.prefix(10)))
                }
            }
            .padding(32)
            .frame(maxWidth: 1040, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(Color.page)
        .refreshable { await sync.run(context) }
        .toolbar(.hidden, for: .navigationBar)
        .overlay(alignment: .bottomTrailing) { AddButton() }
    }
}

// What Home and the Library show before the first sync, or when it fails.
struct EmptyBook: View {
    @Environment(Sync.self) private var sync

    var body: some View {
        VStack(spacing: 12) {
            switch sync.state {
            case .syncing:
                ProgressView()
                Text("Getting your recipes…").font(.ui(16)).foregroundStyle(Color.muted)
            case .failed(let message):
                Text("couldn’t reach the recipe book").font(.hand(26)).foregroundStyle(Color.ink)
                Text(message).font(.ui(15)).foregroundStyle(Color.muted).multilineTextAlignment(.center)
            case .idle:
                Text("no recipes yet").font(.hand(26)).foregroundStyle(Color.ink)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
        .card()
    }
}

// The floating green + and its Add sheet. Only once a write key is saved in Settings.
// Adding recipes in the app arrives in Phase 3 (writing) and Phase 4 (scanning).
struct AddButton: View {
    @AppStorage("editing.unlocked") private var unlocked = false
    @State private var showing = false

    var body: some View {
        if unlocked {
            Button { showing = true } label: {
                Image(systemName: "plus")
                    .font(.system(size: 28, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: 64, height: 64)
                    .background(Color.accent, in: Circle())
                    .shadow(color: .black.opacity(0.25), radius: 10, y: 6)
            }
            .accessibilityLabel("Add a recipe")
            .padding(32)
            .sheet(isPresented: $showing) { AddSheet() }
        }
    }
}

struct AddSheet: View {
    var body: some View {
        List {
            row("Save a recipe from the web", "link")
            row("Add from recipe photos", "camera")
            row("Enter your own recipe", "plus.circle")
        }
        .listStyle(.plain)
        .presentationDetents([.height(260)])
        .presentationDragIndicator(.visible)
        .padding(.top, 24)
    }

    private func row(_ title: String, _ icon: String) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon).frame(width: 28)
            Text(title).font(.ui(17))
            Spacer()
            Text("in a later update").font(.ui(13))
        }
        .foregroundStyle(Color.muted)
        .padding(.vertical, 10)
    }
}
