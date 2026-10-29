import UIKit
import XCTest
@testable import RamiyasRecipes

// The flip-through book follows the website's rules (src/lib/bookLayout.ts, bookLayout.test.mts).
@MainActor
final class BookTests: XCTestCase {
    private func block(_ id: String, _ kind: BookLayout.Kind = .notes(["x"]), lines: Int = 1) -> BookLayout.Block {
        BookLayout.Block(id: id, kind: kind, recipe: nil, lines: lines)
    }

    func testPackingKeepsLabelsWithTheNextLineAndSkipsGapsAtTheTop() {
        let blocks = [block("a", lines: 3), block("gap", .gap), block("label", .dirLabel), block("b", lines: 1), block("c", lines: 2)]
        let pages = BookLayout.pack(blocks, capacity: 5, continued: block("cont", .continued))
        XCTAssertEqual(pages.map { $0.map(\.id) }, [["a", "gap"], ["cont", "label", "b", "c"]])
    }

    func testABlockTallerThanAPageStillGetsAPage() {
        let pages = BookLayout.pack([block("a", lines: 2), block("huge", lines: 9)], capacity: 5)
        XCTAssertEqual(pages.map { $0.map(\.id) }, [["a"], ["huge"]])
    }

    func testWrapping() {
        let font = UIFont.systemFont(ofSize: 20)
        let lines = BookLayout.wrap("whisk together coconut milk, mayo, lime juice, lime zest, sriracha", font: font, width: 200)
        XCTAssertGreaterThan(lines.count, 1)
        for l in lines { XCTAssertLessThanOrEqual((l as NSString).size(withAttributes: [.font: font]).width, 200) }
        XCTAssertEqual(lines.joined(separator: " "), "whisk together coconut milk, mayo, lime juice, lime zest, sriracha")
        XCTAssertEqual(BookLayout.wrap("", font: font, width: 200), [""])
    }

    func testPageSizes() {
        let portrait = BookLayout.Geometry(width: 800, height: 1000)
        XCTAssertFalse(portrait.spread)
        XCTAssertEqual(portrait.pageW / portrait.pageH, BookLayout.aspect, accuracy: 0.01)
        XCTAssertTrue((18...30).contains(portrait.lines))
        let landscape = BookLayout.Geometry(width: 1300, height: 760)
        XCTAssertTrue(landscape.spread)
        XCTAssertLessThanOrEqual(landscape.pageW * 2 + BookLayout.tabWidth, 1300)
    }

    func testTheBook() {
        func recipe(_ title: String, _ category: String, steps: Int) -> Recipe {
            let r = Recipe(id: title)
            r.title = title
            r.category = category
            r.ingredientGroups = [IngredientGroup(name: "", items: (1...6).map { Ingredient(quantity: "1", unit: "c", item: "thing \($0)") })]
            r.stepGroups = (1...steps).map { StepGroup(title: "step \($0) with a fairly long line of words to wrap", steps: ["a sub-step"]) }
            return r
        }
        let recipes = [recipe("pumpkin cake", "desserts", steps: 2), recipe("sweet chili chicken", "mains", steps: 3),
                       recipe("long stew", "mains", steps: 30)]
        let g = BookLayout.Geometry(width: 800, height: 1000)
        let book = BookLayout.pages(recipes, g)
        XCTAssertEqual(book.pages[0].kind, .cover)
        XCTAssertEqual(book.pages[1].kind, .contents)
        // Mains first, by title; desserts after.
        let order = book.pages.compactMap { $0.first ? $0.recipe?.title : nil }
        XCTAssertEqual(order, ["long stew", "sweet chili chicken", "pumpkin cake"])
        // The long recipe continues on more pages, each starting "(continued)".
        let stew = book.pages.filter { $0.recipe?.title == "long stew" }
        XCTAssertGreaterThan(stew.count, 1)
        for p in stew.dropFirst() { XCTAssertEqual(p.blocks.first?.kind, .continued) }
        // No page holds more lines than it has.
        for p in book.pages { XCTAssertLessThanOrEqual(p.blocks.reduce(0) { $0 + $1.lines }, g.capacity) }
        XCTAssertEqual(book.firstPage["pumpkin cake"], book.pages.firstIndex { $0.recipe?.title == "pumpkin cake" })

        // An open book: an empty inside cover first, and whole spreads.
        let open = BookLayout.pages(recipes, BookLayout.Geometry(width: 1300, height: 760))
        XCTAssertEqual(open.leaves.first, .some(nil))
        XCTAssertEqual(open.leaves.count % 2, 0)
    }
}
