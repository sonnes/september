import AppKit
import Testing

@testable import September

@Suite("AppTheme")
struct AppThemeTests {

    @Test("All cases exist")
    func allCases() {
        #expect(AppTheme.allCases.count == 3)
        #expect(AppTheme.allCases.contains(.light))
        #expect(AppTheme.allCases.contains(.dark))
        #expect(AppTheme.allCases.contains(.system))
    }

    @Test("Light theme returns aqua appearance")
    func lightAppearance() {
        let appearance = AppTheme.light.nsAppearance
        #expect(appearance != nil)
        #expect(appearance?.name == .aqua)
    }

    @Test("Dark theme returns darkAqua appearance")
    func darkAppearance() {
        let appearance = AppTheme.dark.nsAppearance
        #expect(appearance != nil)
        #expect(appearance?.name == .darkAqua)
    }

    @Test("System theme returns nil appearance")
    func systemAppearance() {
        #expect(AppTheme.system.nsAppearance == nil)
    }

    @Test("Labels are human-readable")
    func labels() {
        #expect(AppTheme.light.label == "Light")
        #expect(AppTheme.dark.label == "Dark")
        #expect(AppTheme.system.label == "System")
    }

    @Test("Icons are SF Symbol names")
    func icons() {
        #expect(AppTheme.light.icon == "sun.max")
        #expect(AppTheme.dark.icon == "moon")
        #expect(AppTheme.system.icon == "circle.lefthalf.filled")
    }
}
