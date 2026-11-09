import Combine
import Foundation

/// Counts the presses of each button of My Panel. My Panel ranks its buttons
/// by these counts.
///
/// A press loses half its weight in `halfLife`. The file holds button IDs and
/// weights, never typed text.
@MainActor
public final class UsageStore: ObservableObject, ButtonUsage {
    public static let halfLife: TimeInterval = 14 * 24 * 60 * 60

    /// `~/Library/Application Support/September Keyboard/my-panel-usage.json`.
    public static var defaultURL: URL {
        URL.applicationSupportDirectory
            .appendingPathComponent("September Keyboard")
            .appendingPathComponent("my-panel-usage.json")
    }

    /// The weight of one button at the time of its last press.
    private struct Count: Codable {
        var weight: Double
        var updated: Date
    }

    /// The file keeps the counts under the key `my-panel`.
    private struct File: Codable {
        var apps: [String: [String: Count]]
    }

    private static let key = "my-panel"

    private let fileURL: URL
    private let now: () -> Date
    private var counts: [String: Count]

    public init(fileURL: URL = UsageStore.defaultURL, now: @escaping () -> Date = Date.init) {
        self.fileURL = fileURL
        self.now = now
        let data = try? Data(contentsOf: fileURL)
        let file = data.flatMap { try? JSONDecoder().decode(File.self, from: $0) }
        counts = file?.apps[UsageStore.key] ?? [:]
    }

    /// Counts one press of a button.
    public func record(_ buttonID: String) {
        counts[buttonID] = Count(weight: weight(of: buttonID) + 1, updated: now())
        save()
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

    private func save() {
        objectWillChange.send()
        do {
            try FileManager.default.createDirectory(
                at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONEncoder().encode(File(apps: [UsageStore.key: counts])).write(to: fileURL, options: .atomic)
        } catch {
            // The counts only order the buttons. A failed save loses a little
            // order and nothing else.
        }
    }
}
