import Combine
import Foundation

/// Counts the presses of each panel button in each app, and ranks the buttons
/// by use.
///
/// A press loses half its weight in `halfLife`. The ranked order is a snapshot
/// that changes only in `appActivated(_:)`, so a button never moves while the
/// user aims at it. The file holds button IDs and weights, never typed text.
@MainActor
public final class UsageStore: ObservableObject {
    public static let halfLife: TimeInterval = 14 * 24 * 60 * 60

    /// `~/Library/Application Support/September Keyboard/usage.json`.
    public static var defaultURL: URL {
        URL.applicationSupportDirectory
            .appendingPathComponent("September Keyboard")
            .appendingPathComponent("usage.json")
    }

    /// The weight of one button at the time of its last press.
    private struct Count: Codable {
        var weight: Double
        var updated: Date
    }

    private struct File: Codable {
        var apps: [String: [String: Count]]
    }

    private let fileURL: URL
    private let now: () -> Date
    private var apps: [String: [String: Count]]
    /// The weights of each app when it last came to the front.
    private var snapshots: [String: [String: Double]] = [:]

    public init(fileURL: URL = UsageStore.defaultURL, now: @escaping () -> Date = Date.init) {
        self.fileURL = fileURL
        self.now = now
        let data = try? Data(contentsOf: fileURL)
        apps = data.flatMap { try? JSONDecoder().decode(File.self, from: $0) }?.apps ?? [:]
    }

    /// Counts one press of a button.
    public func record(buttonID: String, bundleID: String) {
        let weight = weight(buttonID: buttonID, bundleID: bundleID)
        apps[bundleID, default: [:]][buttonID] = Count(weight: weight + 1, updated: now())
        save()
    }

    /// The weight of a button now: each press counts 1, less its decay.
    public func weight(buttonID: String, bundleID: String) -> Double {
        guard let count = apps[bundleID]?[buttonID] else { return 0 }
        let age = max(now().timeIntervalSince(count.updated), 0)
        return count.weight * pow(0.5, age / UsageStore.halfLife)
    }

    /// Takes a new snapshot of the weights of the app. Call it when the app
    /// comes to the front.
    public func appActivated(_ bundleID: String) {
        let ids = apps[bundleID].map { Array($0.keys) } ?? []
        snapshots[bundleID] = Dictionary(
            uniqueKeysWithValues: ids.map { ($0, weight(buttonID: $0, bundleID: bundleID)) })
    }

    /// The panel with its buttons by weight at the last `appActivated(_:)`,
    /// cut to the 12 slots of the grid. Equal weights keep the order of the
    /// file.
    public func ranked(panel: PanelDefinition, bundleID: String?) -> PanelDefinition {
        let weights = bundleID.flatMap { snapshots[$0] } ?? [:]
        let order = panel.buttons.enumerated().sorted { left, right in
            let a = weights[left.element.id] ?? 0
            let b = weights[right.element.id] ?? 0
            return a != b ? a > b : left.offset < right.offset
        }
        return panel.with(buttons: AppPanelLayout.fitting(order.map(\.element)))
    }

    /// One row of the most-used list in Settings.
    public struct Usage: Equatable, Sendable {
        public let button: PanelButton
        /// The presses, less their decay, rounded.
        public let uses: Int
    }

    /// The pressed buttons of the panel by their weight now, most used first.
    public func mostUsed(panel: PanelDefinition, bundleID: String) -> [Usage] {
        panel.buttons
            .map { (button: $0, weight: weight(buttonID: $0.id, bundleID: bundleID)) }
            .filter { $0.weight >= 0.5 }
            .sorted { $0.weight > $1.weight }
            .map { Usage(button: $0.button, uses: Int($0.weight.rounded())) }
    }

    /// The apps with counts.
    public var bundleIDs: Set<String> { Set(apps.keys) }

    /// Forgets the counts of one app.
    public func reset(bundleID: String) {
        apps[bundleID] = nil
        snapshots[bundleID] = nil
        save()
    }

    private func save() {
        objectWillChange.send()
        do {
            try FileManager.default.createDirectory(
                at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONEncoder().encode(File(apps: apps)).write(to: fileURL, options: .atomic)
        } catch {
            // The counts only order the buttons. A failed save loses a little
            // order and nothing else.
        }
    }
}
