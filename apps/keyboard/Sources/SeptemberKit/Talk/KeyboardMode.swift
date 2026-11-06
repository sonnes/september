/// Where the keys send their text.
public enum KeyboardMode: String, Sendable, CaseIterable {
    /// The keys type into the app in front.
    case type
    /// The keys type into the input bar of the keyboard, to speak to a person
    /// in the room. The app in front gets no events.
    case talk
}

/// The voice that Talk mode speaks with.
@MainActor
public protocol SpeechOutput: AnyObject {
    func speak(_ text: String)
    func stop()
}
