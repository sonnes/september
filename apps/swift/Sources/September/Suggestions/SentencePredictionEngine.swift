import Foundation
import LLM

@Generatable
struct Predictions {
  let s1: String
  let s2: String
  let s3: String
  let s4: String
  let s5: String

  var all: [String] { [s1, s2, s3, s4, s5] }
}

@MainActor
final class SentencePredictionEngine {
  private var bot: LLM?
  private(set) var isLoadingModel = false
  private(set) var loadError: String?
  private var loadTask: Task<LLM?, Never>?

  private let systemPrompt = """
    Autocomplete the user's sentence. Return 5 different short continuations in s1-s5. \
    Each must be 3-6 words only. No explanations. Only the continuation words.
    """

  func predictions(for textBeforeCursor: String) async -> [String] {
    if bot == nil && !isLoadingModel { startModelLoad() }
    if bot == nil, let loadTask { bot = await loadTask.value }
    guard let bot else { return [] }

    let context = limitedContext(textBeforeCursor, maxWords: 50)
    let prompt =
      context.isEmpty
      ? "Complete: \"I\""
      : "Complete: \"\(context)\""

    print("[LLM] Input: \(prompt)")
    let start = CFAbsoluteTimeGetCurrent()
    do {
      let result = try await bot.respond(to: prompt, as: Predictions.self)
      bot.history.removeAll()
      let elapsed = (CFAbsoluteTimeGetCurrent() - start) * 1000
      let sentences = result.value.all
      print("[LLM] Output (\(Int(elapsed))ms): \(sentences)")
      return sentences
    } catch {
      bot.history.removeAll()
      print("[LLM] Error: \(error)")
      return []
    }
  }

  private func startModelLoad() {
    isLoadingModel = true
    loadError = nil

    guard let url = Bundle.module.url(forResource: "Qwen3-0.6B-Q4_K_M", withExtension: "gguf")
    else {
      isLoadingModel = false
      loadError = "Model file not found"
      return
    }

    let systemPrompt = self.systemPrompt
    loadTask = Task.detached {
      let loaded = LLM(from: url, template: .chatML(systemPrompt), maxTokenCount: 5120)
      await MainActor.run { print("[LLM] Model loaded: \(loaded != nil)") }
      return loaded
    }

    Task {
      let result = await loadTask?.value
      bot = result
      isLoadingModel = false
      if result == nil { loadError = "Failed to load model" }
    }
  }

  private func limitedContext(_ text: String, maxWords: Int) -> String {
    let words = text.trimmingCharacters(in: .whitespaces).split(separator: " ")
    if words.count <= maxWords { return text.trimmingCharacters(in: .whitespaces) }
    return words.suffix(maxWords).joined(separator: " ")
  }
}
