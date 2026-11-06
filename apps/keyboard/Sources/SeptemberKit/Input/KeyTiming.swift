import AppKit

/// The key settings of macOS that change what a held key does: key repeat,
/// press and hold, and Slow Keys.
public struct KeyTiming: Equatable, Sendable {
    /// The time that a key is held before it repeats or shows its accents.
    public var holdDelay: TimeInterval
    /// The time between two repeats, or nil when key repeat is off.
    public var repeatInterval: TimeInterval?
    /// True when a held letter shows its accents instead of repeating.
    public var pressAndHold: Bool
    /// The time that a key is held before it acts, or nil when Slow Keys is
    /// off.
    public var slowKeysDelay: TimeInterval?

    public init(
        holdDelay: TimeInterval, repeatInterval: TimeInterval?, pressAndHold: Bool,
        slowKeysDelay: TimeInterval?
    ) {
        self.holdDelay = holdDelay
        self.repeatInterval = repeatInterval
        self.pressAndHold = pressAndHold
        self.slowKeysDelay = slowKeysDelay
    }

    /// The defaults of macOS: `InitialKeyRepeat` 25 and `KeyRepeat` 6, in
    /// sixtieths of a second.
    public static let standard = KeyTiming(
        holdDelay: 25.0 / 60, repeatInterval: 6.0 / 60, pressAndHold: true, slowKeysDelay: nil)

    /// System Settings turns key repeat off with a delay or an interval of
    /// hours. A value above this limit means that key repeat is off.
    static let repeatOffLimit: TimeInterval = 60

    /// The timing from the values that macOS stores.
    ///
    /// - Parameters:
    ///   - repeatDelay: `NSEvent.keyRepeatDelay`.
    ///   - repeatInterval: `NSEvent.keyRepeatInterval`.
    ///   - pressAndHold: `ApplePressAndHoldEnabled` of the global domain. A
    ///     missing value means on.
    ///   - slowKeys: `slowKey` of `com.apple.universalaccess`.
    ///   - slowKeyDelay: `slowKeyDelay` of `com.apple.universalaccess`, in
    ///     milliseconds.
    public init(
        repeatDelay: TimeInterval, repeatInterval: TimeInterval, pressAndHold: Bool?,
        slowKeys: Bool, slowKeyDelay: Int?
    ) {
        let off = repeatDelay > Self.repeatOffLimit || repeatInterval > Self.repeatOffLimit
        self.init(
            holdDelay: repeatDelay > Self.repeatOffLimit ? Self.standard.holdDelay : repeatDelay,
            repeatInterval: off ? nil : repeatInterval,
            pressAndHold: pressAndHold ?? true,
            slowKeysDelay: slowKeys ? TimeInterval(slowKeyDelay ?? 0) / 1000 : nil)
    }

    /// The domain of the Accessibility settings. A non-sandboxed app reads it
    /// without Full Disk Access.
    public static let universalAccessDomain = "com.apple.universalaccess"

    /// Reads the settings of macOS now. `CFPreferences` keeps the values in
    /// step with System Settings, so a read sees a change at once.
    public static func current(
        global: UserDefaults = .standard,
        universalAccess: UserDefaults? = UserDefaults(suiteName: universalAccessDomain)
    ) -> KeyTiming {
        KeyTiming(
            repeatDelay: NSEvent.keyRepeatDelay,
            repeatInterval: NSEvent.keyRepeatInterval,
            pressAndHold: global.object(forKey: "ApplePressAndHoldEnabled") as? Bool,
            slowKeys: universalAccess?.bool(forKey: "slowKey") ?? false,
            slowKeyDelay: universalAccess?.object(forKey: "slowKeyDelay") as? Int)
    }
}
