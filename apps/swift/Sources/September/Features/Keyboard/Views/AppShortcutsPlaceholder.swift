import SwiftUI

/// 200pt wide placeholder for app-specific shortcuts (Phase 4).
/// Shows focused app name and generic shortcuts.
struct AppShortcutsPlaceholder: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("App Shortcuts")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(DesignColors.shortcutIcon)
                .textCase(.uppercase)
                .padding(.horizontal, 4)

            Text("App-specific shortcuts will appear here when an app is focused.")
                .font(.system(size: 11))
                .foregroundStyle(DesignColors.shortcutIcon.opacity(0.7))
                .padding(.horizontal, 4)
                .multilineTextAlignment(.leading)

            Spacer()
        }
        .frame(width: 200)
        .padding(8)
    }
}
