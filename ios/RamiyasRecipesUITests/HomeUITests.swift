import XCTest

// Taps through the app like a person would.
final class HomeUITests: XCTestCase {
    func testShelfAndBookSwitch() {
        let app = XCUIApplication()
        app.launch()
        let book = app.buttons["Book"]
        XCTAssertTrue(book.waitForExistence(timeout: 10))
        book.tap()
        XCTAssertTrue(app.staticTexts["contents"].waitForExistence(timeout: 5) || app.buttons["Next page"].waitForExistence(timeout: 5))
        let shelf = app.buttons["Shelf"]
        print("SHELF hittable:", shelf.isHittable, shelf.frame)
        shelf.tap()
        XCTAssertTrue(app.staticTexts["Recently added"].waitForExistence(timeout: 5), "still on the book after tapping Shelf")
    }
}
