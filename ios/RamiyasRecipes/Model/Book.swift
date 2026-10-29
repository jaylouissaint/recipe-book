import SwiftUI

// The fixed parts of a recipe page: tag checkboxes and the colored side tabs (src/lib/book.ts).
struct Category: Identifiable, Hashable {
    let slug: String
    let name: String
    let color: Color
    var id: String { slug }
}

enum Book {
    static let tags: [(id: String, label: String)] = [
        ("quick-easy", "Quick & Easy"),
        ("slow-cooker", "Slow Cooker"),
        ("one-pot", "One Pot/Pan"),
        ("kid-chef", "Kid Chef Friendly"),
        ("everyday", "Everyday"),
        ("make-ahead", "Make Ahead"),
        ("pressure-cooker", "Pressure Cooker"),
        ("air-fryer", "Air Fryer"),
        ("family-favorite", "Family Favorite"),
        ("special-occasion", "Special Occasion"),
        ("veg", "Veg"),
        ("vegan", "Vegan"),
        ("gluten-free", "Gluten Free"),
        ("dairy-free", "Dairy Free"),
        ("nut-free", "Nut Free"),
        ("kosher", "Kosher"),
    ]

    static let categories: [Category] = [
        Category(slug: "mains", name: "Mains", color: .tabMustard),
        Category(slug: "sides", name: "Sides", color: .tabOrange),
        Category(slug: "desserts", name: "Desserts", color: .tabPink),
        Category(slug: "more", name: "More Recipes", color: .tabBlue),
    ]

    static func category(_ slug: String) -> Category? {
        categories.first { $0.slug == slug }
    }

    static func tagLabel(_ id: String) -> String? {
        tags.first { $0.id == id }?.label
    }
}
