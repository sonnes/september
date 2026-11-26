import Foundation
import SeptemberKit

/// An input client in memory, as an app gives it to the input method.
@MainActor
final class MemoryInputClient: InputClient {
    var text: String
    var selectedRange: NSRange
    var reportedLength: Int?
    var bundleIdentifier: String? = "com.apple.TextEdit"
    private(set) var inserts: [(text: String, range: NSRange)] = []

    init(_ text: String, caret: Int? = nil) {
        self.text = text
        selectedRange = NSRange(location: caret ?? text.utf16.count, length: 0)
    }

    var length: Int { reportedLength ?? text.utf16.count }

    func string(from range: NSRange) -> (text: String, range: NSRange)? {
        let whole = text as NSString
        let start = max(0, min(range.location, whole.length))
        let end = max(start, min(range.location + range.length, whole.length))
        let actual = NSRange(location: start, length: end - start)
        return (whole.substring(with: actual), actual)
    }

    func insert(_ inserted: String, replacing range: NSRange) {
        inserts.append((inserted, range))
        text = (text as NSString).replacingCharacters(in: range, with: inserted)
        selectedRange = NSRange(location: range.location + inserted.utf16.count, length: 0)
    }
}

@MainActor
func inputClientTests() {
    test("the reader gives the whole field and its caret when the client gives a length") {
        let client = MemoryInputClient("See you soon", caret: 7)
        let snapshot = try expectValue(FieldSnapshotReader.read(client))
        expectEqual(snapshot, FieldSnapshot(text: "See you soon", start: 0, selection: NSRange(location: 7, length: 0), length: 12))
    }

    test("the reader gives 100 characters around the caret when the client gives a length of 0") {
        let long = String(repeating: "a", count: 300)
        let client = MemoryInputClient(long, caret: 150)
        client.reportedLength = 0
        let snapshot = try expectValue(FieldSnapshotReader.read(client))
        expectEqual(snapshot.start, 50)
        expectEqual(snapshot.text.count, 200)
        expect(snapshot.length == nil)
    }

    test("a client with no caret, or with the length of no text, gives no snapshot") {
        let none = MemoryInputClient("x")
        none.selectedRange = NSRange(location: NSNotFound, length: NSNotFound)
        expect(FieldSnapshotReader.read(none) == nil)
        let huge = MemoryInputClient("x")
        huge.reportedLength = Int(Int32.max)
        expect(FieldSnapshotReader.read(huge) == nil)
    }

    test("a client that gives NUL characters, as the password dialog of macOS does, gives no snapshot") {
        let dialog = MemoryInputClient(String(repeating: "\0", count: 8))
        expect(FieldSnapshotReader.read(dialog) == nil)
    }

    test("a snapshot of a window becomes a field with the caret inside the window") {
        let snapshot = FieldSnapshot(text: "hello world", start: 40, selection: NSRange(location: 45, length: 0), length: nil)
        let field = snapshot.focusedField(appName: "Notes", role: "AXTextArea", subrole: nil)
        expectEqual(field.text, "hello world")
        expectEqual(field.selection, NSRange(location: 5, length: 0))
        expect(!field.isSecure)
    }

    test("the inserter replaces the typed word before the caret in one edit") {
        let client = MemoryInputClient("I recieve")
        let inserter = InputClientInserter(client: { client })
        expect(inserter.replace("recieve", beforeCaretWith: "receive "))
        expectEqual(client.text, "I receive ")
        expectEqual(client.inserts.count, 1)
        expectEqual(client.inserts.first?.range, NSRange(location: 2, length: 7))
    }

    test("the inserter refuses when the field does not hold the typed word, or has no client") {
        let client = MemoryInputClient("I recieve")
        let inserter = InputClientInserter(client: { client })
        expect(!inserter.replace("relieve", beforeCaretWith: "receive "))
        expect(client.inserts.isEmpty)
        expect(!InputClientInserter(client: { nil }).replace("a", beforeCaretWith: "b"))
    }
}
