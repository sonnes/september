import SwiftUI

/// The Look page: Rainbow or Mono keys, and the light or dark appearance.
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
                Picker("Appearance", selection: $settings.appearance) {
                    ForEach(AppearanceSetting.allCases) { appearance in
                        Text(appearance.title).tag(appearance)
                    }
                }
                .pickerStyle(.segmented)
            } footer: {
                Text("Automatic follows the light or dark setting of macOS.")
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .formStyle(.grouped)
    }
}

extension KeyboardStyle {
    public var title: String {
        switch self {
        case .rainbow: "Rainbow"
        case .mono: "Mono"
        }
    }
}
