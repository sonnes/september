import Foundation
import SeptemberKit

@MainActor
func clipboardTests() {
    historyTests()
    watcherTests()
}

private let now = Date(timeIntervalSince1970: 1_800_000_000)

private func historyFile() -> URL {
    temporaryDirectory().appendingPathComponent("clipboard-history.json")
}

private func memoryDefaults() -> UserDefaults {
    UserDefaults(suiteName: "kit-clipboard-\(UUID().uuidString)")!
}

@MainActor
private func historyTests() {
    test("the clipboard history keeps the newest copy first") {
        let history = ClipboardHistory(defaults: memoryDefaults(), now: { now })
        history.add("Ward 7, bed 12")
        history.add("14 Elm Road")
        expectEqual(history.items.map(\.text), ["14 Elm Road", "Ward 7, bed 12"])
    }

    test("a copy that is already in the history moves to the newest place") {
        var clock = now
        let history = ClipboardHistory(defaults: memoryDefaults(), now: { clock })
        history.add("Ward 7, bed 12")
        history.add("14 Elm Road")
        clock = now.addingTimeInterval(60)
        history.add("Ward 7, bed 12")
        expectEqual(history.items.map(\.text), ["Ward 7, bed 12", "14 Elm Road"])
        expectEqual(history.items.first?.date, clock)
    }

    test("the clipboard history skips empty and blank copies") {
        let history = ClipboardHistory(defaults: memoryDefaults(), now: { now })
        history.add("")
        history.add("  \n\t ")
        expect(history.items.isEmpty)
    }

    test("the clipboard history keeps its texts across launches") {
        let url = historyFile()
        let history = ClipboardHistory(fileURL: url, defaults: memoryDefaults(), now: { now })
        history.add("Ward 7, bed 12")
        history.add("14 Elm Road")
        let again = ClipboardHistory(fileURL: url, defaults: memoryDefaults(), now: { now })
        expectEqual(again.items, history.items)
    }

    test("the clipboard history drops texts older than 7 days and keeps the newest 200") {
        var clock = now.addingTimeInterval(-8 * 24 * 3600)
        let url = historyFile()
        let history = ClipboardHistory(fileURL: url, defaults: memoryDefaults(), now: { clock })
        history.add("Last week")
        clock = now
        for index in 0..<205 { history.add("Text \(index)") }
        expectEqual(history.items.count, ClipboardHistory.itemLimit)
        expectEqual(history.items.first?.text, "Text 204")
        expect(!history.items.contains { $0.text == "Last week" })
        expectEqual(
            ClipboardHistory(fileURL: url, defaults: memoryDefaults(), now: { now }).items.count,
            ClipboardHistory.itemLimit)
    }

    test("a text older than 7 days is gone at the next launch") {
        let url = historyFile()
        ClipboardHistory(fileURL: url, defaults: memoryDefaults(), now: { now }).add("Hello")
        let later = now.addingTimeInterval(ClipboardHistory.maxAge + 1)
        expect(ClipboardHistory(fileURL: url, defaults: memoryDefaults(), now: { later }).items.isEmpty)
    }

    test("the clipboard history file is readable only by the user") {
        let url = historyFile()
        ClipboardHistory(fileURL: url, defaults: memoryDefaults(), now: { now }).add("Hello")
        let permissions = try FileManager.default.attributesOfItem(atPath: url.path)[.posixPermissions] as? Int
        expectEqual(permissions, 0o600)
    }

    test("a broken clipboard history file is moved aside, not overwritten") {
        let url = historyFile()
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data("not json".utf8).write(to: url)
        let history = ClipboardHistory(fileURL: url, defaults: memoryDefaults(), now: { now })
        expect(history.items.isEmpty)
        let aside = url.deletingPathExtension().appendingPathExtension("broken.json")
        expectEqual(try String(contentsOf: aside, encoding: .utf8), "not json")
    }

    test("clearing the clipboard history empties the list and the file") {
        let url = historyFile()
        let history = ClipboardHistory(fileURL: url, defaults: memoryDefaults(), now: { now })
        history.add("Hello")
        history.clear()
        expect(history.items.isEmpty)
        expect(ClipboardHistory(fileURL: url, defaults: memoryDefaults(), now: { now }).items.isEmpty)
    }

    test("the clipboard history is on by default") {
        expect(ClipboardHistory(defaults: memoryDefaults()).isEnabled)
    }

    test("turning the clipboard history off clears it, keeps no copies, and stays off") {
        let url = historyFile()
        let defaults = memoryDefaults()
        let history = ClipboardHistory(fileURL: url, defaults: defaults, now: { now })
        history.add("Hello")
        history.isEnabled = false
        history.add("Goodbye")
        expect(history.items.isEmpty)
        expect(!FileManager.default.fileExists(atPath: url.path))
        expect(!ClipboardHistory(fileURL: url, defaults: defaults, now: { now }).isEnabled)
    }

    test("the clipboard history shows six texts on each page, newest first") {
        let history = ClipboardHistory(defaults: memoryDefaults(), now: { now })
        expectEqual(history.pageCount, 1, "an empty history has one page")
        for index in 0..<13 { history.add("Text \(index)") }
        expectEqual(history.pageCount, 3)
        expectEqual(history.page(0).map(\.text), (7...12).reversed().map { "Text \($0)" })
        expectEqual(history.page(2).map(\.text), ["Text 0"])
        expect(history.page(3).isEmpty)
    }

    test("a copied text shows on one line with a mark at each line break") {
        let item = ClipboardItem(text: "  Dear Dr Patel,\n\nThank you\r\nfor Tuesday \n", date: now)
        expectEqual(item.preview, "Dear Dr Patel, ↵ Thank you ↵ for Tuesday")
    }

    test("a copied text shows its age in the short form of the lists") {
        let item = ClipboardItem(text: "Hello", date: now)
        expectEqual(item.age(at: now.addingTimeInterval(30)), "now")
        expectEqual(item.age(at: now.addingTimeInterval(40 * 60)), "40 min")
        expectEqual(item.age(at: now.addingTimeInterval(3 * 3600)), "3 h")
    }

    test("a description of a copied text never holds the text") {
        let history = ClipboardHistory(defaults: memoryDefaults(), now: { now })
        history.add("my secret address")
        let item = try expectValue(history.items.first)
        expect(!String(describing: item).contains("secret"))
        expect(!String(reflecting: item).contains("secret"))
    }
}

@MainActor
private func watcherTests() {
    func parts(skip: Bool = false) -> (ClipboardWatcher, MemoryPasteboard, ClipboardHistory) {
        let pasteboard = MemoryPasteboard()
        let history = ClipboardHistory(defaults: memoryDefaults(), now: { now })
        let watcher = ClipboardWatcher(pasteboard: pasteboard, history: history, shouldSkip: { skip })
        return (watcher, pasteboard, history)
    }

    test("the watcher adds each new copy of text to the history") {
        let (watcher, pasteboard, history) = parts()
        pasteboard.copy("Ward 7, bed 12")
        watcher.poll()
        watcher.poll()
        pasteboard.copy("14 Elm Road")
        watcher.poll()
        expectEqual(history.items.map(\.text), ["14 Elm Road", "Ward 7, bed 12"])
    }

    test("the watcher does not add the text that was on the clipboard at launch") {
        let pasteboard = MemoryPasteboard()
        pasteboard.copy("Before launch")
        let history = ClipboardHistory(defaults: memoryDefaults(), now: { now })
        let watcher = ClipboardWatcher(pasteboard: pasteboard, history: history)
        watcher.poll()
        expect(history.items.isEmpty)
    }

    test("the watcher skips copies that a password manager marks") {
        let (watcher, pasteboard, history) = parts()
        for type in ClipboardWatcher.skippedTypes {
            pasteboard.copy("hunter2", types: [MemoryPasteboard.textType, type])
            watcher.poll()
        }
        expect(history.items.isEmpty)
    }

    test("the watcher skips a copy of a file and a copy with no text") {
        let (watcher, pasteboard, history) = parts()
        pasteboard.copy("report.pdf", types: [MemoryPasteboard.textType, "public.file-url"])
        watcher.poll()
        pasteboard.copy(nil, types: ["public.png"])
        watcher.poll()
        expect(history.items.isEmpty)
    }

    test("the watcher skips copies while the focused field is private") {
        let (watcher, pasteboard, history) = parts(skip: true)
        pasteboard.copy("hunter2")
        watcher.poll()
        expect(history.items.isEmpty)
    }

    test("the watcher tells the app about each change of the clipboard") {
        let pasteboard = MemoryPasteboard()
        let history = ClipboardHistory(defaults: memoryDefaults(), now: { now })
        var changes = 0
        let watcher = ClipboardWatcher(pasteboard: pasteboard, history: history, onChange: { changes += 1 })
        watcher.poll()
        pasteboard.copy(nil, types: ["public.png"])
        watcher.poll()
        watcher.poll()
        expectEqual(changes, 1)
    }
}
