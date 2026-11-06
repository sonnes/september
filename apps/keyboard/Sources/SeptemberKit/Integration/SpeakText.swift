import Foundation

/// What Speak reads in Type mode: the selection of the field, or the whole
/// field when nothing is selected.
public struct SpeakText: Equatable, Sendable {
    /// The text that the voice reads.
    public let text: String
    /// The text of the bar when Speak was pressed.
    public let source: String
    /// Where `text` starts in `source`, in UTF-16 units.
    public let offset: Int

    /// `nil` when there is nothing to read: a password field, private text,
    /// or an empty bar.
    public init?(input: InputMirror, isPrivate: Bool) {
        guard !isPrivate else { return nil }
        let text: String
        let offset: Int
        switch input {
        case .secure:
            return nil
        case .local(let typed):
            text = typed
            offset = 0
        case .mirrored(let field, let caret, let selectionLength):
            if selectionLength > 0 {
                text = InputMirror.split(field, caret: caret, selectionLength: selectionLength).selected
                offset = caret
            } else {
                text = field
                offset = 0
            }
        }
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        self.text = text
        self.source = input.text
        self.offset = offset
    }

    /// The current word of the voice, moved to its place in the bar. `nil`
    /// when the bar no longer holds the text that Speak read.
    public func word(_ word: NSRange?, in bar: String) -> NSRange? {
        guard let word, bar == source else { return nil }
        return NSRange(location: word.location + offset, length: word.length)
    }
}
