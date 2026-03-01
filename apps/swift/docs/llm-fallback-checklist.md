# LLM Fallback Implementation Checklist

**Project:** September macOS Accessibility Keyboard  
**Feature:** On-device sentence predictions for macOS 14-25 (fallback for Foundation Models)  
**Recommendation:** LocalLLMClient + Phi-3-Mini  
**Estimated Duration:** 14-17 hours (2-3 days)

---

## Phase 0: Pre-Implementation (2 hours)

### Decision-Making
- [ ] **Team Decision:** Phi-3-Mini (3.8B) or Qwen2.5-0.5B (0.5B)?
  - Phi-3: Better quality, slightly slower (60ms first token)
  - Qwen2.5: Much faster (25ms), lower quality
  - **Recommendation:** Start with Phi-3-Mini, can swap later
  
- [ ] **Team Decision:** Swift 6.1 upgrade possible?
  - If YES → Consider AnyLanguageModel for future flexibility
  - If NO → LocalLLMClient is correct choice
  - **Recommendation:** Stick with LocalLLMClient for now
  
- [ ] **Performance Requirements Confirmed**
  - [ ] First token latency target: <100ms ✓
  - [ ] Sustained throughput: 50+ tokens/sec ✓
  - [ ] Memory budget: <5GB during inference ✓
  - [ ] Bundle size acceptable: lazy-load ~2.4GB model ✓

### Environment Setup
- [ ] Clone research documents to `/Users/raviatluri/work/september/apps/swift/docs/`
  - [x] `llm-fallback-research.md` (comprehensive analysis)
  - [x] `llm-fallback-quick-reference.md` (quick guide)
  - [x] `IMPLEMENTATION_CHECKLIST.md` (this file)

- [ ] Review existing code
  - [ ] Read `/Users/raviatluri/work/september/apps/swift/Sources/September/Suggestions/SentencePredictionEngine.swift`
  - [ ] Read `/Users/raviatluri/work/september/apps/swift/Sources/September/Suggestions/SuggestionsBarView.swift`
  - [ ] Understand current async/await patterns
  - [ ] Understand @MainActor usage

- [ ] Set up development environment
  - [ ] Mac with M1+/M2+/M3+/M4+ (for Metal GPU testing)
  - [ ] 8GB+ RAM recommended
  - [ ] Xcode 15.0+
  - [ ] Swift 5.10 compatible

---

## Phase 1: Proof of Concept (4 hours)

### POC Goals
Validate that LocalLLMClient + Phi-3-Mini meets performance targets before building full integration.

### 1a: Create Minimal Test Project (1 hour)
- [ ] Create temporary Swift package or playground
- [ ] Add LocalLLMClient dependency:
  ```swift
  .package(url: "https://github.com/tattn/LocalLLMClient.git", from: "0.1.0")
  ```
- [ ] Create minimal LLMSession initialization
- [ ] Load Phi-3-Mini from Hugging Face Hub
- [ ] Do NOT integrate into main app yet

### 1b: Performance Testing (2 hours)

#### Test 1: First Token Latency
- [ ] Create test prompt: "Hello, how are"
- [ ] Measure time from session.respond() call to first token
- [ ] Run 5 iterations, record results
- [ ] Expected: 50-80ms
- [ ] **PASS CRITERION:** < 100ms
- [ ] Record: Min, Max, Average, Median

#### Test 2: Sustained Throughput
- [ ] Generate 100 tokens from single prompt
- [ ] Measure total time
- [ ] Calculate tokens/second
- [ ] Expected: 60-100 tokens/sec
- [ ] **PASS CRITERION:** > 50 tokens/sec
- [ ] Record: Actual throughput

#### Test 3: Memory Usage
- [ ] Check memory before loading model
- [ ] Load model and initialize session
- [ ] Check memory after initialization
- [ ] Run single 5-token generation
- [ ] Check memory during inference
- [ ] Expected peaks: 3-5GB
- [ ] **PASS CRITERION:** < 5.5GB

#### Test 4: Sentence Completion Quality
- [ ] Use same prompt as Foundation Models test
- [ ] Generate 3 sentences for: "Hello, how are"
- [ ] Evaluate quality (subjective)
- [ ] Compare with Foundation Models baseline
- [ ] **PASS CRITERION:** Comparable or better

### 1c: Report Results (1 hour)
- [ ] Document all metrics in file: `/Users/raviatluri/work/september/POC_RESULTS.md`
- [ ] Create comparison table:
  | Metric | Target | LocalLLMClient | Status |
  |--------|--------|---|---|
  | First Token | <100ms | XXms | ✓/✗ |
  | Throughput | >50 t/s | XXX t/s | ✓/✗ |
  | Peak Memory | <5.5GB | XXB | ✓/✗ |
  | Quality | Comparable | [notes] | ✓/✗ |

- [ ] Decision point: Proceed with full implementation?
  - [ ] YES: All tests pass → Go to Phase 2
  - [ ] NO: Adjust parameters (Qwen2.5 instead?) or reconsider approach

---

## Phase 2: Implementation (4 hours)

### 2a: Dependency Setup (30 min)

#### Update Package.swift
- [ ] Edit `/Users/raviatluri/work/september/apps/swift/Package.swift`
- [ ] Add LocalLLMClient dependency:
  ```swift
  .package(url: "https://github.com/tattn/LocalLLMClient.git", 
           from: "0.1.0"),
  ```
- [ ] Add to target dependencies:
  ```swift
  .product(name: "LocalLLMClient", package: "LocalLLMClient"),
  .product(name: "LocalLLMClientLlama", package: "LocalLLMClient"),
  ```
- [ ] Run `swift build` to verify it compiles
- [ ] Verify no linking errors

### 2b: Create LocalSentencePredictionEngine (90 min)

#### New File
File: `/Users/raviatluri/work/september/apps/swift/Sources/September/Suggestions/LocalSentencePredictionEngine.swift`

#### Implementation Requirements
- [ ] Import LocalLLMClient and Foundation
- [ ] Conditional compile: `#if canImport(LocalLLMClient)`
- [ ] Use @MainActor decorator
- [ ] Implement `isAvailable` computed property
- [ ] Implement `predictions(for:) async -> [String]`
- [ ] Private session caching (avoid reloading)
- [ ] Lazy model loading on first use
- [ ] Error handling with graceful fallback
- [ ] Meta-text filtering (same as Foundation Models)
- [ ] Context window limiting (100 words max)

#### Code Structure
```swift
@MainActor
final class LocalSentencePredictionEngine {
    // Properties
    private var session: LLMSession?
    private var isLoading = false
    private let modelID = "microsoft/Phi-3-mini-4k-instruct-gguf"
    private let modelFilename = "Phi-3-mini-4k-instruct-q4.gguf"
    
    // Public API (matches Foundation Models)
    var isAvailable: Bool { /* ... */ }
    func predictions(for text: String) async -> [String] { /* ... */ }
    
    // Private helpers
    private func getOrLoadSession() async throws -> LLMSession { /* ... */ }
    private func isMetaText(_ line: String) -> Bool { /* ... */ }
    private func limitedContext(_ text: String, maxWords: Int) -> String { /* ... */ }
}
```

#### Key Implementation Points
- [ ] Use LocalLLMClient's auto-download from HF Hub
- [ ] Don't force users to pre-download models
- [ ] Cache session in memory for performance
- [ ] Use same system prompt as Foundation Models
- [ ] Return exactly 3 predictions (like Foundation Models)
- [ ] Filter out meta-text responses
- [ ] Handle network errors gracefully
- [ ] Add debug logging (prefix: "[LocalPredictions]")

### 2c: Create ModelCacheManager (60 min)

#### New File
File: `/Users/raviatluri/work/september/apps/swift/Sources/September/Suggestions/ModelCacheManager.swift`

#### Requirements
- [ ] Check if model already downloaded
- [ ] Download from Hugging Face Hub if needed
- [ ] Cache in Application Support directory
- [ ] Report download progress
- [ ] Handle network errors
- [ ] Optional: Calculate cache size for Settings UI

#### Code Structure
```swift
@MainActor
final class ModelCacheManager {
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    
    init() throws { /* ... */ }
    
    func modelURL(id: String, filename: String) async throws -> URL { /* ... */ }
    func cachedModelExists(filename: String) -> Bool { /* ... */ }
    func cacheSize() -> UInt64 { /* ... */ }
}
```

#### Key Implementation Points
- [ ] Only create if needed (LocalLLMClient may handle this)
- [ ] Add to Application Support, not app bundle
- [ ] Make errors recoverable (warn user, fall back to spell-checker)
- [ ] Don't block UI during download

### 2d: Create Unified Interface (60 min)

#### Option A: Protocol-Based (Recommended)
Create protocol that both engines conform to:

```swift
@MainActor
protocol SentencePredictionProvider: AnyObject {
    var isAvailable: Bool { get async }
    func predictions(for textBeforeCursor: String) async -> [String]
}
```

- [ ] Make `SentencePredictionEngine` conform to protocol
- [ ] Make `LocalSentencePredictionEngine` conform to protocol
- [ ] Create `UnifiedSentencePredictionEngine` that picks the right one

#### Option B: Direct Fallback (Simpler)
Update `SuggestionEngine` to try both:

```swift
func predictions(for text: String) async -> [String] {
    // Try Foundation Models first
    if #available(macOS 26, *) {
        let predictions = await fmEngine.predictions(for: text)
        if !predictions.isEmpty { return predictions }
    }
    
    // Fall back to local LLM
    return await localEngine.predictions(for: text)
}
```

**RECOMMENDATION:** Option A (protocol) is cleaner long-term

### 2e: Integration Tests (30 min)
- [ ] Test that SentencePredictionEngine still works on macOS 26+
- [ ] Test LocalSentencePredictionEngine on macOS 14-25
- [ ] Test fallback when Foundation Models unavailable
- [ ] Test error handling (network, disk, memory)
- [ ] Test model caching (second call uses cached model)

**Important:** Run on actual M1/M2/M3 machine, not simulator

---

## Phase 3: Performance Validation (4 hours)

### 3a: Comprehensive Benchmarking (2 hours)

#### Setup Test Environment
- [ ] Test on M1 machine (if available)
- [ ] Test on M2 machine (if available)
- [ ] Test on M3 machine (if available)
- [ ] Record macOS version and available RAM

#### Test 1: Cold Start (First-Ever Initialization)
- [ ] Delete model from cache
- [ ] Launch app
- [ ] Trigger sentence prediction
- [ ] Measure: Model download time, initialization time
- [ ] Record: Total time to first prediction
- [ ] Expected: ~60-120 seconds total (mostly download)

#### Test 2: Warm Start (Model Already Cached)
- [ ] Keep model in cache
- [ ] Trigger sentence prediction
- [ ] Measure: Time from prediction request to first token
- [ ] Expected: 50-80ms
- [ ] Record results

#### Test 3: Rapid Predictions (Typing Simulation)
- [ ] Generate 10 predictions in rapid succession
- [ ] Measure: Average time per prediction
- [ ] Monitor: Memory usage, CPU, GPU
- [ ] Expected: Should stay responsive, no janky animations

#### Test 4: Memory Leak Check (30-minute session)
- [ ] Run 100+ predictions over 30 minutes
- [ ] Monitor memory every 30 seconds
- [ ] Expected: Memory should stay stable, no growth
- [ ] Check: Are sessions being properly cached/released?

#### Test 5: Error Scenarios
- [ ] Test without internet (should fail gracefully)
- [ ] Test with 100MB free disk (should warn or skip model)
- [ ] Test with corrupted model file (should re-download)
- [ ] Test timeout during generation (should return empty array)

### 3b: Comparison with Foundation Models (1 hour)

#### Create Benchmark Report
File: `/Users/raviatluri/work/september/BENCHMARK_RESULTS.md`

| Metric | Foundation Models | LocalLLMClient | Winner | Notes |
|--------|---|---|---|---|
| First Token | XXms | XXms | ? | |
| Throughput | XX t/s | XX t/s | ? | |
| Memory (idle) | XXB | XXB | ? | |
| Memory (peak) | XXB | XXB | ? | |
| Quality (subjective) | Excellent | Good/Excellent | ? | |
| Latency perception | Instant | Fast | ? | |

### 3c: Documentation (1 hour)
- [ ] Document performance characteristics in code comments
- [ ] Add performance notes to `/Users/raviatluri/work/september/apps/swift/docs/`
- [ ] Document any surprising results
- [ ] Note any differences between models

---

## Phase 4: Testing & Error Handling (3 hours)

### 4a: Unit Tests (1.5 hours)

#### Test File
File: `/Users/raviatluri/work/september/apps/swift/Tests/LocalSentencePredictionEngineTests.swift`

#### Required Tests
- [ ] `testIsAvailable()` - Should return true on macOS 14+
- [ ] `testPredictionsBasic()` - Generate predictions from text
- [ ] `testMetaTextFiltering()` - Filter out meta-text correctly
- [ ] `testContextLimiting()` - Only use last 100 words
- [ ] `testErrorHandling()` - Return empty array on error
- [ ] `testCaching()` - Session stays cached between calls
- [ ] `testEmptyInput()` - Handle empty text gracefully
- [ ] `testLongInput()` - Handle very long text gracefully

#### Mock Testing
- [ ] Consider mocking LocalLLMClient for unit tests
- [ ] Integration tests with real models (slower but necessary)

### 4b: Integration Tests (1 hour)

#### Test File
File: `/Users/raviatluri/work/september/apps/swift/Tests/UnifiedPredictionEngineTests.swift`

#### Required Tests
- [ ] Test Foundation Models used when available
- [ ] Test LocalLLMClient used when FM unavailable
- [ ] Test fallback behavior
- [ ] Test error scenarios

#### Test Scenarios
- [ ] macOS 26+ with Apple Intelligence enabled
- [ ] macOS 26+ with Apple Intelligence disabled
- [ ] macOS 25 and earlier
- [ ] Model download fails (network error)
- [ ] Out of disk space
- [ ] Out of memory

### 4c: Manual Testing (0.5 hours)

#### On-Device Testing
- [ ] Run on actual Mac (not simulator)
- [ ] Type with keyboard, verify predictions appear
- [ ] Test dwell selection (accessibility feature)
- [ ] Test with different contexts (greeting, question, statement)
- [ ] Verify no crashes on error conditions

---

## Phase 5: UX & Settings (3 hours)

### 5a: Settings UI (1.5 hours)

#### Requirements
- [ ] Add Settings view for model management
- [ ] Show: Model name, download size, cache location
- [ ] Action: "Re-download Model"
- [ ] Action: "Clear Cache"
- [ ] Info: "Download will happen automatically on first use"

#### File Structure
File: `/Users/raviatluri/work/september/apps/swift/Sources/September/Settings/ModelSettingsView.swift`

### 5b: User Feedback (0.75 hours)

#### Download Progress
- [ ] Show progress indicator when downloading model
- [ ] Display: "Downloading Phi-3-Mini... (123MB / 2.4GB)"
- [ ] Allow: Cancel download
- [ ] Expected: First-run experience <2 minutes on WiFi

#### Error Messages
- [ ] Network error: "Model download failed. Please check your connection."
- [ ] Disk error: "Not enough disk space. Please free up 2.4GB."
- [ ] Timeout: "Model initialization timed out. Please try again."

### 5c: Documentation (0.75 hours)
- [ ] Add to in-app help: "Sentence predictions require download on first use"
- [ ] Create FAQ about model downloading
- [ ] Document model licensing (check Phi-3 license)

---

## Phase 6: Documentation & Code Review (2 hours)

### 6a: Code Documentation (1 hour)

#### Requirements
- [ ] Add inline comments explaining LocalLLMClient usage
- [ ] Document why lazy loading is necessary
- [ ] Explain fallback behavior
- [ ] Add MARK sections for organization
- [ ] Document thread safety (@MainActor)

#### Example Documentation
```swift
/// Provides AI-powered sentence predictions using local LLM inference.
/// 
/// On macOS 26+, uses Foundation Models (Apple Intelligence).
/// On macOS 14-25, falls back to LocalLLMClient + Phi-3-Mini.
/// 
/// - SeeAlso: `SentencePredictionEngine` (Foundation Models)
/// - Performance: 50-80ms first token, 60-100 tokens/sec throughput
@MainActor
final class LocalSentencePredictionEngine {
```

### 6b: Update Project Documentation (0.5 hours)

#### Files to Update
- [ ] `/Users/raviatluri/work/september/apps/swift/README.md`
  - [ ] Add section about sentence predictions
  - [ ] Document Swift 5.10 compatibility
  - [ ] Link to research docs
  
- [ ] `/Users/raviatluri/work/september/CLAUDE.md`
  - [ ] Add note about LLM fallback implementation
  - [ ] Document patterns used

### 6c: Code Review Checklist (0.5 hours)

Before committing, verify:
- [ ] No compiler warnings
- [ ] All tests pass
- [ ] Performance targets met
- [ ] Error handling comprehensive
- [ ] Code follows project style
- [ ] No hardcoded paths or API keys
- [ ] Conditional compilation correct

---

## Phase 7: Deployment & Monitoring (2 hours)

### 7a: Staging Deployment
- [ ] Build release version
- [ ] Test on M1, M2, M3 machines
- [ ] Test on macOS 14, 15, 25, 26
- [ ] Verify no regressions in Foundation Models path
- [ ] Check app size impact

### 7b: Release Notes
- [ ] Document new feature in release notes
- [ ] Note macOS compatibility
- [ ] Link to help documentation
- [ ] Mention performance characteristics

### 7c: Monitoring (Post-Release)
- [ ] Monitor crash logs
- [ ] Track: How many users download the model?
- [ ] Track: Average inference latency in production
- [ ] Track: User satisfaction with predictions
- [ ] Be ready to adjust model if needed

---

## Appendix: Success Criteria Checklist

### Functional Requirements
- [ ] Sentence predictions work on macOS 14-25
- [ ] Foundation Models path unchanged on macOS 26+
- [ ] Graceful fallback when local model unavailable
- [ ] Model auto-downloads on first use
- [ ] Predictions return within <100ms
- [ ] Quality comparable to Foundation Models

### Performance Requirements
- [ ] First token latency: <100ms ✓
- [ ] Sustained throughput: >50 tokens/sec ✓
- [ ] Memory usage: <5.5GB peak ✓
- [ ] App startup time: No measurable impact ✓
- [ ] No janky animations during predictions ✓

### Quality Requirements
- [ ] No compiler warnings ✓
- [ ] All tests pass ✓
- [ ] Code follows project style ✓
- [ ] Error handling comprehensive ✓
- [ ] Documentation complete ✓

### UX Requirements
- [ ] Settings UI for model management ✓
- [ ] Download progress visible ✓
- [ ] Error messages clear ✓
- [ ] Help documentation available ✓
- [ ] Accessibility preserved (dwell selection works) ✓

---

## Timeline Summary

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 0: Pre-Implementation | 2 hrs | Day 1 | Day 1 | ⬜ |
| Phase 1: POC | 4 hrs | Day 1 | Day 1 | ⬜ |
| Phase 2: Implementation | 4 hrs | Day 2 | Day 2 | ⬜ |
| Phase 3: Performance | 4 hrs | Day 2 | Day 3 | ⬜ |
| Phase 4: Testing | 3 hrs | Day 3 | Day 3 | ⬜ |
| Phase 5: UX & Settings | 3 hrs | Day 3 | Day 3 | ⬜ |
| Phase 6: Documentation | 2 hrs | Day 4 | Day 4 | ⬜ |
| Phase 7: Deployment | 2 hrs | Day 4 | Day 4 | ⬜ |
| **TOTAL** | **24 hrs** | | | |

*Realistic estimate: 3-4 days with standard team velocity*

---

## Contact & Questions

For questions about this implementation:
1. Review `/Users/raviatluri/work/september/apps/swift/docs/llm-fallback-research.md` (comprehensive)
2. Review `/Users/raviatluri/work/september/apps/swift/docs/llm-fallback-quick-reference.md` (quick)
3. Check `/Users/raviatluri/work/september/RESEARCH_SOURCES.md` for all source links

---

**Ready to begin?** Start with Phase 0 (Pre-Implementation) - 2 hours
