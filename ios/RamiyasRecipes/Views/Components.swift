import SwiftUI

// Recipe picture: the photo, else the original card's photo, else a cream card with faint ruled
// lines and the title's first letter in handwriting (the website's Thumb).
struct Thumb: View {
    let recipe: Recipe
    var radius: CGFloat = 16

    var body: some View {
        GeometryReader { geo in
            ZStack {
                if let picture = recipe.picture {
                    StoredImage(picture: picture) { placeholder(geo.size) }
                } else {
                    placeholder(geo.size)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
            .clipped()
        }
        .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
        .accessibilityHidden(true)
    }

    private func placeholder(_ size: CGSize) -> some View {
        ZStack {
            Color.field
            RuledLines(spacing: max(12, size.height / 7))
            Text(recipe.title.trimmingCharacters(in: .whitespaces).prefix(1).uppercased())
                .font(.hand(min(size.width * 0.42, 112)))
                .foregroundStyle(Color.ink)
        }
    }
}

// Faint horizontal rules, like the book's lined paper.
struct RuledLines: View {
    var spacing: CGFloat
    var color: Color = .rule
    var body: some View {
        Canvas { ctx, size in
            var y = spacing
            while y < size.height {
                ctx.fill(Path(CGRect(x: 0, y: y - 0.5, width: size.width, height: 1)), with: .color(color))
                y += spacing
            }
        }
    }
}

// "smittenkitchen.com", "From a photo", "Written by hand", "From my recipe book", with an icon.
struct SourceLine: View {
    let recipe: Recipe
    var size: CGFloat = 13

    var body: some View {
        let s = Format.source(recipe)
        let icon = switch s.kind {
        case .link: "link"
        case .hand: "pencil"
        case .photo: "camera"
        case .typed: "book"
        }
        Label(s.text, systemImage: icon)
            .font(.ui(size))
            .foregroundStyle(Color.muted)
            .labelStyle(.titleAndIcon)
            .lineLimit(1)
    }
}

// The title with the book's teal asterisk on family favorites.
func titleText(_ recipe: Recipe, size: CGFloat) -> Text {
    var t = Text(recipe.title).font(.hand(size)).foregroundColor(.ink)
    if recipe.isFavorite {
        t = t + Text(" *").font(.ui(size * 0.9, .bold)).foregroundColor(.teal)
    }
    return t
}

// One row of the Library, like the Deglaze "My Recipes" cards.
struct LibraryCard: View {
    let recipe: Recipe

    var body: some View {
        HStack(spacing: 16) {
            Thumb(recipe: recipe).frame(width: 88, height: 88)
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    SourceLine(recipe: recipe)
                    Spacer(minLength: 8)
                    if recipe.timesCooked > 0 {
                        Label("\(recipe.timesCooked)", systemImage: "frying.pan")
                            .font(.ui(13))
                            .foregroundStyle(Color.muted)
                            .accessibilityLabel("Cooked \(recipe.timesCooked) times")
                    }
                }
                titleText(recipe, size: 21).lineLimit(3)
                if !recipe.author.isEmpty {
                    Text("by \(recipe.author)").font(.ui(13)).foregroundStyle(Color.muted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(8)
        .padding(.trailing, 8)
        .card()
    }
}

// The book's colored category dividers, as the top of the Home shelf.
struct ShelfTabs: View {
    let recipes: [Recipe]

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 12) {
            ForEach(Book.categories) { c in
                let count = recipes.filter { $0.category == c.slug }.count
                NavigationLink(value: c) {
                    VStack(alignment: .leading) {
                        Text(c.name).labelCaps(13, color: .white)
                        Spacer()
                        Text("\(count) \(count == 1 ? "recipe" : "recipes")")
                            .font(.ui(14))
                            .foregroundStyle(.white.opacity(0.9))
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, minHeight: 136, alignment: .leading)
                    .background(c.color, in: UnevenRoundedRectangle(topLeadingRadius: 6, bottomLeadingRadius: 20, bottomTrailingRadius: 20, topTrailingRadius: 20, style: .continuous))
                    .shadow(color: .black.opacity(0.06), radius: 8, y: 4)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// A horizontally scrolling row of small cards ("Family Favorites", "Recently added").
struct RecipeStrip: View {
    let title: String
    let recipes: [Recipe]

    var body: some View {
        if !recipes.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text(title).font(.ui(21, .medium)).foregroundStyle(Color.fg)
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 12) {
                        ForEach(recipes) { r in
                            NavigationLink(value: r) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Thumb(recipe: r).aspectRatio(1, contentMode: .fit)
                                    Text(r.title)
                                        .font(.hand(19))
                                        .foregroundStyle(Color.ink)
                                        .lineLimit(2, reservesSpace: true)
                                        .multilineTextAlignment(.leading)
                                        .padding(.horizontal, 4)
                                }
                                .padding(8)
                                .frame(width: 190)
                                .card()
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 32)
                    .padding(.vertical, 6)
                }
                .padding(.horizontal, -32)
            }
        }
    }
}

// Lays out views in rows, wrapping onto the next row when one is full (tags, filter chips).
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    var lineSpacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(width: proposal.width ?? .infinity, subviews: subviews)
        let height = rows.map(\.height).reduce(0, +) + lineSpacing * CGFloat(max(0, rows.count - 1))
        let width = rows.map(\.width).max() ?? 0
        return CGSize(width: proposal.width ?? width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in arrange(width: bounds.width, subviews: subviews) {
            var x = bounds.minX
            for i in row.items {
                let size = subviews[i].sizeThatFits(.unspecified)
                subviews[i].place(at: CGPoint(x: x, y: y + (row.height - size.height) / 2), proposal: .unspecified)
                x += size.width + spacing
            }
            y += row.height + lineSpacing
        }
    }

    private struct Row { var items: [Int] = []; var width: CGFloat = 0; var height: CGFloat = 0 }

    private func arrange(width: CGFloat, subviews: Subviews) -> [Row] {
        var rows: [Row] = [Row()]
        for (i, view) in subviews.enumerated() {
            let size = view.sizeThatFits(.unspecified)
            let needed = rows[rows.count - 1].items.isEmpty ? size.width : rows[rows.count - 1].width + spacing + size.width
            if needed > width, !rows[rows.count - 1].items.isEmpty {
                rows.append(Row())
            }
            var row = rows[rows.count - 1]
            row.width = row.items.isEmpty ? size.width : row.width + spacing + size.width
            row.height = max(row.height, size.height)
            row.items.append(i)
            rows[rows.count - 1] = row
        }
        return rows
    }
}

// Filter chips in the Library.
struct Chip: View {
    let label: String
    let on: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.ui(14, .medium))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .foregroundStyle(on ? Color.white : Color.fg)
                .background(on ? Color.accent : Color.field, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

// Where a NavigationLink to a recipe or a category goes, in every tab.
extension View {
    func bookDestinations() -> some View {
        navigationDestination(for: Recipe.self) { RecipeView(recipe: $0) }
            .navigationDestination(for: Category.self) { CategoryView(category: $0) }
    }
}
