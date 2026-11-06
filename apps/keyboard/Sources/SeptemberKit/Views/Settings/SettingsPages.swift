import SwiftUI

/// The view of each page of the Settings window.
///
/// Look and Accessibility have their views from the start. The other pages
/// show a placeholder until their view is set, for example
/// `pages[.voice] = AnyView(VoiceSettingsPage(...))`.
@MainActor
public struct SettingsPages {
    private var views: [SettingsPage: AnyView]

    public init(settings: KeyboardSettings, permission: AccessibilityPermission) {
        views = [
            .look: AnyView(LookSettingsPage(settings: settings)),
            .accessibility: AnyView(AccessibilitySettingsPage(permission: permission)),
        ]
    }

    public subscript(page: SettingsPage) -> AnyView {
        get { views[page] ?? AnyView(SettingsPlaceholder(page: page)) }
        set { views[page] = newValue }
    }

    public func isPlaceholder(_ page: SettingsPage) -> Bool {
        views[page] == nil
    }
}

/// A page that is not available yet.
struct SettingsPlaceholder: View {
    let page: SettingsPage

    var body: some View {
        ContentUnavailableView(
            page.title,
            systemImage: page.symbol,
            description: Text("These settings are not available yet.")
        )
    }
}
