import SwiftUI

struct SettingsPlaceholderView: View {
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "gearshape")
                .font(.system(size: 48))
                .foregroundStyle(DesignColors.primary)

            Text("Settings")
                .font(Typography.heading())
                .foregroundStyle(DesignColors.foreground)

            Text("Appearance, AI providers, speech, and transcription")
                .font(Typography.body())
                .foregroundStyle(DesignColors.mutedForeground)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignColors.background)
    }
}
