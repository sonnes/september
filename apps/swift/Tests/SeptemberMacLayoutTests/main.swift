import SeptemberMac

@main
struct LayoutTestRunner {
    static func main() {
        testDefaultLayoutHasSixRows()
        testLetterRowsMatchANSIQWERTYOrder()
        testKeysHaveAccessibleLabelsAndMinimumTargetSize()
        testSpaceKeyIsTheOnlyPrimaryKey()
    }

    private static func testDefaultLayoutHasSixRows() {
        expect(QWERTYKeyboardLayout.default.rows.count == 6, "default layout should have six rows")
    }

    private static func testLetterRowsMatchANSIQWERTYOrder() {
        let rows = QWERTYKeyboardLayout.default.rows

        expect(rows[2].labels == ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"], "top letter row should match ANSI QWERTY order")
        expect(rows[3].labels == ["Caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Return"], "home row should match ANSI QWERTY order")
        expect(rows[4].labels == ["Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Shift"], "bottom letter row should match ANSI QWERTY order")
    }

    private static func testKeysHaveAccessibleLabelsAndMinimumTargetSize() {
        let keys = QWERTYKeyboardLayout.default.rows.flatMap(\.keys)

        expect(!keys.isEmpty, "layout should include keys")
        expect(keys.allSatisfy { !$0.accessibilityLabel.isEmpty }, "all keys should have accessibility labels")
        expect(keys.allSatisfy { $0.size.width >= 44 && $0.size.height >= 44 }, "all keys should meet the 44x44 minimum target")
    }

    private static func testSpaceKeyIsTheOnlyPrimaryKey() {
        let primaryKeys = QWERTYKeyboardLayout.default.rows
            .flatMap(\.keys)
            .filter { $0.role == .primary }

        expect(primaryKeys.map(\.label) == ["Space"], "space key should be the only primary key")
    }

    private static func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
        if !condition() {
            fatalError(message)
        }
    }
}

private extension KeyboardRow {
    var labels: [String] {
        keys.map(\.label)
    }
}
