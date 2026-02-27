import AppKit

@Observable
@MainActor
final class TypingTracker {
    private(set) var currentWord = ""
    private(set) var suggestions: [String] = []

    private let spellChecker = NSSpellChecker.shared
    private let spellTag = NSSpellChecker.uniqueSpellDocumentTag()

    func trackKey(keyCode: UInt16, shift: Bool) {
        if let char = character(for: keyCode, shift: shift) {
            currentWord.append(char)
            updateSuggestions()
        } else if keyCode == KeyCodes.delete {
            if !currentWord.isEmpty {
                currentWord.removeLast()
                updateSuggestions()
            }
        } else if isWordBoundary(keyCode) {
            clear()
        }
    }

    func applySuggestion(_ word: String) {
        let deleteCount = currentWord.count
        for _ in 0..<deleteCount {
            EventInjector.shared.send(keyCode: KeyCodes.delete)
        }
        for char in word {
            if let (code, shift) = keyCode(for: char) {
                EventInjector.shared.send(keyCode: code, shift: shift)
            }
        }
        // Add a space after the completed word
        EventInjector.shared.send(keyCode: KeyCodes.space)
        clear()
    }

    private func clear() {
        currentWord = ""
        suggestions = []
    }

    private func updateSuggestions() {
        guard !currentWord.isEmpty else {
            suggestions = []
            return
        }
        suggestions = spellChecker.completions(
            forPartialWordRange: NSRange(location: 0, length: currentWord.count),
            in: currentWord,
            language: nil,
            inSpellDocumentWithTag: spellTag
        ) ?? []
    }

    private func isWordBoundary(_ keyCode: UInt16) -> Bool {
        switch keyCode {
        case KeyCodes.space, KeyCodes.returnKey, KeyCodes.tab,
             KeyCodes.comma, KeyCodes.period, KeyCodes.semicolon,
             KeyCodes.slash, KeyCodes.minus:
            return true
        default:
            return false
        }
    }

    private func character(for keyCode: UInt16, shift: Bool) -> Character? {
        if let base = Self.letterMap[keyCode] {
            return shift ? Character(base.uppercased()) : base
        }
        return nil
    }

    private func keyCode(for char: Character) -> (UInt16, Bool)? {
        let lower = Character(char.lowercased())
        for (code, c) in Self.letterMap {
            if c == lower {
                return (code, char.isUppercase)
            }
        }
        return nil
    }

    private static let letterMap: [UInt16: Character] = [
        KeyCodes.a: "a", KeyCodes.b: "b", KeyCodes.c: "c", KeyCodes.d: "d",
        KeyCodes.e: "e", KeyCodes.f: "f", KeyCodes.g: "g", KeyCodes.h: "h",
        KeyCodes.i: "i", KeyCodes.j: "j", KeyCodes.k: "k", KeyCodes.l: "l",
        KeyCodes.m: "m", KeyCodes.n: "n", KeyCodes.o: "o", KeyCodes.p: "p",
        KeyCodes.q: "q", KeyCodes.r: "r", KeyCodes.s: "s", KeyCodes.t: "t",
        KeyCodes.u: "u", KeyCodes.v: "v", KeyCodes.w: "w", KeyCodes.x: "x",
        KeyCodes.y: "y", KeyCodes.z: "z",
    ]
}
