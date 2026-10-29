import SwiftUI
import UIKit

// A picture from a storage bucket: the recipe photo, the handwritten page, or the original card.
struct Picture: Hashable {
    let bucket: String
    let path: String
}

extension Recipe {
    // The photo, else the handwritten page, else the original card's photo (as the website's Thumb does).
    var picture: Picture? {
        if let p = photoPath, !p.isEmpty { return Picture(bucket: "photos", path: p) }
        if let h = handwritingPage { return h }
        if let o = originalFilePath, o.range(of: #"\.(jpe?g|png|heic)$"#, options: [.regularExpression, .caseInsensitive]) != nil {
            return Picture(bucket: "originals", path: o)
        }
        return nil
    }

    // The Apple Pencil page, as a picture (the drawing itself isn't kept online).
    var handwritingPage: Picture? {
        guard let h = handwritingPath, h.lowercased().hasSuffix(".png") else { return nil }
        return Picture(bucket: "handwriting", path: h)
    }
}

// Pictures saved in Application Support, so they show without a connection. Downloaded once.
actor ImageStore {
    static let shared = ImageStore()

    private let folder: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appending(path: "Pictures", directoryHint: .isDirectory)
    }()

    private var memory: [Picture: UIImage] = [:]

    private func file(_ p: Picture) -> URL {
        folder.appending(path: p.bucket).appending(path: p.path)
    }

    func image(_ p: Picture) async -> UIImage? {
        if let cached = memory[p] { return cached }
        let url = file(p)
        if let data = try? Data(contentsOf: url), let image = UIImage(data: data) {
            memory[p] = image
            return image
        }
        guard let remote = Supabase.publicFileURL(bucket: p.bucket, path: p.path),
              let result = await download(remote),
              (result.1 as? HTTPURLResponse)?.statusCode == 200,
              let image = UIImage(data: result.0)
        else { return nil }
        let data = result.0
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: url, options: .atomic)
        memory[p] = image
        return image
    }

    // A picture this iPad just uploaded, kept so it shows without downloading it again.
    func store(_ data: Data, for p: Picture) {
        let url = file(p)
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: url, options: .atomic)
        memory[p] = UIImage(data: data)
    }

    private func download(_ url: URL) async -> (Data, URLResponse)? {
        try? await URLSession.shared.data(from: url)
    }

    func prefetch(_ pictures: [Picture]) async {
        for p in pictures where !FileManager.default.fileExists(atPath: file(p).path()) {
            _ = await image(p)
        }
    }
}

// Shows a stored picture, downloading it the first time.
struct StoredImage<Placeholder: View>: View {
    let picture: Picture
    @ViewBuilder var placeholder: () -> Placeholder
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                placeholder()
            }
        }
        .task(id: picture) { image = await ImageStore.shared.image(picture) }
    }
}
