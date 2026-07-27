import Foundation

/// What the app in front has focused, as read over the accessibility API.
///
/// Offsets are UTF-16 units because that is what `AXSelectedTextRange` speaks.
public struct FocusedField: Equatable, Sendable {
    public var appName: String
    /// `AXTextField`, `AXTextArea`, `AXComboBox`… — kept for diagnostics.
    public var role: String
    public var isEditable: Bool
    /// A password field. macOS hides its value from us, and we must not keep
    /// one of our own.
    public var isSecure: Bool
    /// `nil` when the app exposes no text at all (Terminal, most canvases).
    public var text: String?
    public var selection: NSRange?

    public init(
        appName: String,
        role: String,
        isEditable: Bool,
        isSecure: Bool,
        text: String?,
        selection: NSRange?
    ) {
        self.appName = appName
        self.role = role
        self.isEditable = isEditable
        self.isSecure = isSecure
        self.text = text
        self.selection = selection
    }

    /// How the input bar should show this field, or `nil` when the field gives
    /// us nothing to show and our own echo has to stand in.
    public var display: InputMirror? {
        if isSecure { return .secure }
        guard isEditable, let text else { return nil }

        let length = text.utf16.count
        // A missing selection means "we do not know" — the caret goes where the
        // next character would land.
        let caret = min(max(0, selection?.location ?? length), length)
        let selectionLength = min(max(0, selection?.length ?? 0), length - caret)
        return .mirrored(text: text, caret: caret, selectionLength: selectionLength)
    }
}

/// What the input bar is showing: the focused field's own text, our echo of
/// what we typed, or nothing at all for a password.
public enum InputMirror: Equatable, Sendable {
    /// No readable field — this is what September itself has typed.
    case local(text: String)
    /// The focused field's text, with its caret and selection.
    case mirrored(text: String, caret: Int, selectionLength: Int)
    /// A password field. Neither mirrored nor echoed.
    case secure

    public var text: String {
        switch self {
        case .local(let text): text
        case .mirrored(let text, _, _): text
        case .secure: ""
        }
    }

    public var isEmpty: Bool {
        if case .secure = self { return true }
        return text.isEmpty
    }

    /// The three runs the bar draws: text before the caret, the selection, and
    /// the rest. Split on UTF-16 offsets, the units the field reports.
    public static func split(
        _ text: String,
        caret: Int,
        selectionLength: Int
    ) -> (before: String, selected: String, after: String) {
        let utf16 = text.utf16
        let start = utf16.index(utf16.startIndex, offsetBy: min(caret, utf16.count))
        let end = utf16.index(start, offsetBy: min(selectionLength, utf16.count - caret))
        // Offsets can land inside a surrogate pair (a caret between the halves
        // of an emoji); String(_:) fails there, so fall back to no split.
        guard
            let before = String(utf16[utf16.startIndex..<start]),
            let selected = String(utf16[start..<end]),
            let after = String(utf16[end..<utf16.endIndex])
        else { return (text, "", "") }
        return (before, selected, after)
    }
}
