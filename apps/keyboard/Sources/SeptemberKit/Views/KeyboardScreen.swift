import SwiftUI

/// The whole floating surface: the input bar above, the keypads and the
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

            InputBar()
                .padding(.leading, Metrics.keypadWidth + Metrics.sectionSpacing)

            keys
        }
        .padding(Metrics.surfacePadding)
    }

    private var keys: some View {
        HStack(alignment: .top, spacing: Metrics.sectionSpacing) {
            PanelGridView(panel: controller.panels.edit) { controller.perform($0) }

            MainKeyboardView()

            VStack(alignment: .leading, spacing: Metrics.keypadStackSpacing) {
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
        HStack(spacing: Metrics.Banner.spacing) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color(Tokens.warning))
            Text("Keyboard needs Accessibility access to type into other apps.")
                .font(Typography.bannerText)
                .foregroundStyle(Color(Tokens.keyText))
            Button("Open Settings") {
                permission.openSettings()
            }
            .buttonStyle(.plain)
            .font(Typography.bannerAction)
            .foregroundStyle(Color(Tokens.accent))
        }
        .padding(.horizontal, Metrics.Banner.horizontalPadding)
        .frame(height: Metrics.Banner.height)
        .background(
            RoundedRectangle(cornerRadius: Metrics.Banner.cornerRadius, style: .continuous)
                .fill(Color(Tokens.warningSurface))
        )
        .accessibilityElement(children: .combine)
    }
}
