import Testing

@testable import September

@Suite("KeyboardStyle")
struct KeyboardStyleTests {

    @Test("Dark Rainbow returns distinct colors for each row")
    func darkRainbowDistinctColors() {
        let style = KeyboardStyle.darkRainbow
        var colors: [String] = []
        for row in 0..<6 {
            let color = style.accentColor(forRow: row)
            #expect(color != nil, "Row \(row) should have an accent color")
            colors.append(color.debugDescription)
        }
        let unique = Set(colors)
        #expect(unique.count == 6, "Expected 6 distinct colors, got \(unique.count)")
    }

    @Test("Light Rainbow returns distinct colors for each row")
    func lightRainbowDistinctColors() {
        let style = KeyboardStyle.lightRainbow
        var colors: [String] = []
        for row in 0..<6 {
            let color = style.accentColor(forRow: row)
            #expect(color != nil, "Row \(row) should have an accent color")
            colors.append(color.debugDescription)
        }
        let unique = Set(colors)
        #expect(unique.count == 6, "Expected 6 distinct colors, got \(unique.count)")
    }

    @Test("Dark Mono returns nil for all rows")
    func darkMonoReturnsNil() {
        let style = KeyboardStyle.darkMono
        for row in 0..<6 {
            #expect(style.accentColor(forRow: row) == nil)
        }
    }

    @Test("Light Mono returns nil for all rows")
    func lightMonoReturnsNil() {
        let style = KeyboardStyle.lightMono
        for row in 0..<6 {
            #expect(style.accentColor(forRow: row) == nil)
        }
    }

    @Test("Rainbow returns nil for out-of-range row")
    func rainbowOutOfRange() {
        #expect(KeyboardStyle.darkRainbow.accentColor(forRow: 99) == nil)
        #expect(KeyboardStyle.lightRainbow.accentColor(forRow: 99) == nil)
    }

    @Test("isRainbow flag is correct")
    func isRainbowFlag() {
        #expect(KeyboardStyle.darkRainbow.isRainbow == true)
        #expect(KeyboardStyle.lightRainbow.isRainbow == true)
        #expect(KeyboardStyle.darkMono.isRainbow == false)
        #expect(KeyboardStyle.lightMono.isRainbow == false)
    }

    @Test("All 4 cases exist")
    func allCases() {
        #expect(KeyboardStyle.allCases.count == 4)
    }
}
