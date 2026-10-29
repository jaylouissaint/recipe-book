import SwiftUI

// Colors and fonts from docs/DESIGN.md (the website's globals.css tokens). Light only.
extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(.sRGB, red: Double(hex >> 16 & 0xFF) / 255, green: Double(hex >> 8 & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255, opacity: opacity)
    }

    static let page = Color(hex: 0xFBF8F2)
    static let surface = Color.white
    static let field = Color(hex: 0xF1EEE8)
    static let fg = Color(hex: 0x1C1B19)
    static let muted = Color(hex: 0x77736C)
    static let divider = Color(hex: 0xE8E4DD)
    static let accent = Color(hex: 0x1F4D3D)
    static let ink = Color(hex: 0x7B3F61)

    static let paper = Color(hex: 0xFBF8F2)
    static let rule = Color(hex: 0xDDD8DC)
    static let label = Color(hex: 0x8C8C8C)
    static let mauve = Color(hex: 0x9A8597)
    static let cover = Color(hex: 0xA3174B)
    static let teal = Color(hex: 0x1E5E5E)
    static let tabPink = Color(hex: 0xE6B8AE)
    static let tabBlue = Color(hex: 0x9FB4BF)
    static let tabMustard = Color(hex: 0xDDAA3A)
    static let tabOrange = Color(hex: 0xEE9A78)
    static let ring = Color(hex: 0xB9B9BD)
}

extension Font {
    // Recipe content, in handwriting.
    static func hand(_ size: CGFloat) -> Font { .custom("PatrickHand-Regular", size: size) }
    // Page titles ("Ramiya's Recipes", "My Recipes").
    static func serif(_ size: CGFloat) -> Font { .custom("InstrumentSerif-Regular", size: size) }
    // Interface text.
    static func ui(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        let name = switch weight {
        case .medium: "Figtree-Medium"
        case .semibold: "Figtree-SemiBold"
        case .bold, .heavy, .black: "Figtree-Bold"
        default: "Figtree-Regular"
        }
        return .custom(name, size: size)
    }
    // Book-page labels: "INGREDIENTS", stat box headings, tag names.
    static func label(_ size: CGFloat) -> Font { .custom("Montserrat-SemiBold", size: size) }
    // "recipe:" on the book page.
    static func slab(_ size: CGFloat) -> Font { .custom("ZillaSlab-Light", size: size) }
}

// White rounded cards with the website's soft shadow.
struct CardStyle: ViewModifier {
    var radius: CGFloat = 20
    func body(content: Content) -> some View {
        content
            .background(Color.surface, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 1, y: 1)
            .shadow(color: .black.opacity(0.06), radius: 8, y: 4)
    }
}

extension View {
    func card(radius: CGFloat = 20) -> some View { modifier(CardStyle(radius: radius)) }

    // Small caps labels like the book's "INGREDIENTS".
    func labelCaps(_ size: CGFloat = 11, color: Color = .label) -> some View {
        font(.label(size)).tracking(size * 0.12).textCase(.uppercase).foregroundStyle(color)
    }
}
