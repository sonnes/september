/// A page of the Settings window.
public enum SettingsPage: String, Sendable, Hashable, CaseIterable, Identifiable {
    case voice
    case speech
    case predictions
    case appPanels
    case myPanel
    case look
    case accessibility

    public var id: Self { self }

    public var title: String {
        switch self {
        case .voice: "Voice"
        case .speech: "Speech"
        case .predictions: "Predictions"
        case .appPanels: "App Panels"
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
        case .appPanels: "square.grid.2x2.fill"
        case .myPanel: "star.fill"
        case .look: "paintpalette.fill"
        case .accessibility: "accessibility"
        }
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
        case .type: [.predictions, .appPanels, .myPanel]
        case .keyboard: [.look, .accessibility]
        }
    }
}
