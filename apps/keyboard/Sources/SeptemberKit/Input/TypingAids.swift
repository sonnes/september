import Foundation

/// The typing aids of the Apple Accessibility Keyboard: a space after a
/// mark, the removal of that space before the next mark, smart quotes, and
/// Shift at the start of a sentence (`ACAPAssistiveTypingController`).
///
/// The rules are pure. The keyboard gives the text before the caret and the
/// typed text, and gets a plan back.
public struct TypingAids: Equatable, Sendable {
    /// Shift latches at the start of a sentence.
    public var autoShift = true
    /// A space follows a mark, and goes away before the next mark.
    public var autoSpace = true
    /// Straight quotes become smart quotes.
    public var smartQuotes = true

    public init() {}

    /// All aids off.
    public static var off: TypingAids {
        var aids = TypingAids()
        aids.autoShift = false
        aids.autoSpace = false
        aids.smartQuotes = false
        return aids
    }

    /// What the keyboard types for one typed character.
    public struct Plan: Equatable, Sendable {
        /// The characters before the caret that go first.
        public var deleteBefore: Int
        /// The text to type.
        public var text: String
        /// True when `text` ends with a space that the keyboard added.
        public var addsSpace: Bool

        public init(deleteBefore: Int, text: String, addsSpace: Bool) {
            self.deleteBefore = deleteBefore
            self.text = text
            self.addsSpace = addsSpace
        }
    }

    /// The marks that get a space after them.
    static let spacedMarks: Set<Character> = [".", ",", ";", ":", "?", "!"]
    /// The characters that remove a space that the keyboard added.
    static let closers: Set<Character> = [".", ",", ";", ":", "?", "!", ")", "]", "}", "'", "\"", "\u{2019}", "\u{201D}"]
    static let openers: Set<Character> = ["(", "[", "{", "\u{201C}", "\u{2018}", "-", "/"]

    /// The plan for `typed`, after the text `before` the caret.
    /// `autoSpaceBefore` is true when the last character of `before` is a
    /// space that the keyboard added.
    public func plan(typing typed: String, before: String, autoSpaceBefore: Bool) -> Plan {
        var deleteBefore = 0
        var before = before
        if autoSpace, autoSpaceBefore, before.last == " ", let first = typed.first,
            Self.closers.contains(first) || first.isNumber
        {
            deleteBefore = 1
            before.removeLast()
        }
        var text = typed
        if smartQuotes, typed == "\"" || typed == "'" {
            text = quote(typed == "\"", opens: opensQuote(after: before.last))
        }
        var addsSpace = false
        if autoSpace, typed.count == 1, let mark = typed.first, Self.spacedMarks.contains(mark),
            !isInToken(before)
        {
            text += " "
            addsSpace = true
        }
        return Plan(deleteBefore: deleteBefore, text: text, addsSpace: addsSpace)
    }

    /// True when the next letter starts a sentence: in an empty field, after a
    /// line break, and after an end mark and a space.
    public func startsSentence(before: String) -> Bool {
        if before.isEmpty || before.last?.isNewline == true { return true }
        guard before.last == " " else { return false }
        let trimmed = before.trimmingCharacters(in: .whitespaces)
        guard let mark = trimmed.last else { return true }
        return mark == "." || mark == "?" || mark == "!"
    }

    private func opensQuote(after previous: Character?) -> Bool {
        guard let previous else { return true }
        return previous.isWhitespace || Self.openers.contains(previous)
    }

    private func quote(_ double: Bool, opens: Bool) -> String {
        switch (double, opens) {
        case (true, true): "\u{201C}"
        case (true, false): "\u{201D}"
        case (false, true): "\u{2018}"
        case (false, false): "\u{2019}"
        }
    }

    /// True when the caret is inside a number, an email address, or a URL,
    /// where a mark gets no space.
    private func isInToken(_ before: String) -> Bool {
        guard let last = before.last, !last.isWhitespace else { return false }
        if last.isNumber { return true }
        let token = before.split(whereSeparator: \.isWhitespace).last.map(String.init) ?? ""
        return token.contains("@") || token.contains("://") || token.lowercased().hasPrefix("www.")
    }
}
