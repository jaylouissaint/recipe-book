import SwiftUI

// The grocery list arrives in Phase 5 (and website step R4).
struct GroceriesView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Groceries").font(.serif(52))
                VStack(spacing: 12) {
                    Image(systemName: "cart").font(.system(size: 36)).foregroundStyle(Color.muted)
                    Text("your list is empty").font(.hand(26)).foregroundStyle(Color.ink)
                    Text("Soon “Add to Groceries” on any recipe will put its ingredients here, ready to check off at the store.")
                        .font(.ui(15)).foregroundStyle(Color.muted).multilineTextAlignment(.center)
                        .frame(maxWidth: 380)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 48)
                .card()
            }
            .padding(32)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(Color.page)
        .toolbar(.hidden, for: .navigationBar)
    }
}
