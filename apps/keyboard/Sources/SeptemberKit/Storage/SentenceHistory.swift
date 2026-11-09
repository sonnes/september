import Combine
import Foundation
import NaturalLanguage

/// The sentences that the user sent or spoke, in the `sentence` table of the
/// keyboard database.
///
/// Each sentence has one row. A new use of a sentence adds one use to its
/// row and keeps the last form that the user wrote. While the user types,
/// `matches(for:limit:)` gives the sentences that continue the sentence at
/// the caret, best first.
///
/// The sentences are private. Never log or print them. The history is on by
/// default. When the user turns it off, the history removes every sentence
/// and keeps no new ones.
@MainActor
public final class SentenceHistory: ObservableObject {
    /// The most sentences that the history keeps.
    public static let rowLimit = 10_000
    /// A sentence longer than this is not kept. It is usually pasted text.
    public static let maxCharacters = 500
    /// A use loses half its weight in this time.
    public static let halfLife: TimeInterval = 14 * 24 * 3600
    /// The most rows that one search ranks.
    private static let candidateLimit = 200
    private static let enabledKey = "history.sentences"

    /// The count of sentences in the history.
    @Published public private(set) var count = 0
    @Published public var isEnabled: Bool {
        didSet {
            guard isEnabled != oldValue else { return }
            defaults.set(isEnabled, forKey: Self.enabledKey)
            if !isEnabled { clear() }
        }
    }

    private let database: KeyboardDatabase
    private let defaults: UserDefaults
    private let now: () -> Date
    private let limit: Int

    public init(
        database: KeyboardDatabase, defaults: UserDefaults = .standard, now: @escaping () -> Date = Date.init,
        limit: Int = SentenceHistory.rowLimit
    ) {
        self.database = database
        self.defaults = defaults
        self.now = now
        self.limit = limit
        isEnabled = defaults.object(forKey: Self.enabledKey) as? Bool ?? true
        refreshCount()
    }

    /// Splits a submitted text into sentences and keeps each sentence that
    /// holds a letter.
    public func record(_ text: String) {
        guard isEnabled else { return }
        let sentences = Self.sentences(in: text)
            .map(Self.collapsed)
            .filter { $0.contains(where: \.isLetter) && $0.count <= Self.maxCharacters }
        guard !sentences.isEmpty else { return }
        let at = now().timeIntervalSince1970
        try? database.transaction {
            for sentence in sentences {
                try database.execute(
                    """
                    INSERT INTO sentence (text, key, uses, first_at, last_at) VALUES (?, ?, 1, ?, ?)
                    ON CONFLICT (key) DO UPDATE SET text = excluded.text, uses = uses + 1, last_at = excluded.last_at
                    """,
                    [.text(sentence), .text(Self.key(sentence)), .double(at), .double(at)])
            }
            try database.execute(
                "DELETE FROM sentence WHERE id IN (SELECT id FROM sentence ORDER BY last_at DESC LIMIT -1 OFFSET ?)",
                [.int(Int64(limit))])
        }
        refreshCount()
    }

    /// The sentences that continue the sentence at the end of `typed`, best
    /// first. A sentence ranks by its uses, and each use loses half its
    /// weight in `halfLife`. A sentence that `typed` already holds in full is
    /// not a match.
    public func matches(for typed: String, limit: Int = 3) -> [String] {
        guard isEnabled, let fragment = Self.fragment(of: typed) else { return [] }
        let prefix = Self.key(fragment, trimsEnd: false)
        let rows =
            (try? database.query(
                """
                SELECT text, uses, last_at FROM sentence
                WHERE key >= ? AND key < ? AND key != ?
                ORDER BY last_at DESC LIMIT ?
                """,
                [
                    .text(prefix), .text(prefix + "\u{10FFFF}"), .text(Self.key(fragment)),
                    .int(Int64(Self.candidateLimit)),
                ])) ?? []
        let at = now().timeIntervalSince1970
        return rows
            .compactMap { row -> (text: String, score: Double)? in
                guard let text = row[0].text, let uses = row[1].double, let last = row[2].double else { return nil }
                return (text, uses * pow(0.5, max(at - last, 0) / Self.halfLife))
            }
            .sorted { $0.score > $1.score }
            .prefix(limit)
            .map(\.text)
    }

    /// Removes every sentence.
    public func clear() {
        try? database.execute("DELETE FROM sentence")
        refreshCount()
    }

    // MARK: - Text

    /// The sentences of a text, in order.
    static func sentences(in text: String) -> [String] {
        let tokenizer = NLTokenizer(unit: .sentence)
        tokenizer.string = text
        return tokenizer.tokens(for: text.startIndex..<text.endIndex).map { String(text[$0]) }
    }

    /// The sentence that the user types at the end of `typed`, or `nil` when
    /// it holds no letter or when `typed` ends a sentence.
    static func fragment(of typed: String) -> String? {
        // A sentence longer than `maxCharacters` is never a match, so the
        // tokenizer reads only the end of a long text.
        let tail = String(typed.suffix(maxCharacters + 1))
        guard let last = sentences(in: tail).last, last.contains(where: \.isLetter) else { return nil }
        let trimmed = last.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "\"')\u{201D}\u{2019}"))
        if let end = trimmed.last, ".!?\u{2026}".contains(end) { return nil }
        return last
    }

    /// The text with one space between words and no space at the ends.
    private static func collapsed(_ text: String) -> String {
        text.split(whereSeparator: \.isWhitespace).joined(separator: " ")
    }

    /// The form of a sentence that the search compares: lowercased, one
    /// space between words, and a straight apostrophe. A fragment keeps one
    /// space at its end, so that "I would " does not find "I wouldn't".
    private static func key(_ text: String, trimsEnd: Bool = true) -> String {
        let words = collapsed(text.lowercased().replacingOccurrences(of: "\u{2019}", with: "'"))
        let endsWithSpace = !trimsEnd && !words.isEmpty && text.last?.isWhitespace == true
        return endsWithSpace ? words + " " : words
    }

    private func refreshCount() {
        let value = Int((try? database.query("SELECT count(*) FROM sentence"))?.first?.first?.int ?? 0)
        if value != count { count = value }
    }
}
