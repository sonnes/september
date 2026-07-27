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
}
