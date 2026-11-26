import SwiftUI

/// The Typing page: what a key does while the user types.
public struct TypingSettingsPage: View {
    @ObservedObject private var settings: KeyboardSettings

    public init(settings: KeyboardSettings) {
        self.settings = settings
    }

    public var body: some View {
        Form {
            Section {
                Toggle("Sticky repeat", isOn: $settings.stickyRepeat)
            } footer: {
                Text(
                    "A tap on Delete, an arrow, or another key that repeats keeps it repeating. The next tap stops it. You do not have to hold the key."
                )
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .formStyle(.grouped)
    }
}
