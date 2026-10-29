import PencilKit
import PhotosUI
import SwiftData
import SwiftUI

// The writing page (docs/DESIGN.md, docs/APP_PLAN.md Phase 3): "Enter your own recipe" and Edit.
// Two ways to write on the book page:
// - on the lines: every ruled line is its own text field, so Scribble turns Pencil writing into
//   text one line at a time (or type);
// - on the page: write anywhere with the Apple Pencil, then "Read my writing" fills the lines
//   to check, and the drawing is kept as the handwritten page.
// The draft is kept on the iPad after every change and comes back if the app quits.

private let line: CGFloat = 36 // one ruled line, as on the book page
private let handSize: CGFloat = 22
private let lift: CGFloat = 6

struct WritingView: View {
    enum Mode: String, CaseIterable { case lines = "Write on the lines", page = "Write on the page" }

    enum Field: Hashable {
        case title, servings, prep, cook, notes
        case groupName(Int)
        case ingredient(Int, Int)
        case direction(Int)
    }

    let recipe: Recipe? // nil for a new recipe

    @Environment(\.dismiss) private var dismiss
    @Environment(Sync.self) private var sync
    @Environment(\.modelContext) private var context
    @AppStorage("editing.unlocked") private var unlocked = false

    private let key: String
    private let original: Draft
    @State private var draft: Draft
    @State private var restored: Bool
    @State private var mode = Mode.lines
    @State private var drawing: PKDrawing
    @State private var uploadedDrawing: PKDrawing?
    @State private var pagePicture: UIImage? // the saved handwritten page, when editing one
    @State private var photo: UIImage? // chosen, not uploaded yet
    @State private var photoItem: PhotosPickerItem?
    @State private var pasted = ""
    @State private var saving = false
    @State private var reading = false
    @State private var error = ""
    @State private var notice = ""
    @State private var pendingFill: PastedRecipe?
    @FocusState private var focus: Field?

    init(recipe: Recipe?) {
        self.recipe = recipe
        let key = recipe?.id ?? "new"
        self.key = key
        let base = recipe.map(Draft.init(recipe:)) ?? Draft()
        original = base
        let saved = DraftStore.load(key)
        let restoredDraft = saved.flatMap { $0 != base ? $0 : nil }
        _draft = State(initialValue: restoredDraft ?? saved ?? base)
        let ink = DraftStore.data(key, .drawing).flatMap { try? PKDrawing(data: $0) } ?? PKDrawing()
        _drawing = State(initialValue: ink)
        _photo = State(initialValue: DraftStore.data(key, .photo).flatMap(UIImage.init(data:)))
        _restored = State(initialValue: restoredDraft != nil || !ink.strokes.isEmpty)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    banners
                    switch mode {
                    case .lines: linesPage
                    case .page: pencilPage
                    }
                }
                .padding(.vertical, 24)
                .padding(.leading, 40)
                .padding(.trailing, 48)
                .frame(maxWidth: 900)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color(hex: 0xE9E4DA))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbar }
        }
        .onChange(of: draft) { _, now in
            if now == original { DraftStore.write(nil, key, .page) } else { DraftStore.save(now, key: key) }
        }
        .onChange(of: drawing) { _, now in
            DraftStore.write(now.strokes.isEmpty ? nil : now.dataRepresentation(), key, .drawing)
        }
        .onChange(of: photoItem) { _, item in
            if let item { Task { await choose(item) } }
        }
        .task {
            if let page = recipe?.handwritingPage { pagePicture = await ImageStore.shared.image(page) }
        }
        .confirmationDialog("Replace what’s on the page?", isPresented: Binding(get: { pendingFill != nil }, set: { if !$0 { pendingFill = nil } }), titleVisibility: .visible) {
            Button("Replace") { if let p = pendingFill { apply(p) } }
        } message: {
            Text("The ingredients and directions on the page are replaced with what was read.")
        }
        #if DEBUG
        .onAppear { if UserDefaults.standard.string(forKey: "debugWriteMode") == "page" { mode = .page } }
        #endif
    }

    @ToolbarContentBuilder private var toolbar: some ToolbarContent {
        ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") { dismiss() }
        }
        ToolbarItem(placement: .principal) {
            Picker("How to write", selection: $mode) {
                ForEach(Mode.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .frame(width: 400)
        }
        ToolbarItem(placement: .confirmationAction) {
            if saving {
                ProgressView()
            } else {
                Button("Save") { Task { await save() } }.bold()
            }
        }
    }

    // ---- notes above the page

    @ViewBuilder private var banners: some View {
        if !unlocked {
            note("Editing is locked on this iPad, so this recipe can’t be saved yet. Unlock it in Settings. Your draft is kept.")
        }
        if restored {
            HStack(spacing: 12) {
                Text("Restored your unsaved draft.")
                Button("Discard it") { discardDraft() }.font(.ui(15, .semibold))
            }
            .font(.ui(15))
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(Color.field, in: RoundedRectangle(cornerRadius: 16))
        }
        if !notice.isEmpty { note(notice) }
        if !error.isEmpty { note(error, color: .cover) }
    }

    private func note(_ text: String, color: Color = .fg) -> some View {
        Text(text).font(.ui(15)).foregroundStyle(color)
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(Color.field, in: RoundedRectangle(cornerRadius: 16))
    }

    // ---- write on the lines

    private var linesPage: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            photoRow.padding(.top, 14)
            ingredientsSection.padding(.top, line)
            directionsSection.padding(.top, line)
            notesSection.padding(.top, line)
            if recipe == nil { pasteBox.padding(.top, line) }
        }
        .padding(.leading, 44)
        .padding(.trailing, 36)
        .padding(.vertical, 32)
        .background(Color.paper)
        .clipShape(RoundedRectangle(cornerRadius: 3))
        .shadow(color: .black.opacity(0.14), radius: 10, y: 3)
        .overlay(alignment: .leading) { Spiral().frame(width: 40).padding(.vertical, 24).offset(x: -20) }
        .overlay(alignment: .topTrailing) { categoryTabs.offset(x: 34).padding(.top, 96) }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 14) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: 20) { titleField; statBox }
                VStack(alignment: .leading, spacing: 14) { titleField; statBox }
            }
            tagCircles.padding(.bottom, 10)
            Rectangle().fill(Color.rule).frame(height: 1)
        }
    }

    private var titleField: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("recipe:").font(.slab(23)).foregroundStyle(Color.label)
            TextField("", text: oneLine($draft.title, next: .ingredient(0, 0)), prompt: hint("title"), axis: .vertical)
                .font(.hand(30))
                .foregroundStyle(Color.ink)
                .focused($focus, equals: .title)
                .textInputAutocapitalization(.never)
                .overlay(alignment: .bottom) { Rectangle().fill(Color.rule).frame(height: 1).offset(y: 4) }
                .accessibilityLabel("Title")
        }
        .frame(minWidth: 300, maxWidth: .infinity, alignment: .leading)
    }

    private var statBox: some View {
        HStack(spacing: 0) {
            statCell("Servings", $draft.servings, .servings, suffix: "", first: true)
            statCell("Prep time", $draft.prepMin, .prep, suffix: "min")
            statCell("Cook time", $draft.cookMin, .cook, suffix: "min")
        }
        .frame(width: 290)
        .overlay(Rectangle().stroke(Color.mauve, lineWidth: 1))
    }

    private func statCell(_ label: String, _ value: Binding<String>, _ field: Field, suffix: String, first: Bool = false) -> some View {
        VStack(spacing: 0) {
            Text(label).labelCaps(8, color: .white)
                .frame(maxWidth: .infinity).padding(.vertical, 3).background(Color.mauve)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                TextField("", text: value)
                    .font(.hand(22)).foregroundStyle(Color.ink)
                    .multilineTextAlignment(.center)
                    .keyboardType(.numberPad)
                    .focused($focus, equals: field)
                    .frame(width: suffix.isEmpty ? 60 : 36)
                    .accessibilityLabel(label)
                if !suffix.isEmpty { Text(suffix).font(.hand(18)).foregroundStyle(Color.ink.opacity(0.7)) }
            }
            .frame(height: 38)
        }
        .overlay(alignment: .leading) {
            if !first { Rectangle().fill(Color.mauve).frame(width: 1) }
        }
    }

    private var tagCircles: some View {
        FlowLayout(spacing: 14, lineSpacing: 6) {
            ForEach(Book.tags, id: \.id) { t in
                let on = draft.tags.contains(t.id)
                Button {
                    if on { draft.tags.removeAll { $0 == t.id } } else { draft.tags.append(t.id) }
                } label: {
                    HStack(spacing: 5) {
                        TagCircle(on: on)
                        Text(t.label).labelCaps(8.5, color: on ? .ink : .label)
                    }
                    .padding(.vertical, 6)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(t.label)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }

    // The book's colored side tabs pick the category.
    private var categoryTabs: some View {
        VStack(spacing: 8) {
            ForEach(Book.categories) { c in
                let on = draft.category == c.slug
                Button { draft.category = c.slug } label: {
                    Text(c.name)
                        .labelCaps(9, color: .white)
                        .fixedSize()
                        .frame(width: 110, height: 30)
                        .background(c.color)
                        .rotationEffect(.degrees(90))
                        .frame(width: 30, height: 110)
                        .clipShape(UnevenRoundedRectangle(bottomTrailingRadius: 6, topTrailingRadius: 6))
                        .offset(x: on ? 6 : 0)
                        .opacity(on ? 1 : 0.6)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Category: \(c.name)")
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }

    private var photoRow: some View {
        HStack(spacing: 16) {
            if let photo {
                Image(uiImage: photo).resizable().scaledToFill()
                    .frame(width: 72, height: 72).clipShape(RoundedRectangle(cornerRadius: 16))
            } else if !draft.photoPath.isEmpty {
                StoredImage(picture: Picture(bucket: "photos", path: draft.photoPath)) { Color.field }
                    .frame(width: 72, height: 72).clipShape(RoundedRectangle(cornerRadius: 16))
            }
            PhotosPicker(selection: $photoItem, matching: .images) {
                Label(photo == nil && draft.photoPath.isEmpty ? "Add a photo" : "Change photo", systemImage: "camera")
                    .font(.ui(15, .semibold))
                    .padding(.horizontal, 16).padding(.vertical, 9)
                    .card(radius: 30)
            }
            if photo != nil || !draft.photoPath.isEmpty {
                Button("Remove") {
                    photo = nil
                    DraftStore.write(nil, key, .photo)
                    draft.photoPath = ""
                }
                .font(.ui(15)).foregroundStyle(Color.muted)
            }
        }
    }

    // Ingredients in two columns, as in the book; each section has its name line on top.
    private var ingredientsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("Ingredients") {
                Image("RollingPin").resizable().scaledToFit().frame(width: 100, height: 20).padding(.leading, 18).padding(.bottom, 6)
            }
            let (left, right) = columns()
            HStack(alignment: .top, spacing: 28) {
                VStack(spacing: line / 2) { ForEach(left, id: \.self) { groupLines($0) } }
                VStack(spacing: line / 2) { ForEach(right, id: \.self) { groupLines($0) } }
            }
            Button {
                draft.groups.append(Draft.Group(name: "", lines: []))
                focus = .groupName(draft.groups.count - 1)
            } label: {
                Label("Add a section", systemImage: "plus").font(.ui(14, .semibold))
            }
            .padding(.top, 12)
        }
    }

    // Sections split between the columns by line count, the first half on the left.
    private func columns() -> ([Int], [Int]) {
        let sizes = draft.groups.map { $0.lines.count + 2 }
        let half = sizes.reduce(0, +) / 2
        var total = 0
        var left: [Int] = []
        for (i, s) in sizes.enumerated() {
            guard i == 0 || total + s / 2 <= half else { break }
            left.append(i)
            total += s
        }
        return (left, Array(draft.groups.indices.filter { !left.contains($0) }))
    }

    private func groupLines(_ gi: Int) -> some View {
        let count = draft.groups[gi].lines.count
        return VStack(spacing: 0) {
            lineField(groupNameBinding(gi), prompt: gi == 0 ? "section name (optional)" : "section name", field: .groupName(gi),
                      next: .ingredient(gi, 0), size: handSize * 0.9, alignment: .trailing)
            ForEach(0...count, id: \.self) { li in
                lineField(ingredientBinding(gi, li), prompt: li == 0 && gi == 0 ? "1/3 c sweet chili sauce" : "",
                          field: .ingredient(gi, li), next: .ingredient(gi, li + 1))
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var directionsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("Directions") {
                Image("WhiskAndSpoon").resizable().scaledToFit().frame(width: 62, height: 56).padding(.leading, 24).padding(.bottom, 4)
                Spacer()
                Image("PlateSetting").resizable().scaledToFit().frame(width: 84, height: 44).padding(.bottom, 4)
            }
            ForEach(0...draft.directions.count, id: \.self) { i in directionRow(i) }
            Text("Write “-” at the start of a line for a sub-step, or tap ▷ to switch.")
                .font(.ui(13)).foregroundStyle(Color.muted).padding(.top, 8)
        }
    }

    private func directionRow(_ i: Int) -> some View {
        let existing = i < draft.directions.count ? draft.directions[i] : nil
        let sub = existing?.kind == .sub
        return HStack(alignment: .firstTextBaseline, spacing: 6) {
            Button {
                if existing != nil { draft.directions[i].kind = sub ? .step : .sub }
            } label: {
                Text(sub ? "–" : "▷").font(.system(size: sub ? handSize : 15)).foregroundStyle(Color.ink.opacity(existing == nil ? 0.3 : 1))
                    .frame(width: 24, alignment: .leading)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(sub ? "Sub-step, tap to make it a step" : "Step, tap to make it a sub-step")
            TextField("", text: directionBinding(i), prompt: i == 0 ? hint("marinate chicken at least 30 min") : nil, axis: .vertical)
                .font(.hand(handSize)).foregroundStyle(Color.ink)
                .focused($focus, equals: .direction(i))
                .textInputAutocapitalization(.never)
                .lineSpacing(line - (UIFont(name: "PatrickHand-Regular", size: handSize)?.lineHeight ?? 26))
                .padding(.bottom, lift)
                .frame(minHeight: line, alignment: .bottom)
                .overlay(alignment: .bottom) { Rectangle().fill(Color.rule).frame(height: 1) }
        }
        .padding(.leading, sub ? 48 : 0)
    }

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("Notes") { EmptyView() }
            TextField("", text: $draft.notes, prompt: hint("tips, swaps, who loved it"), axis: .vertical)
                .font(.hand(handSize)).foregroundStyle(Color.ink)
                .focused($focus, equals: .notes)
                .lineLimit(3...)
                .lineSpacing(line - (UIFont(name: "PatrickHand-Regular", size: handSize)?.lineHeight ?? 26))
                .padding(.bottom, lift)
                .background(alignment: .top) { RuledLines(spacing: line).padding(.top, 2) }
        }
    }

    // Paste a recipe's text (copied with Live Text, or from anywhere) to fill the page.
    private var pasteBox: some View {
        DisclosureGroup {
            VStack(alignment: .leading, spacing: 10) {
                TextEditor(text: $pasted)
                    .font(.ui(15))
                    .frame(height: 140)
                    .scrollContentBackground(.hidden)
                    .background(Color.surface, in: RoundedRectangle(cornerRadius: 12))
                Button("Fill the page") { fill(Parse.recipeText(pasted), from: "the pasted text") }
                    .font(.ui(15, .semibold))
                    .disabled(pasted.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(.top, 8)
        } label: {
            Text("Paste a recipe’s text").font(.ui(15, .semibold)).foregroundStyle(Color.accent)
        }
    }

    private func sectionLabel<Extra: View>(_ text: String, @ViewBuilder extra: () -> Extra) -> some View {
        HStack(alignment: .bottom, spacing: 0) {
            Text(text).labelCaps(11).padding(.bottom, 8)
            extra()
        }
        .frame(height: line, alignment: .bottomLeading)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func lineField(_ text: Binding<String>, prompt: String, field: Field, next: Field,
                           size: CGFloat = handSize, alignment: TextAlignment = .leading) -> some View {
        TextField("", text: text, prompt: prompt.isEmpty ? nil : hint(prompt))
            .font(.hand(size))
            .foregroundStyle(Color.ink.opacity(alignment == .trailing ? 0.85 : 1))
            .multilineTextAlignment(alignment)
            .focused($focus, equals: field)
            .submitLabel(.next)
            .onSubmit { focus = next }
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .padding(.bottom, lift)
            .frame(height: line, alignment: .bottom)
            .overlay(alignment: .bottom) { Rectangle().fill(Color.rule).frame(height: 1) }
    }

    private func hint(_ text: String) -> Text {
        Text(text).foregroundColor(Color.ink.opacity(0.3))
    }

    // ---- bindings: each list has one empty line at the end to write the next line on

    // Return moves on instead of starting a new line (the title wraps by itself).
    private func oneLine(_ text: Binding<String>, next: Field) -> Binding<String> {
        Binding(get: { text.wrappedValue }, set: { v in
            if v.contains("\n") {
                text.wrappedValue = v.replacingOccurrences(of: "\n", with: " ").trimmingCharacters(in: .whitespaces)
                focus = next
            } else {
                text.wrappedValue = v
            }
        })
    }

    private func groupNameBinding(_ gi: Int) -> Binding<String> {
        Binding(get: { gi < draft.groups.count ? draft.groups[gi].name : "" },
                set: { if gi < draft.groups.count { draft.groups[gi].name = $0 } })
    }

    private func ingredientBinding(_ gi: Int, _ li: Int) -> Binding<String> {
        Binding(get: {
            guard gi < draft.groups.count, li < draft.groups[gi].lines.count else { return "" }
            return draft.groups[gi].lines[li]
        }, set: { v in
            guard gi < draft.groups.count else { return }
            if li < draft.groups[gi].lines.count {
                draft.groups[gi].lines[li] = v
            } else if !v.isEmpty {
                draft.groups[gi].lines.append(v)
            }
        })
    }

    private func directionBinding(_ i: Int) -> Binding<String> {
        Binding(get: { i < draft.directions.count ? draft.directions[i].text : "" }, set: { v in
            let enter = v.contains("\n")
            let text = v.replacingOccurrences(of: "\n", with: " ")
            if i < draft.directions.count {
                draft.directions[i] = Parse.directionLine(text, kind: draft.directions[i].kind)
            } else if !text.isEmpty {
                // New lines are ▷ steps; a leading "-" makes a sub-step, as in the book.
                draft.directions.append(Parse.directionLine(text, kind: .step))
            }
            if enter { focus = .direction(i + 1) }
        })
    }

    // ---- write on the page

    private var pencilPage: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 16) {
                Button {
                    Task { await readWriting() }
                } label: {
                    Label(reading ? "Reading…" : "Read my writing", systemImage: "text.viewfinder")
                        .font(.ui(16, .semibold)).foregroundStyle(.white)
                        .padding(.horizontal, 20).padding(.vertical, 12)
                        .background(Color.accent, in: Capsule())
                }
                .disabled(reading || drawing.strokes.isEmpty)
                Button("Clear the page") { drawing = PKDrawing() }
                    .font(.ui(15)).foregroundStyle(Color.muted)
                    .disabled(drawing.strokes.isEmpty)
            }
            Text("Write the title beside “recipe:”, ingredients in the two columns (leave a line before each section like “marinade”), and one step per line; start sub-steps further in or with “–”. Then Read my writing fills the lines to check. Your writing is kept as the handwritten page.")
                .font(.ui(14)).foregroundStyle(Color.muted)
                .frame(maxWidth: PencilPage.width, alignment: .leading)
            ZStack(alignment: .topLeading) {
                PencilPaper(picture: pagePicture)
                PencilCanvas(drawing: $drawing)
            }
            .frame(width: PencilPage.size.width, height: PencilPage.size.height)
            .clipShape(RoundedRectangle(cornerRadius: 3))
            .shadow(color: .black.opacity(0.14), radius: 10, y: 3)
            .frame(maxWidth: .infinity)
        }
    }

    private func readWriting() async {
        reading = true
        defer { reading = false }
        error = ""
        let image = HandwritingReader.render(drawing: drawing, picture: pagePicture, paper: false)
        do {
            guard let cg = image.cgImage else { return }
            let found = try await HandwritingReader.lines(in: cg)
            fill(Parse.recipeText(HandwritingReader.recipeText(found)), from: "your writing")
        } catch {
            self.error = "Your writing couldn’t be read: \(error.localizedDescription)"
        }
    }

    // ---- filling the page from recognized or pasted text

    private func fill(_ p: PastedRecipe, from source: String) {
        error = ""
        if p.title.isEmpty && p.ingredientGroups.isEmpty && p.stepGroups.isEmpty {
            error = "No recipe found in \(source)."
            return
        }
        if draft.hasContent && (!p.ingredientGroups.isEmpty || !p.stepGroups.isEmpty) {
            pendingFill = p
        } else {
            apply(p)
        }
    }

    private func apply(_ p: PastedRecipe) {
        draft.fill(from: p)
        pendingFill = nil
        mode = .lines
        let items = p.ingredientGroups.reduce(0) { $0 + $1.items.count }
        notice = "Filled in \(items) ingredient\(items == 1 ? "" : "s") and \(p.stepGroups.count) step\(p.stepGroups.count == 1 ? "" : "s"). Check each line before saving."
    }

    // ---- photo, draft and saving

    private func choose(_ item: PhotosPickerItem) async {
        defer { photoItem = nil }
        guard let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) else {
            error = "That photo couldn’t be opened."
            return
        }
        let small = image.scaledDown(maxSide: 2000)
        guard let jpeg = small.jpegData(compressionQuality: 0.85) else { return }
        DraftStore.write(jpeg, key, .photo)
        photo = small
    }

    private func discardDraft() {
        DraftStore.remove(key)
        draft = original
        drawing = PKDrawing()
        photo = nil
        restored = false
        notice = ""
    }

    private func save() async {
        error = ""
        saving = true
        defer { saving = false }
        do {
            _ = try draft.payload() // check the title and numbers before uploading anything
            if photo != nil, let jpeg = DraftStore.data(key, .photo) {
                let path = try await Writer.upload(jpeg, bucket: "photos", recipeId: draft.id, ext: "jpg", contentType: "image/jpeg")
                await ImageStore.shared.store(jpeg, for: Picture(bucket: "photos", path: path))
                // uploaded: not again if the save below fails and is tried again
                draft.photoPath = path
                photo = nil
                DraftStore.write(nil, key, .photo)
            }
            if !drawing.strokes.isEmpty && drawing != uploadedDrawing {
                let page = HandwritingReader.render(drawing: drawing, picture: pagePicture, paper: true)
                guard let png = page.pngData() else { throw Draft.Invalid(errorDescription: "The handwritten page couldn’t be saved.") }
                let path = try await Writer.upload(png, bucket: "handwriting", recipeId: draft.id, ext: "png", contentType: "image/png")
                await ImageStore.shared.store(png, for: Picture(bucket: "handwriting", path: path))
                draft.handwritingPath = path
                draft.source = "pencil"
                uploadedDrawing = drawing
            }
            try await Writer.save(draft.payload())
            DraftStore.remove(key)
            await sync.run(context)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

extension UIImage {
    // At most `maxSide` points on the longer side, for uploading.
    func scaledDown(maxSide: CGFloat) -> UIImage {
        let longest = max(size.width, size.height)
        guard longest > maxSide else { return self }
        let scale = maxSide / longest
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let target = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in draw(in: CGRect(origin: .zero, size: target)) }
    }
}
