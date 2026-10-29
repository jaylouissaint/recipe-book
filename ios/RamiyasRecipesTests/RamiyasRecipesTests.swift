import XCTest
@testable import RamiyasRecipes

// The app must show recipes the way the website does (src/lib/format.ts, bookLayout.ts).
final class FormatTests: XCTestCase {
    func testIngredientText() {
        XCTAssertEqual(Format.ingredient(Ingredient(quantity: "1/3", unit: "c", item: "sweet chili sauce")), "⅓ c sweet chili sauce")
        XCTAssertEqual(Format.ingredient(Ingredient(quantity: "2", unit: "", item: "garlic cloves (minced)")), "2 garlic cloves (minced)")
        XCTAssertEqual(Format.ingredient(Ingredient(quantity: "", unit: "", item: "pinch of salt")), "pinch of salt")
        XCTAssertEqual(Format.ingredient(Ingredient(quantity: "1 1/2", unit: "cups", item: "flour")), "1 ½ cups flour")
    }

    func testSiteName() {
        XCTAssertEqual(Format.siteName("https://www.smittenkitchen.com/2008/04/pancakes/"), "smittenkitchen.com")
        XCTAssertEqual(Format.siteName("not a link"), "")
    }

    // The sweet chili chicken layout from the book photo (same case as bookLayout.test.mts).
    func testSplitColumnsKeepsTheBookLayout() {
        func items(_ n: Int) -> [Ingredient] { (1...n).map { Ingredient(quantity: "", unit: "", item: "i\($0)") } }
        let (left, right) = Format.splitColumns([
            IngredientGroup(name: "marinade", items: items(7)),
            IngredientGroup(name: "coconut lime drizzle", items: items(6)),
        ])
        XCTAssertEqual(left.count, right.count)
        XCTAssertEqual(left.first, Format.Line(kind: .name, text: "marinade"))
        XCTAssertEqual(right.first, Format.Line(kind: .name, text: "coconut lime drizzle"))
        XCTAssertEqual(left.filter { $0.kind == .item }.count, 7)
        XCTAssertEqual(right.filter { $0.kind == .item }.count, 6)
        XCTAssertEqual(right.last?.kind, .blank)
    }

    func testSplitColumnsSplitsOneLongGroup() {
        let groups = [IngredientGroup(name: "", items: (1...10).map { Ingredient(quantity: "", unit: "", item: "i\($0)") })]
        let (left, right) = Format.splitColumns(groups)
        XCTAssertEqual(left.filter { $0.kind == .item }.map(\.text), (1...5).map { "i\($0)" })
        XCTAssertEqual(right.filter { $0.kind == .item }.map(\.text), (6...10).map { "i\($0)" })
    }
}

// A row as the database sends it becomes a recipe with its parts in order.
final class DecodingTests: XCTestCase {
    func testRecipeRow() throws {
        let json = """
        [{"id":"5c1e0a3e-7d4b-4c55-9a51-2f3b6c1d0001","slug":"sweet-chili-chicken","title":"sweet chili chicken",
          "servings":4,"prep_min":45,"cook_min":15,"category":"mains","tags":["family-favorite"],"notes":null,
          "source":"typed","original_file_path":null,"handwriting_path":null,"photo_path":null,
          "created_at":"2026-10-24T03:12:44.123456+00:00","updated_at":"2026-10-28T03:12:44.5+00:00","deleted_at":null,
          "author":"","source_name":null,"source_url":null,"description":null,"times_cooked":2,"imported":false,
          "ingredient_groups":[
            {"name":"drizzle","position":1,"ingredients":[{"quantity":"2","unit":"TB","item":"mayo","position":0}]},
            {"name":"marinade","position":0,"ingredients":[
              {"quantity":"1/3","unit":"c","item":"sweet chili sauce","position":1},
              {"quantity":"2","unit":"lbs","item":"chicken thighs","position":0}]}],
          "step_groups":[{"title":"cook chicken","position":0,"steps":[{"text":"rest 5 min","position":1},{"text":"grill","position":0}]}]}]
        """
        let rows = try JSONDecoder().decode([RecipeRow].self, from: Data(json.utf8))
        let recipe = Recipe(id: rows[0].id)
        rows[0].apply(to: recipe)
        XCTAssertEqual(recipe.title, "sweet chili chicken")
        XCTAssertEqual(recipe.servings, 4)
        XCTAssertEqual(recipe.ingredientGroups.map(\.name), ["marinade", "drizzle"])
        XCTAssertEqual(recipe.ingredientGroups[0].items.map(\.item), ["chicken thighs", "sweet chili sauce"])
        XCTAssertEqual(recipe.stepGroups[0].steps, ["grill", "rest 5 min"])
        XCTAssertTrue(recipe.isFavorite)
        XCTAssertEqual(recipe.timesCooked, 2)
        XCTAssertNil(rows[0].deleted_at)
    }

    func testPictureFallsBackToTheOriginal() {
        let r = Recipe(id: "x")
        XCTAssertNil(r.picture)
        r.originalFilePath = "x/card.JPG"
        XCTAssertEqual(r.picture, Picture(bucket: "originals", path: "x/card.JPG"))
        r.originalFilePath = "x/card.pdf"
        XCTAssertNil(r.picture)
        r.photoPath = "x/photo.jpg"
        XCTAssertEqual(r.picture, Picture(bucket: "photos", path: "x/photo.jpg"))
    }
}
