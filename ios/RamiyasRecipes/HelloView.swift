import SwiftUI

// Colors from docs/DESIGN.md.
extension Color {
    static let page = Color(red: 0xFB / 255, green: 0xF8 / 255, blue: 0xF2 / 255)
    static let accentGreen = Color(red: 0x1F / 255, green: 0x4D / 255, blue: 0x3D / 255)
    static let ink = Color(red: 0x7B / 255, green: 0x3F / 255, blue: 0x61 / 255)
    static let muted = Color(red: 0x77 / 255, green: 0x73 / 255, blue: 0x6C / 255)
}

struct HelloView: View {
    @State private var titles: [String] = []
    @State private var status = "Reading the recipe book…"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Ramiya's Recipes")
                    .font(.system(size: 44, design: .serif))
                Text("Hello from the iPad app. This is the test build: if it still opens after a week without plugging in, the automatic refresh works.")
                    .foregroundStyle(Color.muted)

                card {
                    row("Built", Self.built.formatted(date: .abbreviated, time: .shortened))
                    row("Version", Self.version)
                }

                card {
                    Text("In the book").font(.headline)
                    if titles.isEmpty {
                        Text(status).foregroundStyle(Color.muted)
                    }
                    ForEach(titles, id: \.self) { title in
                        Text(title)
                            .font(.system(size: 22, design: .rounded))
                            .foregroundStyle(Color.ink)
                    }
                }
            }
            .padding(32)
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(Color.page.ignoresSafeArea())
        .tint(.accentGreen)
        .task { await load() }
        .refreshable { await load() }
    }

    private func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10, content: content)
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 20))
            .shadow(color: .black.opacity(0.06), radius: 8, y: 4)
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).foregroundStyle(Color.muted)
            Spacer()
            Text(value)
        }
    }

    private func load() async {
        do {
            titles = try await RecipeTitles.fetch()
            if titles.isEmpty { status = "No recipes yet." }
        } catch {
            status = "Couldn't reach the recipe book: \(error.localizedDescription)"
        }
    }

    static let version: String = {
        let info = Bundle.main.infoDictionary
        return "\(info?["CFBundleShortVersionString"] ?? "?") (\(info?["CFBundleVersion"] ?? "?"))"
    }()

    // When this copy of the app was built: the app binary's date.
    static let built: Date = {
        let path = Bundle.main.executablePath ?? ""
        let attributes = try? FileManager.default.attributesOfItem(atPath: path)
        return attributes?[.modificationDate] as? Date ?? .now
    }()
}

#Preview {
    HelloView()
}
