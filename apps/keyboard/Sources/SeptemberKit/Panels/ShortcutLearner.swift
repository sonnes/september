import Combine
import Foundation

/// Learns the chords that the user presses on the hardware keyboard. A chord
/// that the user presses `pressesToLearn` times in one app joins the panel of
/// that app.
///
/// Only chords with Command or Control count, so typed text never reaches the
/// learner. The presses before a chord is learned stay in memory. The file
/// holds only the learned chords and their names.
@MainActor
public final class ShortcutLearner: ObservableObject {
    public static let pressesToLearn = 2

    /// `~/Library/Application Support/September Keyboard/learned.json`.
    public static var defaultURL: URL {
        URL.applicationSupportDirectory
            .appendingPathComponent("September Keyboard")
            .appendingPathComponent("learned.json")
    }

    /// Chords that macOS keeps for itself. They never join a panel.
    private static let systemChords: Set<Shortcut> = [
        Shortcut(modifiers: .command, key: .virtual(.tab)),
        Shortcut(modifiers: [.shift, .command], key: .virtual(.tab)),
        Shortcut(modifiers: .command, key: .virtual(.space)),
        Shortcut(modifiers: .control, key: .virtual(.space)),
        Shortcut(modifiers: .command, key: .character("`")),
    ]

    private struct Learned: Codable {
        let label: String
        let modifiers: [String]
        let key: String
    }

    private let fileURL: URL
    private var learned: [String: [Learned]]
    private var presses: [String: [Shortcut: Int]] = [:]

    public init(fileURL: URL = ShortcutLearner.defaultURL) {
        self.fileURL = fileURL
        let data = try? Data(contentsOf: fileURL)
        learned = data.flatMap { try? JSONDecoder().decode([String: [Learned]].self, from: $0) } ?? [:]
    }

    /// True for a chord with Command or Control that macOS does not keep.
    public static func isLearnable(_ chord: Shortcut) -> Bool {
        !chord.modifiers.isDisjoint(with: [.command, .control])
            && !systemChords.contains(chord)
    }

    /// Counts one press of a chord in an app.
    ///
    /// - Parameters:
    ///   - known: the chords that the keypads and the panel already press.
    ///   - name: the name of the chord in the menu bar of the app. The learner
    ///     asks only when the chord joins the panel.
    /// - Returns: the new button, when this press makes the chord join the panel.
    @discardableResult
    public func chordPressed(
        _ chord: Shortcut,
        bundleID: String,
        known: Set<Shortcut>,
        name: (Shortcut) -> String?
    ) -> PanelButton? {
        guard ShortcutLearner.isLearnable(chord), !known.contains(chord),
            !learned(bundleID: bundleID).contains(where: { $0.action == .shortcut(chord) })
        else { return nil }

        let count = presses[bundleID, default: [:]][chord, default: 0] + 1
        guard count >= ShortcutLearner.pressesToLearn else {
            presses[bundleID, default: [:]][chord] = count
            return nil
        }
        presses[bundleID]?[chord] = nil

        let entry = Learned(
            label: name(chord) ?? chord.spokenName,
            modifiers: chord.modifiers.heldKeys.map(\.name),
            key: chord.key.name)
        learned[bundleID, default: []].append(entry)
        save()
        return button(entry)
    }

    /// The learned chords of an app, oldest first, as panel buttons.
    public func learned(bundleID: String) -> [PanelButton] {
        (learned[bundleID] ?? []).compactMap(button)
    }

    /// The apps with learned chords.
    public var bundleIDs: Set<String> { Set(learned.keys) }

    /// Forgets the learned chords and the counted presses of one app.
    public func forget(bundleID: String) {
        learned[bundleID] = nil
        presses[bundleID] = nil
        save()
    }

    private func button(_ entry: Learned) -> PanelButton? {
        guard let modifiers = try? Modifiers(names: entry.modifiers),
            let key = try? Shortcut.Key(name: entry.key)
        else { return nil }
        let id = PanelButton.learnedPrefix + (entry.modifiers + [entry.key]).joined(separator: "-")
        return PanelButton(
            id: id, label: entry.label, symbol: nil,
            action: .shortcut(Shortcut(modifiers: modifiers, key: key)))
    }

    private func save() {
        objectWillChange.send()
        do {
            try FileManager.default.createDirectory(
                at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONEncoder().encode(learned).write(to: fileURL, options: .atomic)
        } catch {
            // A failed save loses the learned chords at the next launch, and
            // nothing else.
        }
    }
}
