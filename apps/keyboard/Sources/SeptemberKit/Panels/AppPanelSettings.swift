import Combine
import Foundation

/// Turns the panel and the learning of each app on or off. Both are on until
/// the user turns them off.
@MainActor
public final class AppPanelSettings: ObservableObject {
    private static let hiddenKey = "appPanels.hidden"
    private static let notLearningKey = "appPanels.notLearning"

    private let defaults: UserDefaults
    /// The apps whose panel is off. They show the generic panel.
    @Published public private(set) var hiddenPanels: Set<String>
    @Published public private(set) var notLearning: Set<String>

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        hiddenPanels = Set(defaults.stringArray(forKey: AppPanelSettings.hiddenKey) ?? [])
        notLearning = Set(defaults.stringArray(forKey: AppPanelSettings.notLearningKey) ?? [])
    }

    public func isPanelOn(_ bundleID: String) -> Bool { !hiddenPanels.contains(bundleID) }

    public func isLearningOn(_ bundleID: String) -> Bool { !notLearning.contains(bundleID) }

    public func setPanelOn(_ isOn: Bool, for bundleID: String) {
        hiddenPanels = toggled(hiddenPanels, bundleID, off: !isOn)
        defaults.set(hiddenPanels.sorted(), forKey: AppPanelSettings.hiddenKey)
    }

    public func setLearningOn(_ isOn: Bool, for bundleID: String) {
        notLearning = toggled(notLearning, bundleID, off: !isOn)
        defaults.set(notLearning.sorted(), forKey: AppPanelSettings.notLearningKey)
    }

    private func toggled(_ set: Set<String>, _ bundleID: String, off: Bool) -> Set<String> {
        off ? set.union([bundleID]) : set.subtracting([bundleID])
    }
}
