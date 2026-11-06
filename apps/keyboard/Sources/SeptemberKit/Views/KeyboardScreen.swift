import SwiftUI

/// The whole floating surface: input bar and mode buttons above, keypads and
/// keyboard below.
public struct KeyboardScreen: View {
    @EnvironmentObject private var controller: KeyboardController
    @EnvironmentObject private var permission: AccessibilityPermission

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: Metrics.sectionSpacing) {
            if !permission.isTrusted {
                PermissionBanner()
                    .padding(.leading, Metrics.keypadWidth + Metrics.sectionSpacing)
            }

            HStack(alignment: .center, spacing: Metrics.sectionSpacing) {
                InputBar()
                ModeButtons()
                Spacer(minLength: 0)
            }
            .padding(.leading, Metrics.keypadWidth + Metrics.sectionSpacing)

            keys
        }
        .padding(Metrics.surfacePadding)
    }

    private var keys: some View {
        HStack(alignment: .top, spacing: Metrics.sectionSpacing) {
            PanelGridView(panel: controller.panels.edit) { controller.perform($0) }

            MainKeyboardView()

            VStack(alignment: .leading, spacing: 12) {
                PanelGridView(panel: controller.panels.navigate) { controller.perform($0) }
                PanelGridView(panel: controller.panels.system) { controller.perform($0) }
            }

            AppShortcutsView(
                panel: controller.appPanel,
                appName: controller.frontmostAppName
            ) { controller.perform($0) }
        }
        .padding(Metrics.surfacePadding)
        .background(Color(Tokens.background))
        .clipShape(RoundedRectangle(cornerRadius: Metrics.surfaceCornerRadius, style: .continuous))
    }
}

/// Shown until macOS trusts the app to send keystrokes. Without that trust,
/// macOS drops every key press without an error.
struct PermissionBanner: View {
    @EnvironmentObject private var permission: AccessibilityPermission

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color(Tokens.warning))
            Text("Keyboard needs Accessibility access to type into other apps.")
                .font(.system(size: 12))
                .foregroundStyle(Color(Tokens.keyText))
            Button("Open Settings") {
                permission.openSettings()
            }
            .buttonStyle(.plain)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(Color(Tokens.accent))
        }
        .padding(.horizontal, 16)
        .frame(height: Metrics.bannerHeight)
        .background(
            RoundedRectangle(cornerRadius: Metrics.bannerCornerRadius, style: .continuous)
                .fill(Color(Tokens.warningSurface))
        )
        .accessibilityElement(children: .combine)
    }
}
