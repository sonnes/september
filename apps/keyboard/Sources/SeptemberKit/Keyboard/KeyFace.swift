/// What a key shows for the current modifier state.
public struct KeyFace: Sendable, Equatable {
    public enum Glyph: Sendable, Equatable {
        case text(String)
        /// An SF Symbol name.
        case symbol(String)
    }

    public let glyph: Glyph
    /// True when shift is on, so a dual key types its shifted symbol.
    public let isShifted: Bool
    /// The state of a modifier key. Other keys are always `.off`.
    public let look: ModifierLook
    public let accessibilityLabel: String
}

/// The state that a modifier key shows.
public enum ModifierLook: Sendable, Equatable {
    case off
    /// On for the next key only.
    case latched
    /// On until the next tap.
    case locked
}

extension ModifierState {
    public func look(of modifier: Modifiers) -> ModifierLook {
        if locked.contains(modifier) { return .locked }
        if latched.contains(modifier) || mac.contains(modifier) { return .latched }
        return .off
    }

    /// True when a modifier other than caps lock is on. Then the F-row sends
    /// F-keys, not media keys.
    public var holdsChord: Bool { !active.subtracting(.capsLock).isEmpty }
}

extension KeyDefinition {
    public func face(under state: ModifierState) -> KeyFace {
        let shifted = state.active.contains(.shift)
        switch action {
        case .media(let media, let function):
            if state.holdsChord {
                return face(.text(label), label: function.spokenName, shifted: shifted)
            }
            return face(.symbol(media.symbolName), label: media.spokenName, shifted: shifted)
        case .modifier(let modifier):
            let look = state.look(of: modifier)
            let label = look == .locked ? "\(accessibilityLabel), locked" : accessibilityLabel
            return KeyFace(
                glyph: modifierGlyph(modifier, look: look), isShifted: shifted, look: look,
                accessibilityLabel: label)
        case .character where kind == .standard:
            return face(.text(state.apply(to: label)), label: accessibilityLabel, shifted: shifted)
        case .character, .virtual:
            return face(.text(label), label: accessibilityLabel, shifted: shifted)
        }
    }

    private func face(_ glyph: KeyFace.Glyph, label: String, shifted: Bool) -> KeyFace {
        KeyFace(glyph: glyph, isShifted: shifted, look: .off, accessibilityLabel: label)
    }

    private func modifierGlyph(_ modifier: Modifiers, look: ModifierLook) -> KeyFace.Glyph {
        switch modifier {
        case .shift:
            switch look {
            case .off: .symbol("shift")
            case .latched: .symbol("shift.fill")
            case .locked: .symbol("capslock.fill")
            }
        case .capsLock:
            .symbol(look == .off ? "capslock" : "capslock.fill")
        default:
            .text(label)
        }
    }
}
