import Foundation

/// Gives sentence predictions for a context, best first.
public protocol SentencePredicting: Sendable {
    /// The state of the model.
    var availability: PredictionAvailability { get }
    func predictions(for context: PredictionContext) async throws -> [String]
}

/// The state of the model that gives sentence predictions.
public enum PredictionAvailability: Equatable, Sendable {
    case ready
    /// The Mac supports Apple Intelligence, but the user turned it off.
    case off
    /// The Mac or the macOS version does not support Apple Intelligence.
    case notSupported
    /// Apple Intelligence is on, but the model is not ready, for example
    /// during a download.
    case modelNotReady

    /// The status for the Settings page.
    public var status: String {
        switch self {
        case .ready: "Ready"
        case .off: "Off. Turn on Apple Intelligence in System Settings."
        case .notSupported: "Not supported on this Mac"
        case .modelNotReady: "Not ready. macOS is getting the model."
        }
    }

    /// The Apple Intelligence & Siri page of System Settings.
    public static let systemSettingsURL = URL(
        string: "x-apple.systempreferences:com.apple.Siri-Settings.extension")!
}

/// Why the prediction stack shows a message in place of predictions.
public enum PredictionNotice: Equatable, Sendable {
    case appleIntelligence(PredictionAvailability)
    case passwordField
    case privateText

    public var message: String {
        switch self {
        case .appleIntelligence(.modelNotReady):
            "Apple Intelligence is getting ready. Sentence predictions start when it is ready."
        case .appleIntelligence(.notSupported):
            "Sentence predictions need Apple Intelligence, and this Mac does not support it. Word completions and Speak still work."
        case .appleIntelligence:
            "Sentence predictions need Apple Intelligence. Word completions and Speak still work."
        case .passwordField:
            "No predictions in a password field. Speak is off."
        case .privateText:
            "No predictions while private text is in this field."
        }
    }

    /// True when the notice shows the Open System Settings action.
    public var opensSystemSettings: Bool {
        self == .appleIntelligence(.off)
    }

    /// True for the notices of the warning color. The others are calm.
    public var isWarning: Bool {
        if case .appleIntelligence = self { return true }
        return false
    }
}
