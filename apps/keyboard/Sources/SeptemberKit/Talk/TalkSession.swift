import Combine
import Foundation

/// The text of Talk mode: the bar that the keys type into, and the Said list.
///
/// The bar keeps its text during speech. When the speech ends, the bar is
/// empty again. If the user stops the speech, the text stays in the bar.
@MainActor
public final class TalkSession: ObservableObject {
    @Published public private(set) var text = ""
    /// The Talk history.
    public let said: SaidList
    /// The voice that speaks the bar and the Said list.
    public var speech: (any SpeechOutput)?
    /// The Return key speaks the bar. Settings turns it off.
    public var returnSpeaks = true
    /// Called before the bar is spoken, because speaking submits the text.
    public var onSpeak: (() -> Void)?

    /// The text that is in speech now and that leaves the bar when the speech
    /// ends.
    private var speaking: String?

    public init(said: SaidList = SaidList()) {
        self.said = said
    }

    // MARK: - Keys

    /// Types one key into the bar. A chord (⌘C) does nothing, because Talk
    /// mode sends no events to the app in front.
    public func press(_ key: KeyDefinition, modifiers: inout ModifierState) {
        switch key.action {
        case .modifier(let modifier):
            modifiers.tap(modifier)
            return
        case .character(let character):
            let chord = modifiers.active.subtracting([.shift, .capsLock])
            if chord.isEmpty {
                if modifiers.active.contains(.shift), let secondary = key.secondaryLabel {
                    text += secondary
                } else {
                    text += modifiers.apply(to: character)
                }
            }
        case .virtual(let virtual):
            switch virtual {
            case .delete: text = String(text.dropLast())
            case .space: text += " "
            case .return where returnSpeaks: speak()
            default: break
            }
        }
        modifiers.consume()
    }

    /// A panel button in Talk mode. A phrase goes into the bar. A shortcut
    /// does nothing.
    public func perform(_ action: PanelAction, modifiers: inout ModifierState) {
        switch action {
        case .text(let phrase): insert(phrase)
        default: break
        }
        modifiers.consume()
    }

    /// Adds a phrase to the bar, with a space before it when the bar holds a
    /// word.
    public func insert(_ phrase: String) {
        if let last = text.last, !last.isWhitespace { text += " " }
        text += phrase
    }

    /// Adds text to the bar as it is, such as the rest of a predicted word.
    public func type(_ typed: String) {
        text += typed
    }

    /// Replaces the last character of the bar, such as a letter with one of
    /// its accents.
    public func replaceLast(with typed: String) {
        text = String(text.dropLast()) + typed
    }

    public func clear() {
        text = ""
        speaking = nil
    }

    // MARK: - Speech

    /// Speaks the bar and adds it to the Said list. An empty bar does nothing.
    public func speak() {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        onSpeak?()
        speaking = text
        said.add(text)
        speech?.speak(text)
    }

    /// Speaks a line of the Said list again. The bar does not change.
    public func sayAgain(_ line: SaidLine) {
        speaking = nil
        said.markCurrent(line.id)
        speech?.speak(line.text)
    }

    /// Ends the speech. The text stays in the bar.
    public func stop() {
        speaking = nil
        speech?.stop()
    }

    /// Call this when the voice goes back to idle. If the bar still holds the
    /// text that was spoken, the bar becomes empty.
    public func speechEnded() {
        if let speaking, speaking == text { text = "" }
        speaking = nil
    }
}
