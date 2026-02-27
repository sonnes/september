import Foundation

#if canImport(FoundationModels)
  import FoundationModels
#endif

@MainActor
final class SentencePredictionEngine {
  var isAvailable: Bool {
    #if canImport(FoundationModels)
      if #available(macOS 26, *) {
        return checkAvailability()
      }
    #endif
    return false
  }

  #if canImport(FoundationModels)
    @available(macOS 26, *)
    private func checkAvailability() -> Bool {
      if case .available = SystemLanguageModel.default.availability {
        return true
      }
      return false
    }
  #endif

  func predictions(for textBeforeCursor: String) async -> [String] {
    #if canImport(FoundationModels)
      if #available(macOS 26, *) {
        return await generatePredictions(for: textBeforeCursor)
      }
    #endif
    return []
  }

  #if canImport(FoundationModels)
    @available(macOS 26, *)
    private func generatePredictions(for textBeforeCursor: String) async -> [String] {
      guard case .available = SystemLanguageModel.default.availability else { return [] }

      let instructions = """
        You are a sentence completion engine. Given text, predict 5 natural \
        continuations the user might type next. Return exactly 5 predictions, \
        one per line. No numbering, no bullets, no quotes. Keep each under 12 words. \
        Return only the predictions, no other text.
        """

      do {
        let session = LanguageModelSession(instructions: instructions)
        let context = limitedContext(textBeforeCursor, maxWords: 100)
        let prompt =
          context.isEmpty
          ? "Suggest 3 common conversational sentences."
          : "Continue this text: \(context)"

        print("[Predictions] Input: \(prompt)")
        let response = try await session.respond(to: prompt)
        print("[Predictions] Output: \(response.content)")
        let results = response.content
          .components(separatedBy: .newlines)
          .map { $0.trimmingCharacters(in: .whitespaces) }
          .filter { !$0.isEmpty && !isMetaText($0) }
          .prefix(3)
          .map { String($0) }
        print("[Predictions] Parsed: \(results)")
        return results
      } catch {
        print("[Predictions] Error: \(error)")
        return []
      }
    }
  #endif

  private func isMetaText(_ line: String) -> Bool {
    let lower = line.lowercased()
    let markers = ["continuation", "prediction", "here are", "sorry", "can't assist",
                   "cannot assist", "sure,", "of course", "certainly"]
    return markers.contains { lower.contains($0) }
  }

  private func limitedContext(_ text: String, maxWords: Int) -> String {
    let trimmed = text.trimmingCharacters(in: .whitespaces)
    let words = trimmed.split(separator: " ")
    if words.count <= maxWords { return trimmed }
    return words.suffix(maxWords).joined(separator: " ")
  }
}
