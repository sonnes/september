import AppKit
import SwiftUI

extension Color {
    public init(_ token: RGBA) {
        self.init(
            .sRGB,
            red: token.red,
            green: token.green,
            blue: token.blue,
            opacity: token.alpha
        )
    }

    /// Resolves against whatever appearance the view is drawn in, so the
    /// keyboard follows the system light/dark setting with no state of its own.
    public init(_ token: ThemeColor) {
        self.init(nsColor: NSColor(token))
    }
}

extension NSColor {
    public convenience init(_ token: RGBA) {
        self.init(srgbRed: token.red, green: token.green, blue: token.blue, alpha: token.alpha)
    }

    public convenience init(_ token: ThemeColor) {
        self.init(name: nil) { appearance in
            let isDark = appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
            return NSColor(token.resolved(dark: isDark))
        }
    }
}
