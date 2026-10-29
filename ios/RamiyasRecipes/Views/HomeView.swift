import SwiftData
import SwiftUI

// Home: the book shelf (category tabs, Family Favorites, Recently added), or the whole book to
// flip through (Shelf | Book, remembered).
struct HomeView: View {
    @Environment(Sync.self) private var sync
    @Environment(\.modelContext) private var context
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @AppStorage("home.mode") private var mode = "shelf"

    var body: some View {
        Group {
            if mode == "book" && !recipes.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    titleRow
                    BookScreen()
                }
                .padding(.horizontal, 32)
                .padding(.top, 32)
            } else {
                shelf
            }
        }
        .background(Color.page)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var titleRow: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("Ramiya’s Recipes").font(.serif(52)).foregroundStyle(Color.fg)
            Spacer()
            Picker("Show", selection: $mode) {
                Text("Shelf").tag("shelf")
                Text("Book").tag("book")
            }
            .pickerStyle(.segmented)
            .frame(width: 180)
        }
    }

    private var shelf: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 40) {
                titleRow.padding(.bottom, -16)
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
        .refreshable { await sync.run(context) }
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
// Scanning and importing arrive in Phase 4.
struct AddButton: View {
    @AppStorage("editing.unlocked") private var unlocked = false
    @State private var showing = false
    @State private var writeNext = false
    @State private var writing = false

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
            .sheet(isPresented: $showing, onDismiss: {
                if writeNext { writeNext = false; writing = true }
            }) {
                AddSheet { writeNext = true; showing = false }
            }
            .fullScreenCover(isPresented: $writing) { WritingView(recipe: nil) }
        }
    }
}

struct AddSheet: View {
    let write: () -> Void

    var body: some View {
        List {
            row("Save a recipe from the web", "link")
            row("Add from recipe photos", "camera")
            Button(action: write) {
                HStack(spacing: 16) {
                    Image(systemName: "plus.circle").frame(width: 28)
                    Text("Enter your own recipe").font(.ui(17))
                    Spacer()
                    Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.muted)
                }
                .foregroundStyle(Color.fg)
                .padding(.vertical, 10)
            }
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
