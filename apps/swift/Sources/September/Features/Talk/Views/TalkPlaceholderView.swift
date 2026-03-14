import SwiftUI

struct TalkPlaceholderView: View {
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "waveform")
                .font(.system(size: 48))
                .foregroundStyle(DesignColors.primary)

            Text("Talk Mode")
                .font(Typography.heading())
                .foregroundStyle(DesignColors.foreground)

            Text("Text-to-speech output and transcription input")
                .font(Typography.body())
                .foregroundStyle(DesignColors.mutedForeground)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignColors.background)
    }
}
