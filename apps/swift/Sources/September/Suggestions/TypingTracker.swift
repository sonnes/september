import AppKit

@Observable
@MainActor
final class TypingTracker {
  private(set) var currentWord = ""
  private(set) var suggestions: [String] = []
  private(set) var sentencePredictions: [String] = []
  var isLoadingModel: Bool { sentenceEngine.isLoadingModel }
  var modelLoadError: String? { sentenceEngine.loadError }

  private let textReader = FocusedTextReader()
  private let engine = SuggestionEngine()
  private let sentenceEngine = SentencePredictionEngine()
  private var debounceWork: DispatchWorkItem?
  private var sentenceDebounceWork: DispatchWorkItem?
  private var sentencePredictionTask: Task<Void, Never>?

  init() {
    textReader.onFocusChange = { [weak self] in
      Task { @MainActor in
        self?.handleFocusChange()
      }
    }
    textReader.onValueChange = { [weak self] in
      Task { @MainActor in
        self?.handleValueChange()
      }
    }
    textReader.startObserving()
  }

  private func handleFocusChange() {
    currentWord = ""
    scheduleSuggestionUpdate()
    scheduleSentencePredictionUpdate()
  }

  private func handleValueChange() {
    // Text changed externally (physical keyboard, paste, dictation, etc.)
    // Reset local tracking since it's now out of sync
    currentWord = ""
    scheduleSuggestionUpdate()
    scheduleSentencePredictionUpdate()
  }

  func trackKey(keyCode: UInt16, shift: Bool) {
    let atWordBoundary = isWordBoundary(keyCode)

    if let char = character(for: keyCode, shift: shift) {
      currentWord.append(char)
    } else if keyCode == KeyCodes.delete {
      if !currentWord.isEmpty {
        currentWord.removeLast()
      }
    } else if atWordBoundary {
      currentWord = ""
    }

    scheduleSuggestionUpdate()
    if atWordBoundary {
      scheduleSentencePredictionUpdate()
    }
  }

  func applySuggestion(_ word: String) {
    let partialWord: String
    if textReader.isTextFieldFocused {
      let text = textReader.textBeforeCursor
      if text.last?.isWhitespace == true {
        partialWord = ""
      } else {
        let lastSpace = text.lastIndex(of: " ")
        if let idx = lastSpace {
          partialWord = String(text[text.index(after: idx)...])
        } else {
          partialWord = text
        }
      }
    } else {
      partialWord = currentWord
    }

    for _ in 0..<partialWord.count {
      EventInjector.shared.send(keyCode: KeyCodes.delete)
    }
    for char in word {
      if let (code, shift) = keyCode(for: char) {
        EventInjector.shared.send(keyCode: code, shift: shift)
      }
    }
    EventInjector.shared.send(keyCode: KeyCodes.space)
    currentWord = ""
    scheduleSuggestionUpdate()
  }

  private func scheduleSuggestionUpdate() {
    debounceWork?.cancel()
    let work = DispatchWorkItem { [weak self] in
      Task { @MainActor in
        self?.updateSuggestionsFromContext()
      }
    }
    debounceWork = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05, execute: work)
  }

  private func updateSuggestionsFromContext() {
    if textReader.readFocusedElement() {
      suggestions = engine.suggestions(for: textReader.textBeforeCursor)
    } else {
      // Fallback: use locally tracked currentWord
      suggestions = engine.suggestions(for: currentWord)
    }
  }

  func applySentencePrediction(_ sentence: String) {
    // Delete any partial word currently being typed
    let partialWord: String
    if textReader.isTextFieldFocused {
      let text = textReader.textBeforeCursor
      if text.last?.isWhitespace == true || text.isEmpty {
        partialWord = ""
      } else if let idx = text.lastIndex(of: " ") {
        partialWord = String(text[text.index(after: idx)...])
      } else {
        partialWord = text
      }
    } else {
      partialWord = currentWord
    }

    for _ in 0..<partialWord.count {
      EventInjector.shared.send(keyCode: KeyCodes.delete)
    }

    EventInjector.shared.typeString(sentence)
    EventInjector.shared.send(keyCode: KeyCodes.space)

    currentWord = ""
    sentencePredictions = []
    scheduleSuggestionUpdate()
  }

  private func scheduleSentencePredictionUpdate() {
    sentenceDebounceWork?.cancel()
    sentencePredictionTask?.cancel()
    let work = DispatchWorkItem { [weak self] in
      Task { @MainActor in
        self?.updateSentencePredictions()
      }
    }
    sentenceDebounceWork = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.9, execute: work)
  }

  private func updateSentencePredictions() {
    sentencePredictionTask?.cancel()
    sentencePredictionTask = Task {
      let context: String
      if textReader.readFocusedElement() {
        context = textReader.textBeforeCursor
      } else {
        context = currentWord
      }
      guard !context.trimmingCharacters(in: .whitespaces).isEmpty else {
        sentencePredictions = []
        return
      }
      let predictions = await sentenceEngine.predictions(for: context)
      if !Task.isCancelled {
        sentencePredictions = predictions
      }
    }
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
