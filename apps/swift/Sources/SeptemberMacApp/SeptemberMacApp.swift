import SeptemberMac
import SwiftUI

@main
struct SeptemberMacApp: App {
    var body: some Scene {
        WindowGroup("September Keyboard") {
            SeptemberKeyboardView()
                .frame(minWidth: 1020, minHeight: 560)
                .background(Color(red: 244 / 255, green: 244 / 255, blue: 245 / 255))
        }
        .windowResizability(.contentSize)
    }
}
