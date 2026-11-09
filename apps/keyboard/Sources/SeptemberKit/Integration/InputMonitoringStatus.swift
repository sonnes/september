import AppKit
import Combine

/// Whether macOS lets the keyboard listen to the modifier keys of the
/// hardware keyboard, for the shortcut suggestions. The app sets `isAllowed`
/// from the event tap. Nothing here asks for the permission at launch.
@MainActor
public final class InputMonitoringStatus: ObservableObject {
    @Published public var isAllowed: Bool

    public init(isAllowed: Bool = true) {
        self.isAllowed = isAllowed
    }

    /// Opens the Input Monitoring page of System Settings. macOS adds the
    /// keyboard to the list when it asks, so the user only turns it on.
    public func openSettings() {
        CGRequestListenEventAccess()
        guard
            let url = URL(
                string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent")
        else { return }
        NSWorkspace.shared.open(url)
    }
}
