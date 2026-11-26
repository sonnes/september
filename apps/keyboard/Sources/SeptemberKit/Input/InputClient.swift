import Foundation

/// The text of the focused field through the input method of the keyboard,
/// as `IMKTextInput` gives it. The app wraps each client of InputMethodKit.
/// The tests use a client in memory.
///
/// Offsets are UTF-16 units, as in the accessibility API.
@MainActor
public protocol InputClient: AnyObject {
    var bundleIdentifier: String? { get }
    /// The length of the field. Some apps give 0, and some give a huge value
    /// with no text.
    var length: Int { get }
    var selectedRange: NSRange { get }
    /// The text of `range`, and the range that the client gave.
    func string(from range: NSRange) -> (text: String, range: NSRange)?
    /// Replaces `range` with `text`.
    func insert(_ text: String, replacing range: NSRange)
}

/// The text of a field as an input client gives it: the whole field, or a
/// window around the caret.
public struct FieldSnapshot: Equatable, Sendable {
    public var text: String
    /// The offset of `text` in the field.
    public var start: Int
    /// The selection, in field offsets.
    public var selection: NSRange
    /// The length of the field, or `nil` when the client gives none.
    public var length: Int?

    public init(text: String, start: Int, selection: NSRange, length: Int?) {
        self.text = text
        self.start = start
        self.selection = selection
        self.length = length
    }

    /// The field that the input bar mirrors. The selection is in the offsets
    /// of `text`.
    public func focusedField(appName: String?, role: String, subrole: String?) -> FocusedField {
        FocusedField(
            appName: appName, role: role, subrole: subrole, isEditable: true, isSecure: false, text: text,
            selection: NSRange(location: selection.location - start, length: selection.length))
    }
}

/// Reads a snapshot of a field, with the rules of the Apple Accessibility
/// Keyboard (`+[ACAPAssistiveTypingClient documentStringForTextInput:…]`).
public enum FieldSnapshotReader {
    /// The characters on each side of the caret when the client gives no
    /// length.
    public static let window = 100
    /// A length that no real field has. System Settings and some web views
    /// give `Int32.max` with no text.
    static let noLength = Int(Int32.max)

    /// The snapshot, or `nil` when the client has no usable text.
    @MainActor
    public static func read(_ client: InputClient) -> FieldSnapshot? {
        let selection = client.selectedRange
        let length = client.length
        guard selection.location != NSNotFound, length >= 0, length < noLength else { return nil }
        let range =
            length > 0
            ? NSRange(location: 0, length: length)
            : NSRange(
                location: max(0, selection.location - window),
                length: min(selection.location, window) + selection.length + window)
        guard let read = client.string(from: range) else {
            return length == 0 && selection.location == 0
                ? FieldSnapshot(text: "", start: 0, selection: selection, length: 0) : nil
        }
        // The password dialog of macOS gives NUL characters.
        guard !read.text.contains("\0") else { return nil }
        return FieldSnapshot(
            text: read.text, start: read.range.location, selection: selection, length: length > 0 ? length : nil)
    }
}

/// Changes the text before the caret.
@MainActor
public protocol TextInserting: AnyObject {
    /// Replaces `typed`, the text right before the caret, with `text`. It
    /// returns false, and changes nothing, when the field does not hold
    /// `typed` there or no input client is active.
    func replace(_ typed: String, beforeCaretWith text: String) -> Bool
}

/// Inserts through the input client of the focused field, in one edit, as
/// the Apple Accessibility Keyboard does with `insertText:replacementRange:`.
@MainActor
public final class InputClientInserter: TextInserting {
    private let client: () -> InputClient?
    /// Runs after each insert, so the keyboard reads the field again.
    public var afterInsert: ((InputClient) -> Void)?

    public init(client: @escaping () -> InputClient?) {
        self.client = client
    }

    public func replace(_ typed: String, beforeCaretWith text: String) -> Bool {
        guard let client = client() else { return false }
        let caret = client.selectedRange
        let count = typed.utf16.count
        guard caret.location != NSNotFound, caret.length == 0, caret.location >= count else { return false }
        let range = NSRange(location: caret.location - count, length: count)
        if count > 0 {
            guard client.string(from: range)?.text == typed else { return false }
        }
        client.insert(text, replacing: range)
        afterInsert?(client)
        return true
    }
}
