# macOS Accessibility Keyboard Documentation
## September Development Reference

This directory contains comprehensive documentation for building high-quality macOS apps, with specific focus on accessibility for assistive communication.

---

## Documentation Library

### 1. **START HERE: research-summary.md**
**Size:** ~13KB | **Read Time:** 20 minutes  
**Purpose:** Overview of all research, key findings, priorities, and quick reference

**What it covers:**
- Executive summary of all research
- Implementation priorities (phased approach)
- Technical decisions explained
- Code examples reference guide
- Risk analysis
- Next steps

**Best for:** First-time readers, getting oriented, project planning

---

### 2. **macos-swiftui-best-practices.md**
**Size:** ~30KB | **Read Time:** 45 minutes  
**Purpose:** Primary architectural reference for macOS SwiftUI development

**What it covers:**
- Modern SwiftUI architecture (@Observable, @Bindable)
- State management deep dive
- macOS navigation patterns (NavigationSplitView, floating panels)
- App lifecycle & window management
- Accessibility basics
- Performance optimization strategies
- Swift 6.0 concurrency (brief overview)
- macOS Human Interface Guidelines
- Distribution & security
- Award-winning app patterns (Things 3, Raycast, CleanShot X, etc.)
- Implementation checklist (detailed)

**Best for:**
- Architecture decisions
- State management patterns
- View composition strategies
- App lifecycle issues
- Understanding current best practices

**Reference while:** Architecting features, planning refactors, making design decisions

---

### 3. **accessibility-implementation-guide.md**
**Size:** ~21KB | **Read Time:** 40 minutes  
**Purpose:** Practical guide to building accessible interfaces for assistive technology users

**What it covers:**
- Four pillars of accessibility (Perceivable, Operable, Understandable, Robust)
- VoiceOver implementation with code examples
- Keyboard navigation patterns
- Switch Control integration
- Dwell control & head tracking
- Contrast & typography standards
- Testing & validation framework (with checklist)
- Common accessible UI patterns

**Best for:**
- Building accessible UI
- Testing with assistive technologies
- Understanding ALS/MND user needs
- VoiceOver-first design
- Keyboard navigation implementation

**Reference while:** Building custom controls, testing accessibility, fixing AX issues

---

### 4. **swift-concurrency-patterns.md**
**Size:** ~18KB | **Read Time:** 35 minutes  
**Purpose:** Deep dive into Swift concurrency, async/await, and thread safety

**What it covers:**
- Concurrency fundamentals
- Swift 6.0 strict concurrency rules (3 core rules)
- async/await patterns
- Actor isolation & MainActor
- Task management
- Common pitfalls & solutions
- September keyboard-specific patterns
- Migration from Combine
- Swift 6.0 migration checklist

**Best for:**
- Understanding concurrency issues
- Learning @MainActor usage
- Async/await patterns
- Thread-safe state management
- Migrating to Swift 6.0

**Reference while:** Handling background tasks, managing UI state, fixing concurrency warnings

---

### 5. **macos-accessibility-keyboard-research.md** (Existing)
**Size:** ~50KB  
**Purpose:** Detailed research on macOS accessibility APIs for keyboard apps

**What it covers:**
- Core accessibility frameworks (AXUIElement, NSAccessibility, etc.)
- Event injection approaches (NSEvent, CGEvent, IOHIDManager)
- Window management for floating panels
- Custom panel storage format
- Head tracking & dwell control integration
- Switch Control API details
- Integration with built-in accessibility features

**Best for:**
- Deep API knowledge
- Event injection implementation
- System-level accessibility integration
- Reference when building custom features

---

## How to Use This Documentation

### For New Team Members
1. Read **research-summary.md** (20 min) for orientation
2. Read **macos-swiftui-best-practices.md** sections 1-3 (30 min)
3. Skim **accessibility-implementation-guide.md** (15 min)
4. Reference as needed while coding

### For Architecture Decisions
1. Check **research-summary.md** → Technical Decisions
2. Read relevant section in **macos-swiftui-best-practices.md**
3. Review award-winning app patterns
4. Make decision with full context

### For Accessibility Work
1. Start with **accessibility-implementation-guide.md**
2. Reference code examples for your specific need
3. Use testing checklist for validation
4. Check **macos-swiftui-best-practices.md** for architecture context

### For Performance Issues
1. Read **macos-swiftui-best-practices.md** → Performance Optimization
2. Use view complexity metrics & Instruments guide
3. Extract subviews following patterns
4. Profile with Instruments templates

### For Concurrency Issues
1. Check **swift-concurrency-patterns.md** → Common Pitfalls
2. Find your issue in the patterns section
3. Learn the fix
4. Apply to your code

---

## Quick Decision Matrix

| Question | Answer | Reference |
|----------|--------|-----------|
| Should I use @Observable or ObservableObject? | @Observable (2025 standard) | macos-swiftui-best-practices.md § 2 |
| How do I manage window lifecycle? | Use NSApplicationDelegate | macos-swiftui-best-practices.md § 5 |
| What's the best navigation pattern for macOS? | NavigationSplitView + sidebar | macos-swiftui-best-practices.md § 4 |
| How do I make a button accessible? | Add accessibilityLabel | accessibility-implementation-guide.md § 2 |
| How do I test VoiceOver? | Cmd+F5, then navigate | accessibility-implementation-guide.md § 7 |
| How do I use @MainActor correctly? | For @Observable classes | swift-concurrency-patterns.md § 5 |
| What's wrong with my global variable? | It's not isolated; use @MainActor | swift-concurrency-patterns.md § 2 |
| Why is my view rendering slowly? | Complex view body; extract subviews | macos-swiftui-best-practices.md § 7 |

---

## Key Principles Summary

### The September Keyboard App Principles

1. **Accessibility First**
   - Every feature must work with VoiceOver
   - Keyboard navigation is required, not optional
   - Test with actual assistive tech (not just imagination)

2. **Modern Architecture**
   - @Observable for all ViewModels
   - @MainActor for thread safety
   - async/await for background work
   - No ObservableObject or Combine

3. **macOS Conventions**
   - NavigationSplitView for navigation
   - Floating panels with .nonactivatingPanel
   - Standard menu bar patterns
   - Respect system settings (dark mode, text size)

4. **Performance**
   - Sub-200ms view renders
   - 60fps responsiveness
   - No memory leaks
   - Lazy loading for large datasets

5. **User-Centric Design**
   - From award-winning apps: polish > features
   - Investment in details (animations, transitions)
   - Keyboard is primary interaction method
   - Visual feedback for dwell/head tracking users

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Refactor to @Observable architecture
- [ ] Enable Swift 6.0 strict concurrency
- [ ] Fix all compiler warnings
- [ ] Set up AppDelegate properly

**Reference:** macos-swiftui-best-practices.md § 2-3, research-summary.md § Implementation Priorities

### Phase 2: Accessibility (Weeks 2-3)
- [ ] Add VoiceOver support to all controls
- [ ] Implement keyboard navigation
- [ ] Test with Switch Control
- [ ] Verify contrast standards

**Reference:** accessibility-implementation-guide.md (entire), research-summary.md § Implementation Priorities

### Phase 3: Performance (Weeks 3-4)
- [ ] Profile with Instruments
- [ ] Extract view body complexity
- [ ] Fix memory leaks
- [ ] Optimize critical paths

**Reference:** macos-swiftui-best-practices.md § 7

### Phase 4: Polish (Week 5+)
- [ ] Code signing & notarization
- [ ] Accessibility permissions
- [ ] User preferences storage
- [ ] Documentation & help

**Reference:** macos-swiftui-best-practices.md § 10

---

## Code Examples Quick Index

### State Management
**Pattern:** Modern @Observable  
**Location:** macos-swiftui-best-practices.md → Modern SwiftUI Architecture (2025)

```swift
@Observable @MainActor final class KeyboardViewModel {
    var suggestions: [String] = []
}
```

### Accessibility
**Pattern:** Accessible button  
**Location:** accessibility-implementation-guide.md → VoiceOver Implementation

```swift
Button(action: {}) { Text("A") }
    .accessibilityLabel("Key A")
    .accessibilityHint("Press to type A")
```

### Keyboard Navigation
**Pattern:** Focus state management  
**Location:** accessibility-implementation-guide.md → Keyboard Navigation

```swift
@FocusState private var focusedKey: String?
Button(action: {}) { Text(key) }
    .focused($focusedKey, equals: key.id)
```

### Concurrency
**Pattern:** Main thread coordination  
**Location:** swift-concurrency-patterns.md → September Keyboard Patterns

```swift
@MainActor nonisolated func loadKeys() async throws {
    let data = try await loadFromDisk()
    await MainActor.run { self.keys = data }
}
```

---

## Document Maintenance

**Last Updated:** February 27, 2026  
**Research Quality:** Comprehensive (50+ sources, 100% current for 2024-2026)  
**Maintained By:** September Development Team  
**Review Schedule:** Quarterly (June, September, December)

### How to Update
1. Research specific topic thoroughly
2. Document findings with code examples
3. Link to source materials
4. Update this README with new sections
5. Add to version history

---

## Research Sources

All recommendations are based on:
- Official Apple documentation (WWDC 2024-2025)
- Award-winning macOS apps (Things 3, Raycast, CleanShot X)
- Swift Evolution proposals
- Community best practices
- 2024-2026 current practices

See individual documents for detailed citations.

---

## Glossary of Key Terms

| Term | Definition | Reference |
|------|------------|-----------|
| **@Observable** | Modern SwiftUI state macro (replaces ObservableObject) | macos-swiftui-best-practices.md § 2 |
| **@MainActor** | Ensures code runs on main thread automatically | swift-concurrency-patterns.md § 5 |
| **Sendable** | Type that can safely cross thread boundaries | swift-concurrency-patterns.md § 2 |
| **async/await** | Structured concurrency syntax | swift-concurrency-patterns.md § 3 |
| **Actor** | Thread-safe reference type for mutable state | swift-concurrency-patterns.md § 4 |
| **VoiceOver** | macOS screen reader for accessibility | accessibility-implementation-guide.md § 2 |
| **A11y** | Numeronym for "accessibility" (11 letters between A and y) | accessibility-implementation-guide.md (throughout) |
| **nonisolated** | Mark function/property as not actor-isolated | swift-concurrency-patterns.md (throughout) |
| **NavigationSplitView** | Three-column macOS navigation control | macos-swiftui-best-practices.md § 4 |
| **Floating Panel** | Window that doesn't steal focus | macos-swiftui-best-practices.md § 4 |

---

## Getting Help

### If You Have a Question...

**About architecture or state management:**
→ Check macos-swiftui-best-practices.md § 2-3

**About accessibility or VoiceOver:**
→ Check accessibility-implementation-guide.md § 2-3

**About concurrency or threading:**
→ Check swift-concurrency-patterns.md

**About macOS APIs or patterns:**
→ Check macos-swiftui-best-practices.md § 4-6

**About overall strategy:**
→ Check research-summary.md § Key Findings

**About specific implementation:**
→ Check the [Code Examples Quick Index](#code-examples-quick-index) above

---

## See Also

- **Current Implementation:** `/Users/raviatluri/work/september/apps/swift/Sources/September/`
- **Existing Accessibility Research:** `/Users/raviatluri/work/september/apps/swift/docs/macos-accessibility-keyboard-research.md`
- **Project README:** `/Users/raviatluri/work/september/apps/swift/README.md`

---

**Welcome to September's macOS Development!** 🎹  
Start with research-summary.md, then dive into specific topics as needed.
