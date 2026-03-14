import SwiftUI

struct TypePlaceholderView: View {
    @State private var speechService = AVSpeechService()
    @State private var testText = "Hello from September"

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "keyboard")
                .font(.system(size: 48))
                .foregroundStyle(DesignColors.primary)

            Text("Type Mode")
                .font(Typography.heading())
                .foregroundStyle(DesignColors.foreground)

            Text("Accessible keyboard with AI predictions")
                .font(Typography.body())
                .foregroundStyle(DesignColors.mutedForeground)

            Divider()

            VStack(spacing: 12) {
                Text("TTS Test")
                    .font(Typography.caption())
                    .foregroundStyle(DesignColors.mutedForeground)

                TextField("Enter text to speak", text: $testText)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 300)

                Button {
                    Task {
                        try? await speechService.speak(text: testText)
                    }
                } label: {
                    Label(
                        speechService.isSpeaking ? "Speaking..." : "Speak",
                        systemImage: speechService.isSpeaking ? "speaker.wave.3" : "speaker"
                    )
                }
                .disabled(speechService.isSpeaking || testText.isEmpty)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignColors.background)
    }
}
