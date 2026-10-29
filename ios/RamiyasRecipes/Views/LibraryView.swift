import SwiftData
import SwiftUI

// "My Recipes": search, category and tag filters, and the cards (two columns on iPad).
struct LibraryView: View {
    @Environment(Sync.self) private var sync
    @Environment(\.modelContext) private var context
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @State private var query = ""
    @State private var category: String?
    @State private var tags: Set<String> = []
    @State private var showFilters = false

    private var shown: [Recipe] {
        let words = query.lowercased().split(separator: " ").map(String.init)
        return recipes.filter { r in
            let text = Format.searchText(r)
            return words.allSatisfy { text.contains($0) }
                && (category == nil || r.category == category)
                && tags.allSatisfy { r.tags.contains($0) }
        }
    }

    private var filtering: Bool { category != nil || !tags.isEmpty }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("My Recipes").font(.serif(52)).foregroundStyle(Color.fg)
                HStack(spacing: 12) {
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundStyle(Color.muted)
                        TextField("Search your library", text: $query)
                            .font(.ui(17))
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }
                    .padding(.horizontal, 18)
                    .frame(height: 50)
                    .background(Color.field, in: Capsule())
                    Button { withAnimation { showFilters.toggle() } } label: {
                        Image(systemName: "line.3.horizontal.decrease")
                            .font(.system(size: 20))
                            .foregroundStyle(filtering ? Color.accent : Color.fg)
                            .frame(width: 50, height: 50)
                            .overlay(alignment: .topTrailing) {
                                if filtering { Circle().fill(Color.accent).frame(width: 8, height: 8).padding(10) }
                            }
                    }
                    .accessibilityLabel("Filters")
                }
                if showFilters { filters }
                if recipes.isEmpty {
                    EmptyBook()
                } else if shown.isEmpty {
                    Text("Nothing matches. Try fewer words or clear the filters.")
                        .font(.ui(15)).foregroundStyle(Color.muted)
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 340), spacing: 16)], spacing: 16) {
                        ForEach(shown) { r in
                            NavigationLink(value: r) { LibraryCard(recipe: r) }.buttonStyle(.plain)
                        }
                    }
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

    private var filters: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Category").labelCaps()
            FlowLayout {
                ForEach(Book.categories) { c in
                    Chip(label: c.name, on: category == c.slug) { category = category == c.slug ? nil : c.slug }
                }
            }
            Text("Tags").labelCaps().padding(.top, 4)
            FlowLayout {
                ForEach(Book.tags, id: \.id) { t in
                    Chip(label: t.label, on: tags.contains(t.id)) {
                        if tags.contains(t.id) { tags.remove(t.id) } else { tags.insert(t.id) }
                    }
                }
            }
            if filtering {
                Button("Clear filters") { category = nil; tags = [] }
                    .font(.ui(15, .semibold))
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}

// One category of the book, from the Home shelf tabs.
struct CategoryView: View {
    let category: Category
    @Query(sort: \Recipe.title) private var recipes: [Recipe]

    var body: some View {
        let inCategory = recipes.filter { $0.category == category.slug }
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 4).fill(category.color).frame(width: 10, height: 40)
                    Text(category.name).font(.serif(48))
                }
                if inCategory.isEmpty {
                    Text("No recipes in \(category.name) yet.").font(.ui(16)).foregroundStyle(Color.muted)
                }
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 340), spacing: 16)], spacing: 16) {
                    ForEach(inCategory) { r in
                        NavigationLink(value: r) { LibraryCard(recipe: r) }.buttonStyle(.plain)
                    }
                }
            }
            .padding(32)
            .frame(maxWidth: 1040, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(Color.page)
        .navigationBarTitleDisplayMode(.inline)
    }
}
