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
    insertReplacement(word + " ")
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
    insertReplacement(sentence + " ")
    currentWord = ""
    sentencePredictions = []
    scheduleSuggestionUpdate()
  }

  /// Delete the partial word before the cursor, then insert `text`.
  /// Tries AX text replacement first, then pasteboard Cmd+V, then CGEvent typing.
  private func insertReplacement(_ text: String) {
    // Tier 1: Direct AX text manipulation
    if textReader.isTextFieldFocused, textReader.readFocusedElement() {
      let start = utf16PartialWordStart(in: textReader.textBeforeCursor)
      if textReader.replaceTextBeforeCursor(from: start, with: text) {
        return
      }
      // Tier 2: Delete partial word via AX selection, then paste
      deletePartialWordViaSelection(from: start)
      EventInjector.shared.paste(text)
      return
    }

    // Tier 3: No AX text field — delete via backspace keys, insert via paste
    for _ in 0..<currentWord.count {
      EventInjector.shared.send(keyCode: KeyCodes.delete)
    }
    EventInjector.shared.paste(text)
  }

  /// Select and delete the partial word using AX range selection + forward delete.
  private func deletePartialWordViaSelection(from start: Int) {
    guard let element = textReader.focusedTextElement() else { return }
    let length = max(0, textReader.cursorPosition - start)
    guard length > 0 else { return }
    var range = CFRange(location: start, length: length)
    guard let axRange = AXValueCreate(.cfRange, &range) else { return }
    if AXUIElementSetAttributeValue(
      element, kAXSelectedTextRangeAttribute as CFString, axRange
    ) == .success {
      EventInjector.shared.send(keyCode: KeyCodes.forwardDelete)
    }
  }

  /// Returns the UTF-16 offset where the current partial word starts.
  private func utf16PartialWordStart(in text: String) -> Int {
    let ns = text as NSString
    if ns.length == 0 { return 0 }
    let lastChar = ns.character(at: ns.length - 1)
    if CharacterSet.whitespaces.contains(Unicode.Scalar(lastChar)!) {
      return ns.length
    }
    let spaceRange = ns.range(of: " ", options: .backwards)
    if spaceRange.location != NSNotFound {
      return spaceRange.location + spaceRange.length
    }
    return 0
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
