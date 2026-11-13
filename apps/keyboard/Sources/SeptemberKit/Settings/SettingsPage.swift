/// A page of the Settings window.
public enum SettingsPage: String, Sendable, Hashable, CaseIterable, Identifiable {
    case voice
    case speech
    case predictions
    case clipboard
    case myPanel
    case look
    case accessibility

    public var id: Self { self }

    public var title: String {
        switch self {
        case .voice: "Voice"
        case .speech: "Speech"
        case .predictions: "Predictions"
        case .clipboard: "Clipboard"
        case .myPanel: "My Panel"
        case .look: "Look"
        case .accessibility: "Accessibility"
        }
    }

    /// The SF Symbol in the sidebar.
    public var symbol: String {
        switch self {
        case .voice: "person.wave.2.fill"
        case .speech: "waveform"
        case .predictions: "sparkles"
        case .clipboard: "doc.on.clipboard"
        case .myPanel: "star.fill"
        case .look: "paintpalette.fill"
        case .accessibility: "accessibility"
        }
    }

    /// The fill of the sidebar icon. The mock uses the same fill in light
    /// and dark.
    public var iconFill: ThemeColor {
        let fill: RGBA =
            switch self {
            case .voice, .accessibility: Tokens.accent.dark
            case .speech: RGBA(hex: 0x8B5CF6)
            case .predictions: RGBA(hex: 0xFF9F0A)
            case .clipboard: Tokens.rowShift.dark
            case .myPanel: RGBA(hex: 0x5E5CE6)
            case .look: RGBA(hex: 0xFF375F)
            }
        return ThemeColor(light: fill, dark: fill)
    }
}

/// A group of pages in the sidebar of the Settings window.
public enum SettingsGroup: String, Sendable, Hashable, CaseIterable, Identifiable {
    case speak
    case type
    case keyboard

    public var id: Self { self }

    public var title: String {
        switch self {
        case .speak: "Speak"
        case .type: "Type"
        case .keyboard: "Keyboard"
        }
    }

    public var pages: [SettingsPage] {
        switch self {
        case .speak: [.voice, .speech]
        case .type: [.predictions, .clipboard, .myPanel]
        case .keyboard: [.look, .accessibility]
        }
    }
}
