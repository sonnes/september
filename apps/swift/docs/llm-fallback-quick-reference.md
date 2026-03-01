# LLM Fallback Implementation Quick Reference

**Status:** Research Complete - Ready for POC  
**Recommendation:** LocalLLMClient + Phi-3-Mini for macOS 14-25 fallback

## What You Need to Know

### Problem
- Foundation Models only on macOS 26+ with Apple Intelligence
- Need fallback for macOS 14-25 users with accessibility keyboard
- Must support sentence predictions with <100ms latency

### Solution
**LocalLLMClient** (Swift package) + **Phi-3-Mini** (3.8B, Q4 quantized)

### Key Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| **First Token Latency** | 50-80ms | ✓ Meets <100ms target |
| **Throughput** | 60-100 tokens/sec | ✓ Interactive speed |
| **Model Size (Q4)** | 2.4GB | Lazy-loadable from HF Hub |
| **RAM During Inference** | 3-5GB | ✓ Acceptable on 8GB+ Macs |
| **Setup Time** | ~3-4 hours | Full implementation |

## Quick Integration Pattern

### Current Code (Keep as-is)
```swift
@available(macOS 26, *)
class SentencePredictionEngine { /* Foundation Models */ }
```

### Add Fallback (New Code)
```swift
@available(macOS 14, *)
class LocalSentencePredictionEngine { /* llama.cpp */ }
```

### Unified Interface
```swift
class UnifiedSentencePredictionEngine {
    func predictions(for text: String) async -> [String]
    // Tries Foundation Models first → falls back to LocalLLMClient
}
```

## Implementation Checklist

- [ ] **Decision:** Phi-3-Mini vs Qwen2.5-0.5B? (Phi recommended)
- [ ] **Decision:** Swift 6.1 upgrade possible? (affects AnyLanguageModel choice)
- [ ] **POC:** Add LocalLLMClient, test Phi-3-Mini latency
- [ ] **Code:** Create LocalSentencePredictionEngine.swift (~150 lines)
- [ ] **Code:** Create ModelCacheManager.swift (~100 lines)
- [ ] **Integration:** Update SuggestionsBarView.swift (~50 lines)
- [ ] **Testing:** Performance benchmarks on M1/M2/M3
- [ ] **Testing:** Error scenarios (network, disk, memory)
- [ ] **UX:** Settings UI for model download progress

## Performance Comparison: LocalLLMClient vs Alternatives

```
LocalLLMClient (llama.cpp) - RECOMMENDED
├─ Performance: 100 tokens/sec ✓
├─ Swift 5.10 compatible ✓
├─ Auto model download ✓
├─ Active maintenance ✓
└─ Learning curve: Low ✓

AnyLanguageModel - ALTERNATIVE (if Swift 6.1 ready)
├─ Performance: 100 tokens/sec ✓
├─ Drop-in Foundation Models replacement ✓
├─ Swift 6.1+ required (breaking change)
└─ Multiple backends (future-proof)

MLX - ALTERNATIVE (best performance, harder setup)
├─ Performance: 230 tokens/sec (overkill for sentences)
├─ Manual model management
└─ Less mature Swift integration

Ollama - NOT RECOMMENDED
├─ Requires separate app installation
└─ REST API overhead (150+ ms latency)
```

## Model Recommendations

| Model | Size | Q4 Size | First Token | Best For | Trade-off |
|-------|------|---------|-------------|----------|-----------|
| **Phi-3-Mini** | 3.8B | 2.4GB | 60ms | Balanced | **START HERE** |
| Qwen2.5-0.5B | 0.5B | 350MB | 25ms | Speed | Lower quality |
| Llama-3.2-3B | 3B | 1.9GB | 70ms | Accuracy | Community support |

**Recommendation:** Phi-3-Mini (best balance of speed, quality, size)

## Integration Points in Your Codebase

```
september/apps/swift/Sources/September/
├── Suggestions/
│   ├── SentencePredictionEngine.swift (macOS 26+) - KEEP
│   ├── LocalSentencePredictionEngine.swift (NEW - 150 lines)
│   ├── ModelCacheManager.swift (NEW - 100 lines)
│   └── SuggestionsBarView.swift (MODIFY - add fallback)
└── Package.swift (ADD - LocalLLMClient dependency)
```

## Dependencies to Add

```swift
// Package.swift
.package(url: "https://github.com/tattn/LocalLLMClient.git", 
         from: "0.1.0"),

// Targets
.target(
    name: "September",
    dependencies: [
        .product(name: "LocalLLMClient", package: "LocalLLMClient"),
        .product(name: "LocalLLMClientLlama", package: "LocalLLMClient"),
    ]
)
```

## Timeline

| Phase | Time | Dependency |
|-------|------|-----------|
| POC (latency + memory) | 4 hours | Developer |
| Implementation | 3-4 hours | Developer |
| Testing & benchmarks | 3-4 hours | Developer |
| UX & Settings UI | 2-3 hours | Designer + Developer |
| Documentation | 2-3 hours | Tech writer |
| **Total** | **14-17 hours** | 2-3 days |

## Gotchas to Avoid

1. **Cold Start**: First inference is slow (2-5 sec), cache session
2. **Memory**: Model stays in RAM, implement optional unload
3. **Downloads**: Network can fail, graceful fallback to spell-checker
4. **Bundle Size**: Don't ship model in app binary, lazy-load only
5. **Compatibility**: Test on 8GB Macs, may struggle on 4GB systems

## Success Criteria

After implementation, you should have:

✓ Sentence predictions working on macOS 14-25  
✓ <100ms latency for first token  
✓ 60+ tokens/sec sustained throughput  
✓ Graceful fallback if model unavailable  
✓ Settings to manage model download  
✓ No impact on Foundation Models code path  

## Next Steps

1. **DECIDE:** Phi-3-Mini or Qwen2.5-0.5B?
2. **DECIDE:** Swift 6.1 upgrade feasible?
3. **RUN:** POC on your M1/M2/M3 Mac (4 hours)
4. **MEASURE:** Compare latency/memory vs Foundation Models
5. **BUILD:** Full implementation (3-4 hours)

---

**Questions?** See `llm-fallback-research.md` for comprehensive analysis.
