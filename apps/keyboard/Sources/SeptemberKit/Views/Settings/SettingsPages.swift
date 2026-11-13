import SwiftUI

/// The view of each page of the Settings window.
///
/// Look and Accessibility have their views from the start. The app sets the
/// view of each other page, for example
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
        get { views[page] ?? AnyView(EmptyView()) }
        set { views[page] = newValue }
    }
}
