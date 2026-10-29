import PencilKit
import SwiftUI
import UIKit
import XCTest
@testable import RamiyasRecipes

// The writing page sorts lines by the same rules as the website: shared/fixtures/*.json are the
// cases src/lib/parse.test.mts and pasteText.test.mts also run.
final class ParseTests: XCTestCase {
    private func fixture<T: Decodable>(_ name: String, as: T.Type) throws -> T {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: name, withExtension: "json"))
        return try JSONDecoder().decode(T.self, from: Data(contentsOf: url))
    }

    func testIngredientLines() throws {
        struct Case: Decodable { let line: String; let quantity: String; let unit: String; let item: String }
        for c in try fixture("ingredient-lines", as: [Case].self) {
            XCTAssertEqual(Parse.ingredient(c.line), Ingredient(quantity: c.quantity, unit: c.unit, item: c.item), c.line)
        }
    }

    func testPastedRecipes() throws {
        struct Expected: Decodable {
            let title: String
            let servings: Int?
            let prepMin: Int?
            let cookMin: Int?
            let ingredientGroups: [IngredientGroup]
            let stepGroups: [StepGroup]
            let notes: String
        }
        struct Case: Decodable { let name: String; let text: String; let expected: Expected }
        for c in try fixture("pasted-recipes", as: [Case].self) {
            let got = Parse.recipeText(c.text)
            let e = c.expected
            XCTAssertEqual(got.title, e.title, c.name)
            XCTAssertEqual(got.servings, e.servings, c.name)
            XCTAssertEqual(got.prepMin, e.prepMin, c.name)
            XCTAssertEqual(got.cookMin, e.cookMin, c.name)
            XCTAssertEqual(got.ingredientGroups, e.ingredientGroups, c.name)
            XCTAssertEqual(got.stepGroups, e.stepGroups, c.name)
            XCTAssertEqual(got.notes, e.notes, c.name)
        }
    }

    func testDirectionLines() {
        XCTAssertEqual(Parse.directionLine("- whisk", kind: .step), DirectionLine(kind: .sub, text: "whisk"))
        XCTAssertEqual(Parse.directionLine("– ", kind: .step), DirectionLine(kind: .sub, text: ""))
        XCTAssertEqual(Parse.directionLine("  cook chicken", kind: .step), DirectionLine(kind: .step, text: "cook chicken"))
        let lines = [
            DirectionLine(kind: .sub, text: "preheat"),
            DirectionLine(kind: .step, text: "cook chicken"),
            DirectionLine(kind: .sub, text: "grill 5-7 min"),
            DirectionLine(kind: .step, text: " "),
        ]
        let groups = Parse.stepGroups(lines)
        XCTAssertEqual(groups, [StepGroup(title: "preheat", steps: []), StepGroup(title: "cook chicken", steps: ["grill 5-7 min"])])
        XCTAssertEqual(Parse.stepGroups(Parse.directionLines(groups)), groups)
    }
}

final class DraftTests: XCTestCase {
    func testPayloadChecksNumbersAndDropsEmptyLines() throws {
        var d = Draft(id: "5c1e0a3e-7d4b-4c55-9a51-2f3b6c1d0001")
        d.title = "  sweet chili chicken "
        d.servings = "4"
        d.prepMin = "45 min"
        d.groups = [
            Draft.Group(name: "marinade", lines: ["2 lbs chicken thighs", " ", "1/3c sweet chili sauce"]),
            Draft.Group(name: "empty", lines: [""]),
        ]
        d.directions = [DirectionLine(kind: .step, text: "cook chicken"), DirectionLine(kind: .sub, text: "rest 5 min")]
        let p = try d.payload()
        XCTAssertEqual(p.title, "sweet chili chicken")
        XCTAssertEqual(p.servings, 4)
        XCTAssertEqual(p.prepMin, 45)
        XCTAssertNil(p.cookMin)
        XCTAssertEqual(p.ingredientGroups.map(\.name), ["marinade"])
        XCTAssertEqual(p.ingredientGroups[0].items[1], Ingredient(quantity: "1/3", unit: "c", item: "sweet chili sauce"))
        XCTAssertEqual(p.stepGroups, [StepGroup(title: "cook chicken", steps: ["rest 5 min"])])
        XCTAssertNil(p.photoPath)

        // The keys save_recipe reads (camelCase, as the website sends them).
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(p)) as? [String: Any])
        for key in ["id", "title", "servings", "prepMin", "category", "tags", "source", "ingredientGroups", "stepGroups", "imported"] {
            XCTAssertNotNil(json[key], key)
        }

        d.cookMin = "about 20"
        XCTAssertThrowsError(try d.payload()) { XCTAssertEqual($0.localizedDescription, "Cook time should be a number") }
        d.cookMin = ""
        d.title = " "
        XCTAssertThrowsError(try d.payload()) { XCTAssertEqual($0.localizedDescription, "Give the recipe a title") }
    }

    func testEditingARecipeRoundTrips() throws {
        let r = Recipe(id: "x")
        r.title = "pumpkin cake"
        r.servings = 12
        r.ingredientGroups = [IngredientGroup(name: "", items: [Ingredient(quantity: "1 1/2", unit: "cups", item: "flour")])]
        r.stepGroups = [StepGroup(title: "mix", steps: ["fold gently"])]
        let p = try Draft(recipe: r).payload()
        XCTAssertEqual(p.ingredientGroups, r.ingredientGroups)
        XCTAssertEqual(p.stepGroups, r.stepGroups)
        XCTAssertEqual(p.servings, 12)
        XCTAssertFalse(p.imported)
    }

    func testDraftsSurviveOnDisk() {
        var d = Draft()
        d.title = "draft test"
        DraftStore.save(d, key: "test")
        DraftStore.write(Data([1, 2, 3]), "test", .drawing)
        XCTAssertEqual(DraftStore.load("test"), d)
        DraftStore.remove("test")
        XCTAssertNil(DraftStore.load("test"))
        XCTAssertNil(DraftStore.data("test", .drawing))
    }
}

// Page mode: writing is sorted by where it is on the page. The "writing" here is text drawn in
// the handwriting font where a person would write it, read with Apple's on-device recognition.
@MainActor
final class HandwritingTests: XCTestCase {
    private func y(_ area: PencilPage.Area, line n: Int) -> CGFloat {
        PencilPage.rect(area).minY + CGFloat((area == .title ? 0 : 1) + n) * PencilPage.line
    }

    func testSortingLinesIntoAreas() {
        func at(_ text: String, _ x: CGFloat, _ area: PencilPage.Area, _ n: Int) -> HandwritingReader.Found {
            HandwritingReader.Found(text: text, frame: CGRect(x: x, y: y(area, line: n) + 8, width: 150, height: 22))
        }
        let right = PencilPage.columnSplit + 20
        let found = [
            at("chicken", 260, .title, 0), at("sweet chili", 130, .title, 0),
            at("marinade", 80, .ingredients, 0), at("2 lbs chicken thighs", 80, .ingredients, 1),
            at("1/3 c sweet chili sauce", 80, .ingredients, 2),
            at("drizzle", right, .ingredients, 0), at("2 TB mayo", right, .ingredients, 1),
            at("pinch of salt", right, .ingredients, 2), at("2 c cooked rice", right, .ingredients, 4),
            at("cook chicken", 70, .directions, 0), at("grill 5-7 min per side", 120, .directions, 1),
            at("rest 5 min", 120, .directions, 2), at("assemble the bowls", 70, .directions, 3),
            at("great with mango", 70, .notes, 0),
        ]
        let p = Parse.recipeText(HandwritingReader.recipeText(found.shuffled()))
        XCTAssertEqual(p.title, "sweet chili chicken")
        XCTAssertEqual(p.ingredientGroups.map(\.name), ["marinade", "drizzle"])
        XCTAssertEqual(p.ingredientGroups[1].items.map(\.item), ["mayo", "pinch of salt", "cooked rice"])
        XCTAssertEqual(p.stepGroups, [
            StepGroup(title: "cook chicken", steps: ["grill 5-7 min per side", "rest 5 min"]),
            StepGroup(title: "assemble the bowls", steps: []),
        ])
        XCTAssertEqual(p.notes, "great with mango")
    }

    func testReadingThePage() async throws {
        let lines: [(String, CGFloat, PencilPage.Area, Int)] = [
            ("lemon bars", 150, .title, 0),
            ("2 c flour", 80, .ingredients, 0),
            ("1 c butter", 80, .ingredients, 1),
            ("4 eggs", PencilPage.columnSplit + 20, .ingredients, 0),
            ("press crust into pan", 70, .directions, 0),
            ("bake 20 min", 120, .directions, 1),
        ]
        let format = UIGraphicsImageRendererFormat()
        format.scale = 2
        let font = try XCTUnwrap(UIFont(name: "PatrickHand-Regular", size: 26))
        let image = UIGraphicsImageRenderer(size: PencilPage.size, format: format).image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(origin: .zero, size: PencilPage.size))
            for (text, x, area, n) in lines {
                (text as NSString).draw(at: CGPoint(x: x, y: y(area, line: n) + 2),
                                        withAttributes: [.font: font, .foregroundColor: UIColor(Color.ink)])
            }
        }
        let found = try await HandwritingReader.lines(in: try XCTUnwrap(image.cgImage))
        let p = Parse.recipeText(HandwritingReader.recipeText(found))
        XCTAssertEqual(p.title.lowercased(), "lemon bars")
        XCTAssertEqual(p.ingredientGroups.flatMap(\.items).map(\.item), ["flour", "butter", "eggs"])
        XCTAssertEqual(p.stepGroups.map(\.title), ["press crust into pan"])
        XCTAssertEqual(p.stepGroups.first?.steps, ["bake 20 min"])
    }

    func testThePageKeepsTheInk() {
        var drawing = PKDrawing()
        let points = (0..<20).map { PKStrokePoint(location: CGPoint(x: 100 + Double($0) * 10, y: 60), timeOffset: Double($0) / 60,
                                                  size: CGSize(width: 4, height: 4), opacity: 1, force: 1, azimuth: 0, altitude: .pi / 2) }
        drawing.strokes.append(PKStroke(ink: PKInk(.pen, color: .black), path: PKStrokePath(controlPoints: points, creationDate: .now)))
        let page = HandwritingReader.render(drawing: drawing, picture: nil, paper: true)
        XCTAssertEqual(page.size, PencilPage.size)
        XCTAssertNotNil(page.pngData())
    }
}
