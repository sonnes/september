import Foundation

func packagingTests() {
    test("app bundle is named Keyboard") {
        let plistURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            .appendingPathComponent("Resources/Info.plist")
        let data = try Data(contentsOf: plistURL)
        let plist = try PropertyListSerialization.propertyList(from: data, format: nil)
        let values = plist as? [String: Any]

        expectEqual(values?["CFBundleName"] as? String, "Keyboard")
        expectEqual(values?["CFBundleDisplayName"] as? String, "Keyboard")
        expectEqual(values?["CFBundleExecutable"] as? String, "Keyboard")
        expectEqual(values?["CFBundleIdentifier"] as? String, "com.september.keyboard")
    }

    test("makefile packages Keyboard artifacts") {
        let makefileURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            .appendingPathComponent("Makefile")
        let makefile = try String(contentsOf: makefileURL, encoding: .utf8)

        expect(makefile.contains("APP := $(BUILD_DIR)/Keyboard.app"))
        expect(makefile.contains("DMG := $(BUILD_DIR)/Keyboard.dmg"))
        expect(
            makefile.range(of: #"(?m)^dmg: app$"#, options: .regularExpression) != nil,
            "expected a dmg target that builds the app first"
        )
        expect(makefile.contains("hdiutil create"), "expected the dmg target to create a disk image")
    }

    test("root makefile exposes the keyboard DMG command") {
        let makefileURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            .appendingPathComponent("../../Makefile")
            .standardizedFileURL
        let makefile = try String(contentsOf: makefileURL, encoding: .utf8)

        expect(
            makefile.range(of: #"(?m)^keyboard-dmg:$"#, options: .regularExpression) != nil,
            "expected a keyboard-dmg target"
        )
    }
}
