import Combine
import Foundation

/// Counts the presses of each button of My Panel. My Panel ranks its buttons
/// by these counts.
///
/// A press loses half its weight in `halfLife`. The `button_use` table holds
/// button IDs and weights, never typed text.
@MainActor
public final class UsageStore: ObservableObject, ButtonUsage {
    public static let halfLife: TimeInterval = 14 * 24 * 60 * 60

    /// At launch, a count with a weight below this value is removed.
    public static let minimumWeight = 0.01

    /// The JSON file of the older versions of the keyboard:
    /// `~/Library/Application Support/September Keyboard/my-panel-usage.json`.
    public static var jsonURL: URL {
        URL.applicationSupportDirectory
            .appendingPathComponent("September Keyboard", isDirectory: true)
            .appendingPathComponent("my-panel-usage.json")
    }

    /// The weight of one button at the time of its last press.
    private struct Count: Codable {
        var weight: Double
        var updated: Date
    }

    /// The old JSON file keeps the counts under the key `my-panel`.
    private struct File: Decodable {
        var apps: [String: [String: Count]]
    }

    private static let key = "my-panel"

    private let database: KeyboardDatabase
    private let now: () -> Date
    private var counts: [String: Count] = [:]

    /// Opens the counts on `database`. If `jsonURL` names a JSON file of an
    /// older version, its counts move into the database, and the file is
    /// removed.
    public init(
        database: KeyboardDatabase = try! KeyboardDatabase(path: ":memory:"), importing jsonURL: URL? = nil,
        now: @escaping () -> Date = Date.init
    ) {
        self.database = database
        self.now = now
        if let jsonURL {
            database.importJSON(File.self, from: jsonURL) { file in
                for (buttonID, count) in file.apps[Self.key] ?? [:] {
                    try database.execute(
                        "INSERT OR IGNORE INTO button_use (button_id, weight, updated_at) VALUES (?, ?, ?)",
                        [.text(buttonID), .double(count.weight), .double(count.updated.timeIntervalSince1970)])
                }
            }
        }
        counts = load()
        removeFaded()
    }

    /// Counts one press of a button.
    public func record(_ buttonID: String) {
        let count = Count(weight: weight(of: buttonID) + 1, updated: now())
        counts[buttonID] = count
        objectWillChange.send()
        // The counts only order the buttons. A failed write loses a little
        // order and nothing else.
        try? database.execute(
            "INSERT OR REPLACE INTO button_use (button_id, weight, updated_at) VALUES (?, ?, ?)",
            [.text(buttonID), .double(count.weight), .double(count.updated.timeIntervalSince1970)])
    }

    /// The presses of a button, less their decay, rounded.
    public func uses(of buttonID: String) -> Int {
        Int(weight(of: buttonID).rounded())
    }

    /// The weight of a button now: each press counts 1, less its decay.
    private func weight(of buttonID: String) -> Double {
        guard let count = counts[buttonID] else { return 0 }
        let age = max(now().timeIntervalSince(count.updated), 0)
        return count.weight * pow(0.5, age / UsageStore.halfLife)
    }

    /// Removes the counts whose weight is now below `minimumWeight`.
    private func removeFaded() {
        let faded = counts.keys.filter { weight(of: $0) < Self.minimumWeight }
        guard !faded.isEmpty else { return }
        for buttonID in faded { counts[buttonID] = nil }
        try? database.transaction {
            for buttonID in faded {
                try database.execute("DELETE FROM button_use WHERE button_id = ?", [.text(buttonID)])
            }
        }
    }

    private func load() -> [String: Count] {
        let rows = (try? database.query("SELECT button_id, weight, updated_at FROM button_use")) ?? []
        var counts: [String: Count] = [:]
        for row in rows {
            guard let buttonID = row[0].text, let weight = row[1].double, let at = row[2].double else { continue }
            counts[buttonID] = Count(weight: weight, updated: Date(timeIntervalSince1970: at))
        }
        return counts
    }
}
