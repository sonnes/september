import SwiftUI

/// The Look page: Rainbow or Mono keys, and the key size.
public struct LookSettingsPage: View {
    @ObservedObject private var settings: KeyboardSettings

    public init(settings: KeyboardSettings) {
        self.settings = settings
    }

    public var body: some View {
        Form {
            Section {
                Picker("Keys", selection: $settings.style) {
                    ForEach(KeyboardStyle.allCases, id: \.self) { style in
                        Text(style.title).tag(style)
                    }
                }
                .pickerStyle(.segmented)
            } footer: {
                Text("Rainbow gives each row of keys its own color. Mono shows all keys in one color.")
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Section {
                Picker("Key size", selection: $settings.keySize) {
                    ForEach(KeySize.allCases, id: \.self) { size in
                        Text(size.title).tag(size)
                    }
                }
                .pickerStyle(.segmented)
            } footer: {
                Text(
                    "At 88 points the number row, the function row, and the panels fold away. "
                        + "If the keys do not fit the screen, they take the largest size that fits."
                )
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .formStyle(.grouped)
    }
}

extension KeySize {
    public var title: String { "\(rawValue) pt" }
}

extension KeyboardStyle {
    public var title: String {
        switch self {
        case .rainbow: "Rainbow"
        case .mono: "Mono"
        }
    }
}
