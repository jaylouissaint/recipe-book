import Foundation
import SwiftData

// One recipe, as the website has it (src/lib/types.ts). Kept on the iPad with SwiftData so every
// recipe opens offline; Sync fills it from the database.

struct Ingredient: Codable, Hashable {
    var quantity: String // as written, e.g. "1/3", "2", "" for "pinch of salt"
    var unit: String // "c", "TB", "tsp", ""
    var item: String
}

struct IngredientGroup: Codable, Hashable {
    var name: String // "marinade", or "" for loose items
    var items: [Ingredient]
}

struct StepGroup: Codable, Hashable {
    var title: String // the ▷ line
    var steps: [String] // the "–" lines under it
}

@Model
final class Recipe {
    @Attribute(.unique) var id: String
    var slug: String
    var title: String
    var servings: Int?
    var prepMin: Int?
    var cookMin: Int?
    var category: String // a category slug from Book.categories
    var tags: [String] // tag ids from Book.tags
    var notes: String
    var source: String // typed | scribble | pencil | scan | upload
    var originalFilePath: String?
    var handwritingPath: String?
    var photoPath: String?
    var createdAt: String // ISO timestamps as the database sends them; they sort as text
    var updatedAt: String
    var author: String
    var sourceName: String
    var sourceUrl: String
    var summary: String // the recipe's description
    var timesCooked: Int
    var imported: Bool
    var ingredientGroups: [IngredientGroup]
    var stepGroups: [StepGroup]

    init(id: String) {
        self.id = id
        slug = ""
        title = ""
        category = "mains"
        tags = []
        notes = ""
        source = "typed"
        createdAt = ""
        updatedAt = ""
        author = ""
        sourceName = ""
        sourceUrl = ""
        summary = ""
        timesCooked = 0
        imported = false
        ingredientGroups = []
        stepGroups = []
    }

    var isFavorite: Bool { tags.contains("family-favorite") }
}
