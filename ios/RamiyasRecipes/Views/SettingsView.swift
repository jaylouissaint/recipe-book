import SwiftData
import SwiftUI

// Settings: the write key (kept in the Keychain), sync status and last refresh.
struct SettingsView: View {
    @Environment(Sync.self) private var sync
    @Environment(\.modelContext) private var context
    @AppStorage("editing.unlocked") private var unlocked = false
    @Query private var recipes: [Recipe]
    @State private var key = ""
    @State private var keyMessage = ""
    @State private var checking = false
    @State private var confirmResync = false

    var body: some View {
        Form {
            Section {
                if unlocked {
                    Label("Editing is unlocked on this iPad", systemImage: "lock.open")
                    Button("Lock editing", role: .destructive) {
                        Keychain.setWriteKey(nil)
                        unlocked = false
                        keyMessage = ""
                    }
                } else {
                    SecureField("Write key", text: $key)
                        .textContentType(.password)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                    Button(checking ? "Checking…" : "Unlock editing") { Task { await unlock() } }
                        .disabled(checking || key.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                if !keyMessage.isEmpty { Text(keyMessage).foregroundStyle(Color.cover) }
            } header: {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Settings").font(.serif(52)).foregroundStyle(Color.fg).textCase(nil)
                    Text("Editing")
                }
                .padding(.top, 12)
            } footer: {
                Text("Paste your write key once. It’s kept in this iPad’s Keychain and only sent to the recipe book when saving.")
            }

            Section("Sync") {
                LabeledContent("Recipes on this iPad", value: "\(recipes.count)")
                LabeledContent("Last refreshed") {
                    if let date = sync.lastSynced {
                        Text(date, format: .relative(presentation: .named))
                    } else {
                        Text("Not yet")
                    }
                }
                switch sync.state {
                case .syncing: LabeledContent("Status") { ProgressView() }
                case .failed(let message): LabeledContent("Status", value: message)
                case .idle: EmptyView()
                }
                Button("Refresh now") { Task { await sync.run(context) } }
                    .disabled(sync.state == .syncing)
                Button("Download everything again") { confirmResync = true }
                    .disabled(sync.state == .syncing)
                    .confirmationDialog("Download the whole book again?", isPresented: $confirmResync) {
                        Button("Download again") { Task { await sync.resync(context) } }
                    } message: {
                        Text("Recipes stay on the website. Only this iPad’s copy is replaced.")
                    }
            }

            Section("About") {
                LabeledContent("Version", value: Self.version)
                Link("Open the website", destination: Supabase.website)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .font(.ui(17))
        .scrollContentBackground(.hidden)
        .background(Color.page)
    }

    private func unlock() async {
        checking = true
        defer { checking = false }
        let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            try await Supabase.checkWriteKey(trimmed)
            Keychain.setWriteKey(trimmed)
            unlocked = true
            key = ""
            keyMessage = ""
        } catch {
            keyMessage = error.localizedDescription
        }
    }

    static let version: String = {
        let info = Bundle.main.infoDictionary
        return "\(info?["CFBundleShortVersionString"] ?? "?") (\(info?["CFBundleVersion"] ?? "?"))"
    }()
}
