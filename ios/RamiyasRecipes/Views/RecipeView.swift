import SwiftUI

// The reading view: the Deglaze recipe layout, with the recipe itself in handwriting on cream
// (the website's RecipeView). Ingredients and directions sit side by side when there's room.
struct RecipeView: View {
    let recipe: Recipe
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @AppStorage("editing.unlocked") private var unlocked = false
    @State private var showBookPage = false
    @State private var showOriginal = false
    @State private var showHandwriting = false
    @State private var showBook = false
    @State private var editing = false
    @State private var confirmDelete = false
    @State private var deleteError = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Thumb(recipe: recipe)
                    .frame(height: 300)
                    .frame(maxWidth: .infinity)

                titleText(recipe, size: 46)
                    .padding(.top, 24)

                if recipe.imported {
                    Text("Check this import against the original before cooking.")
                        .font(.ui(14))
                        .padding(.horizontal, 16).padding(.vertical, 8)
                        .background(Color.field, in: RoundedRectangle(cornerRadius: 16))
                        .padding(.top, 12)
                }

                byline.padding(.top, 12)

                if !recipe.summary.isEmpty {
                    Text(recipe.summary).font(.hand(22)).foregroundStyle(Color.ink)
                        .lineSpacing(4).padding(.top, 16).frame(maxWidth: 640, alignment: .leading)
                }

                stats.padding(.top, 20)

                let labels = Book.tags.filter { recipe.tags.contains($0.id) }.map(\.label)
                if !labels.isEmpty {
                    FlowLayout {
                        ForEach(labels, id: \.self) { t in
                            Text(t).font(.ui(13)).padding(.horizontal, 12).padding(.vertical, 5)
                                .background(Color.field, in: Capsule())
                        }
                    }
                    .padding(.top, 16)
                }

                Divider().overlay(Color.divider).padding(.vertical, 28)

                ViewThatFits(in: .horizontal) {
                    HStack(alignment: .top, spacing: 48) {
                        ingredients.frame(width: 320, alignment: .leading)
                        directions.frame(minWidth: 420, maxWidth: .infinity, alignment: .leading)
                    }
                    VStack(alignment: .leading, spacing: 32) {
                        ingredients
                        directions
                    }
                }

                if !recipe.notes.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Notes").font(.ui(24, .medium))
                        Text(recipe.notes).font(.hand(21)).foregroundStyle(Color.ink).lineSpacing(4)
                    }
                    .padding(.top, 32)
                }
            }
            .foregroundStyle(Color.fg)
            .padding(.horizontal, 32)
            .padding(.bottom, 120)
            .frame(maxWidth: 1040, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(Color.page)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                ShareLink(item: Supabase.website.appending(path: "recipe/\(recipe.slug)"), subject: Text(recipe.title))
                Menu {
                    Button { showBook = true } label: { Label("Open in the book", systemImage: "book") }
                    Button { showBookPage = true } label: { Label("View the book page", systemImage: "book.pages") }
                    if recipe.handwritingPage != nil {
                        Button { showHandwriting = true } label: { Label("View handwritten page", systemImage: "pencil.and.scribble") }
                    }
                    if recipe.originalFilePath != nil {
                        Button { showOriginal = true } label: { Label("View the original", systemImage: "photo") }
                    }
                    if unlocked {
                        Divider()
                        Button { editing = true } label: { Label("Edit recipe", systemImage: "square.and.pencil") }
                        Button(role: .destructive) { confirmDelete = true } label: { Label("Delete recipe", systemImage: "trash") }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
                .accessibilityLabel("Recipe menu")
            }
        }
        .safeAreaInset(edge: .bottom) { bottomButtons }
        .fullScreenCover(isPresented: $showBookPage) { BookPageScreen(recipe: recipe) }
        #if DEBUG
        .onAppear { if UserDefaults.standard.bool(forKey: "debugBookPage") { showBookPage = true } }
        #endif
        .sheet(isPresented: $showOriginal) { OriginalView(recipe: recipe) }
        .sheet(isPresented: $showHandwriting) {
            if let page = recipe.handwritingPage { PictureView(title: "Handwritten page", picture: page) }
        }
        .fullScreenCover(isPresented: $editing) { WritingView(recipe: recipe) }
        .fullScreenCover(isPresented: $showBook) { BookCover(startAt: recipe.id) }
        .confirmationDialog("Delete “\(recipe.title)”?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) { Task { await delete() } }
        } message: {
            Text("It disappears everywhere, on the website too.")
        }
        .alert("The recipe wasn’t deleted", isPresented: Binding(get: { !deleteError.isEmpty }, set: { if !$0 { deleteError = "" } })) {
            Button("OK") {}
        } message: {
            Text(deleteError)
        }
    }

    private func delete() async {
        do {
            try await Writer.delete(id: recipe.id)
            dismiss()
            context.delete(recipe)
            try? context.save()
        } catch {
            deleteError = error.localizedDescription
        }
    }

    @ViewBuilder private var byline: some View {
        FlowLayout(spacing: 16) {
            if !recipe.author.isEmpty {
                Text("by \(recipe.author)").font(.ui(15)).foregroundStyle(Color.muted)
            }
            if let url = URL(string: recipe.sourceUrl), !recipe.sourceUrl.isEmpty {
                Link(destination: url) {
                    Text("from \(recipe.sourceName.isEmpty ? Format.siteName(recipe.sourceUrl) : recipe.sourceName)")
                        .font(.ui(15)).underline().foregroundStyle(Color.muted)
                }
            } else {
                SourceLine(recipe: recipe, size: 15)
            }
            if let c = Book.category(recipe.category) {
                NavigationLink(value: c) {
                    Text("in \(c.name)").font(.ui(15)).underline().foregroundStyle(Color.muted)
                }
            }
        }
    }

    @ViewBuilder private var stats: some View {
        let items: [(String, String)] = [
            recipe.servings.map { ("Servings", "\($0)") },
            recipe.prepMin.map { ("Prep", "\($0) min") },
            recipe.cookMin.map { ("Cook", "\($0) min") },
        ].compactMap { $0 }
        if !items.isEmpty {
            HStack(spacing: 12) {
                ForEach(items, id: \.0) { label, value in
                    VStack(spacing: 2) {
                        Text(label).font(.ui(11, .semibold)).tracking(0.6).textCase(.uppercase).foregroundStyle(Color.muted)
                        Text(value).font(.hand(22)).foregroundStyle(Color.ink)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .card(radius: 16)
                }
            }
            .frame(maxWidth: 440)
        }
    }

    private var ingredients: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Ingredients").font(.ui(24, .medium))
            ForEach(Array(recipe.ingredientGroups.enumerated()), id: \.offset) { _, g in
                VStack(alignment: .leading, spacing: 0) {
                    if !g.name.isEmpty {
                        Text(g.name).font(.ui(12, .semibold)).tracking(1.4).textCase(.uppercase)
                            .foregroundStyle(Color.muted).padding(.bottom, 4)
                    }
                    ForEach(Array(g.items.enumerated()), id: \.offset) { i, item in
                        if i > 0 { Divider().overlay(Color.divider) }
                        Text(Format.ingredient(item)).font(.hand(21)).foregroundStyle(Color.ink)
                            .padding(.vertical, 8)
                    }
                }
                .padding(.top, 16)
            }
        }
    }

    private var directions: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Directions").font(.ui(24, .medium))
            ForEach(Array(recipe.stepGroups.enumerated()), id: \.offset) { i, g in
                HStack(alignment: .top, spacing: 16) {
                    Text("\(i + 1)")
                        .font(.ui(14, .semibold)).foregroundStyle(.white)
                        .frame(width: 32, height: 32)
                        .background(Color.accent, in: Circle())
                    VStack(alignment: .leading, spacing: 6) {
                        Text(g.title).font(.hand(21)).foregroundStyle(Color.ink).lineSpacing(4)
                        ForEach(g.steps, id: \.self) { s in
                            HStack(alignment: .firstTextBaseline, spacing: 8) {
                                Text("–")
                                Text(s).lineSpacing(4)
                            }
                            .font(.hand(20))
                            .foregroundStyle(Color.ink)
                        }
                    }
                    .padding(.top, 2)
                }
            }
        }
    }

    // "Add to Groceries" and "Start Cooking" arrive in Phase 5, as on the website (R4).
    private var bottomButtons: some View {
        HStack(spacing: 12) {
            Text("Add to Groceries")
                .frame(maxWidth: .infinity, minHeight: 52)
                .overlay(Capsule().stroke(Color.fg.opacity(0.3)))
            Text("Start Cooking")
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(Color.accent, in: Capsule())
        }
        .font(.ui(16, .semibold))
        .opacity(0.5)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Add to Groceries and Start Cooking, coming soon")
        .frame(maxWidth: 560)
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .background(.bar)
    }
}

// The original card or page the recipe came from (Add from photos).
struct OriginalView: View {
    let recipe: Recipe
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if let path = recipe.originalFilePath, path.lowercased().hasSuffix(".pdf") {
                    VStack(spacing: 16) {
                        Text("The original is a PDF.").font(.ui(17))
                        if let url = Supabase.publicFileURL(bucket: "originals", path: path) {
                            Link("Open it", destination: url).font(.ui(17, .semibold))
                        }
                    }
                } else if let path = recipe.originalFilePath {
                    PictureScroll(picture: Picture(bucket: "originals", path: path))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.page)
            .navigationTitle("The original")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Done") { dismiss() } }
        }
    }
}

// One stored picture on its own, such as the handwritten page.
struct PictureView: View {
    let title: String
    let picture: Picture
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            PictureScroll(picture: picture)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.page)
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { Button("Done") { dismiss() } }
        }
    }
}

private struct PictureScroll: View {
    let picture: Picture
    var body: some View {
        ScrollView([.horizontal, .vertical]) {
            StoredImage(picture: picture) { ProgressView() }
                .scaledToFit()
        }
    }
}

// "Open in the book": the flip-through book at this recipe, full screen.
private struct BookCover: View {
    let startAt: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            BookScreen(startAt: startAt)
                .padding(.horizontal, 24)
                .background(Color.page)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { Button("Done") { dismiss() } }
        }
    }
}
