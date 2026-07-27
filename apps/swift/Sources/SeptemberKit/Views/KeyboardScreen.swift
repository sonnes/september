import SwiftUI

/// The whole floating surface: input bar and mode buttons above, keypads and
/// keyboard below.
public struct KeyboardScreen: View {
    @EnvironmentObject private var controller: KeyboardController

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: Metrics.sectionSpacing) {
            if !controller.isAccessibilityTrusted {
                PermissionBanner()
                    .padding(.leading, Metrics.keypadWidth + Metrics.sectionSpacing)
            }

            HStack(alignment: .center, spacing: Metrics.sectionSpacing) {
                InputBar()
                ModeButtons()
                Spacer(minLength: 0)
            }
            .padding(.leading, Metrics.keypadWidth + Metrics.sectionSpacing)

            HStack(alignment: .top, spacing: Metrics.sectionSpacing) {
                PanelGridView(panel: controller.editPanel) { controller.perform($0) }

                MainKeyboardView()

                VStack(alignment: .leading, spacing: 12) {
                    PanelGridView(panel: controller.navigatePanel) { controller.perform($0) }
                    PanelGridView(panel: controller.systemPanel) { controller.perform($0) }
                }

                AppShortcutsView(
                    panel: controller.appPanel,
                    appName: controller.frontmostAppName
                ) { controller.perform($0) }
            }
        }
        .padding(16)
        .background(Color(Tokens.background))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

/// Shown until macOS trusts the app to send keystrokes — without it every key
/// press would silently do nothing.
struct PermissionBanner: View {
    @EnvironmentObject private var controller: KeyboardController

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color(RGBA(hex: 0xFF9F4A)))
            Text("September needs Accessibility access to type into other apps.")
                .font(.system(size: 12))
                .foregroundStyle(Color(Tokens.keyText))
            Button("Open Settings") {
                controller.onOpenPermissionSettings?()
            }
            .buttonStyle(.plain)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(Color(Tokens.accent))
        }
        .padding(.horizontal, 16)
        .frame(height: 36)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color(RGBA(hex: 0xFF9F4A, alpha: 0.12)))
        )
        .accessibilityElement(children: .combine)
    }
}
