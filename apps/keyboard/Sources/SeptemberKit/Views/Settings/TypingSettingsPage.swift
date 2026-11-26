import SwiftUI

/// The Typing page: what a key does while the user types.
public struct TypingSettingsPage: View {
    @ObservedObject private var settings: KeyboardSettings
    private let inputMethod: InputMethodControl?

    /// The state of the input method of the keyboard, and the action that
    /// asks the user to allow it. `nil` when the keyboard runs as no input
    /// method, as with `make run`.
    public struct InputMethodControl {
        public var isEnabled: () -> Bool
        public var askToEnable: () -> Void

        public init(isEnabled: @escaping () -> Bool, askToEnable: @escaping () -> Void) {
            self.isEnabled = isEnabled
            self.askToEnable = askToEnable
        }
    }

    public init(settings: KeyboardSettings, inputMethod: InputMethodControl? = nil) {
        self.settings = settings
        self.inputMethod = inputMethod
    }

    public var body: some View {
        Form {
            if let inputMethod {
                Section {
                    LabeledContent("Input method") {
                        if inputMethod.isEnabled() {
                            Text("On")
                        } else {
                            Button("Turn On…", action: inputMethod.askToEnable)
                        }
                    }
                } footer: {
                    Text(
                        "The input method reads the text of the field and puts a picked word in with one edit. macOS asks you to allow it in System Settings."
                    )
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            Section {
                Toggle("Capital at the start of a sentence", isOn: $settings.autoCapital)
                Toggle("Space after punctuation", isOn: $settings.autoSpace)
                Toggle("Smart quotes", isOn: $settings.smartQuotes)
            } footer: {
                Text(
                    "A letter in an empty field or after the end of a sentence becomes a capital. Shift stays off. A space follows a period, a comma, and other marks, and goes away if the next key is a mark. Quotes curl to open and close. A password field gets none of these."
                )
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
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
