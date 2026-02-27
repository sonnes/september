# Accessibility Implementation Guide for September Keyboard App
## Comprehensive Guide for Building Accessible Input Interfaces

**Last Updated:** February 27, 2026  
**Target Audience:** ALS/MND users with motor difficulties  
**Focus:** VoiceOver, keyboard navigation, dwell control, head tracking, Switch Control

---

## Table of Contents

1. [Core Accessibility Principles](#core-accessibility-principles)
2. [VoiceOver Implementation](#voiceover-implementation)
3. [Keyboard Navigation](#keyboard-navigation)
4. [Switch Control Integration](#switch-control-integration)
5. [Dwell & Head Tracking](#dwell--head-tracking)
6. [Contrast & Typography](#contrast--typography)
7. [Testing & Validation](#testing--validation)
8. [Common Patterns](#common-patterns)

---

## Core Accessibility Principles

### The Four Pillars of macOS Accessibility

**1. Perceivable:** Users must be able to see/hear the interface
- Sufficient contrast (WCAG AA minimum: 4.5:1 for text)
- Text descriptions for all images
- Captions for video content

**2. Operable:** Users must be able to interact without a mouse
- Full keyboard navigation
- No time limits on interactions
- Customizable key bindings

**3. Understandable:** Users must understand what they're seeing
- Clear language
- Logical information structure
- Consistent navigation

**4. Robust:** Must work with assistive technologies
- VoiceOver support
- Switch Control compatible
- Standards-compliant code

### Why This Matters for ALS/MND Users

People with ALS/MND may have:
- Severe motor limitations (need hands-free or single-switch input)
- Progressive vision loss (need high contrast, large text)
- Limited stamina (need efficient, minimal-click interfaces)
- Communication difficulties (need predictive, contextual help)

---

## VoiceOver Implementation

### What Is VoiceOver?

VoiceOver is macOS's screen reader. It speaks text on screen and helps users navigate using keyboard shortcuts. For September, VoiceOver is critical because:

- Users may have vision loss in addition to motor issues
- Navigation is 100% keyboard-based
- Every UI element must be labeled properly

### Enabling VoiceOver in macOS

```
System Settings → Accessibility → VoiceOver → Enable
or: Cmd+F5
```

### Making Custom Views VoiceOver-Accessible

#### 1. Label Every Button

```swift
struct KeyButton: View {
    let key: KeyDefinition
    
    var body: some View {
        Button(action: pressKey) {
            Text(key.display)
                .font(.system(size: 20, weight: .semibold))
                .frame(minWidth: 50, minHeight: 50)
                .background(Color.blue)
                .cornerRadius(8)
        }
        .accessibilityLabel("Key: \(key.display)")  // VoiceOver reads this
        .accessibilityHint("Double-tap to press")   // Hints when exploring
        .accessibilityAddTraits(.isButton)          // Tell VoiceOver it's a button
        .accessibilityRemoveTraits(.isStaticText)
    }
    
    private func pressKey() {
        // Inject keyboard event
    }
}
```

**Why this works:**
- `accessibilityLabel`: VoiceOver speaks this when navigating
- `accessibilityHint`: Instructions on how to use
- `accessibilityAddTraits(.isButton)`: VoiceOver knows it's interactive

#### 2. Describe Images Properly

```swift
// WRONG: No description
Image("keyboard")

// RIGHT: Full description
Image("keyboard")
    .accessibilityLabel("On-screen keyboard layout")
    .accessibilityHidden(false)

// Images that are purely decorative:
Image("decorativeLine")
    .accessibilityHidden(true)  // Don't read this
```

#### 3. Group Related Elements

```swift
// If you have a key row, tell VoiceOver they're related:
struct KeyRow: View {
    let keys: [KeyDefinition]
    
    var body: some View {
        HStack {
            ForEach(keys, id: \.id) { key in
                KeyButton(key: key)
            }
        }
        .accessibilityElement(children: .combine)  // Read as one group
        .accessibilityLabel("Key row: \(keys.map { $0.display }.joined(separator: " "))")
    }
}

// Or for containers with independent children:
struct KeyboardView: View {
    var body: some View {
        VStack {
            KeyRow(keys: row1)
            KeyRow(keys: row2)
        }
        .accessibilityElement(children: .contain)  // Read children separately
    }
}
```

#### 4. Custom Actions for Complex Controls

```swift
// For a key that does multiple things
struct SmartKeyButton: View {
    let key: KeyDefinition
    
    var body: some View {
        Button(action: primaryAction) {
            Text(key.display)
        }
        .accessibilityLabel("Key: \(key.display)")
        .accessibilityAction(.activate) {
            primaryAction()  // Default action (enter)
        }
        .accessibilityAction(named: "Long press") {
            alternateAction()  // Alternative (shown to VoiceOver users)
        }
        .accessibilityAction(named: "Delete") {
            deleteAction()
        }
    }
    
    private func primaryAction() { }
    private func alternateAction() { }
    private func deleteAction() { }
}
```

### VoiceOver Keyboard Commands

Critical for testing (can't navigate your app properly without knowing these):

| Command | Result |
|---------|--------|
| Ctrl+Opt+Right Arrow | Next element |
| Ctrl+Opt+Left Arrow | Previous element |
| Ctrl+Opt+Space | Activate button |
| Ctrl+Opt+A | Read all from here |
| Ctrl+Opt+H | VoiceOver help |
| Ctrl+Opt+? | Keyboard shortcuts |

### Testing with VoiceOver

**Step 1: Enable VoiceOver**
```bash
# Terminal
defaults write com.apple.Accessibility VoiceOverOnOffKey -bool true
# Or: Cmd+F5
```

**Step 2: Navigate through your app**
```
Ctrl+Opt+Right arrow: Next element
Ctrl+Opt+Left arrow: Previous element
Ctrl+Opt+Space: Activate
```

**Step 3: Verify every element has a label**

VoiceOver should speak descriptive text for:
- Every button
- Every text field
- Every status indicator
- Every custom control

**Step 4: Check hint text**

Hints should explain:
- What the control does
- How to interact with it
- What will happen

---

## Keyboard Navigation

### The Essential Keyboard Shortcuts

Every user should be able to:

```
Tab:         Next control
Shift+Tab:   Previous control
Space/Enter: Activate button
Arrow keys:  Navigate within containers
Escape:      Cancel/back
Cmd+Q:       Quit app (standard)
```

### Implementing Keyboard Navigation

```swift
@FocusState private var focusedKey: String?

struct KeyboardView: View {
    @State private var keys = KeyBoard.allKeys
    
    var body: some View {
        VStack {
            ForEach(keys, id: \.id) { key in
                Button(action: { insertKey(key) }) {
                    Text(key.display)
                }
                .focused($focusedKey, equals: key.id)
                .keyboardShortcut(key.shortcutKey, modifiers: [])
            }
        }
        .onKeyPress { press in
            handleKeyPress(press)
        }
    }
    
    private func handleKeyPress(_ press: KeyPress) -> KeyPress.Result {
        switch press.key {
        case .leftArrow:
            focusedKey = previousKeyID()
            return .handled
        case .rightArrow:
            focusedKey = nextKeyID()
            return .handled
        case .upArrow:
            focusedKey = keyAbove()
            return .handled
        case .downArrow:
            focusedKey = keyBelow()
            return .handled
        case .space:
            insertKey(currentKey())
            return .handled
        case .delete:
            deleteLastCharacter()
            return .handled
        default:
            return .ignored
        }
    }
}
```

### Tab Order Matters

Make sure Tab order follows logical flow:

```swift
// CORRECT: Tab order follows left-to-right, top-to-bottom
VStack {
    HStack {
        Button("1")  // Tab order: 1st
        Button("2")  // Tab order: 2nd
        Button("3")  // Tab order: 3rd
    }
    HStack {
        Button("4")  // Tab order: 4th
        Button("5")  // Tab order: 5th
    }
}

// If natural order is wrong, use @FocusState to fix:
@FocusState private var focusedControl: Int?

var body: some View {
    VStack {
        // Arrange in visual order
        TextField("", text: $name)
            .focused($focusedControl, equals: 1)
        
        TextEditor(text: $body)
            .focused($focusedControl, equals: 2)
        
        Button("Send") { }
            .focused($focusedControl, equals: 3)
    }
}
```

### Keyboard-Only Interaction (No Mouse!)

For users who can't use a mouse:

```swift
// GOOD: Button is accessible
Button(action: save) {
    Text("Save")
}

// BAD: Only works with mouse hover
Text("Hover for options")
    .onHover { isHovering in
        // Hidden options appear
    }

// GOOD: Use menus for secondary options
Button(action: {}) {
    Label("More", systemImage: "ellipsis")
}
.help("More options (press ? for help)")

// BAD: Requires drag-and-drop
Text("Drag to move")
    .gesture(DragGesture())
```

---

## Switch Control Integration

### What Is Switch Control?

Switch Control lets users navigate macOS using 1-4 physical switches (buttons) instead of mouse/keyboard. It:

1. **Scans** the interface (highlights items sequentially)
2. **User presses** a switch to select highlighted item
3. **Selected item** shows options (click, drag, type)

### Making Your App Work with Switch Control

**Good news:** If your app is VoiceOver-accessible, it's mostly Switch Control compatible.

**Better news:** SwiftUI handles most of this automatically.

#### 1. Buttons Must Be Accessible

```swift
// Switch Control will find and activate this
Button(action: insertText) {
    Text("A")
}
.accessibilityAddTraits(.isButton)
```

#### 2. Add Custom Actions for Complex Controls

```swift
struct KeyButton: View {
    let key: KeyDefinition
    
    var body: some View {
        Button(action: pressKey) {
            Text(key.display)
        }
        .accessibilityLabel("Key \(key.display)")
        // Primary action (what happens on single press)
        .accessibilityAction(.activate) {
            pressKey()
        }
        // Optional secondary actions
        .accessibilityAction(named: "Hold") {
            repeatKey()
        }
    }
}
```

#### 3. Navigation Must Be Logical

Switch Control scans in Tab order. Ensure your `@FocusState` creates sensible scanning paths:

```swift
// This scanning order makes sense: left-to-right, top-to-bottom
VStack {
    HStack {
        Button("Q")  // Scanned 1st
        Button("W")  // Scanned 2nd
        Button("E")  // Scanned 3rd
    }
    HStack {
        Button("A")  // Scanned 4th
        Button("S")  // Scanned 5th
    }
}
```

### Testing with Switch Control

**Enable:** System Settings → Accessibility → Switch Control → On

**Simulate single switch:**
- Use Space key to press switch
- Watch as interface highlights items sequentially

---

## Dwell & Head Tracking

### What Is Dwell Control?

**Dwell** lets users select items by holding their cursor steady for a configurable time (default 1 second). Perfect for users who can move cursor with eye tracker but can't click.

**Head Tracking** lets users move cursor with head movement, tracked via camera.

### How Your App Integrates

Good news: **You don't build dwell or head tracking**. They're built into macOS:

- System Settings → Accessibility → Eye Tracking
- System Settings → Accessibility → Dwell Control

When user has dwell enabled:
1. User's eye tracker or mouse cursor positions over your button
2. After ~1 second, macOS auto-clicks
3. Your button's action fires

**Your job:** Make buttons BIG and have clear click targets.

### Optimizing for Dwell Users

```swift
// Good button size for dwell
struct KeyButton: View {
    let key: KeyDefinition
    
    var body: some View {
        Button(action: {}) {
            Text(key.display)
                .font(.title)
                .frame(minWidth: 60, minHeight: 60)  // Big enough for dwell
        }
        .cornerRadius(8)
    }
}

// Provide visual feedback
struct DwellButton: View {
    @State private var isHovering = false
    let action: () -> Void
    let label: String
    
    var body: some View {
        Button(action: action) {
            Text(label)
        }
        .onHover { hovering in
            isHovering = hovering
            if hovering {
                // Visual cue that dwell is starting
                NSSound.beep()
            }
        }
        .background(isHovering ? Color.blue.opacity(0.3) : Color.clear)
    }
}
```

### Dwell Timing Considerations

```swift
// Don't have time-limited interactions
@State private var timeRemaining = 5

var body: some View {
    Text("You have \(timeRemaining) seconds")
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
                timeRemaining -= 1
            }
        }
    // Bad! Dwell users can't click in time
}

// Instead: No time limits
var body: some View {
    Text("Click when ready")
    Button("Submit") { }
    // Good! User can dwell as long as needed
}
```

---

## Contrast & Typography

### Contrast Standards

**WCAG AA (minimum standard):** 4.5:1 for body text, 3:1 for large text

**Checking contrast:**
1. Use Xcode's accessibility inspector (Cmd+Opt+A)
2. Or online tool: https://www.tpgi.com/color-contrast-checker/

```swift
// Good contrast (black on white = 21:1)
Text("High contrast")
    .foregroundColor(.black)
    .background(Color.white)

// Acceptable (dark gray on light gray = 7:1)
Text("OK contrast")
    .foregroundColor(Color(white: 0.2))
    .background(Color(white: 0.8))

// Bad (light gray on white = 1.1:1)
Text("Poor contrast")
    .foregroundColor(Color(white: 0.95))
    .background(Color.white)
    // DON'T USE THIS
```

### Typography Best Practices

```swift
// Use semantic sizes (respects system settings)
VStack {
    Text("Large Title")
        .font(.largeTitle)    // 34pt
    
    Text("Title")
        .font(.title)         // 28pt
    
    Text("Body text")
        .font(.body)          // 17pt (default)
    
    Text("Small")
        .font(.caption)       // 12pt
}

// Support Dynamic Type
@Environment(\.sizeCategory) var sizeCategory

var body: some View {
    Text("Respects user's size preference")
        .font(.system(size: 16, weight: .regular))
        // But better: use semantic sizes above
}

// San Francisco is the standard (default in SwiftUI)
Text("Uses San Francisco font")
    .font(.system(.body, design: .default))
```

---

## Testing & Validation

### Comprehensive Accessibility Testing Checklist

#### VoiceOver Testing
- [ ] Enable VoiceOver (Cmd+F5)
- [ ] Navigate through all screens with Ctrl+Opt+arrow
- [ ] Every button has descriptive label
- [ ] Every image has description
- [ ] Text fields have labels
- [ ] Status updates are announced
- [ ] Focus order is logical
- [ ] All interactions work with keyboard

#### Keyboard Navigation Testing
- [ ] Tab moves to next control
- [ ] Shift+Tab moves to previous
- [ ] Tab order is logical
- [ ] No keyboard traps (stuck focus)
- [ ] Enter/Space activates buttons
- [ ] All functions accessible via keyboard
- [ ] No mouse-only interactions

#### Switch Control Testing
- [ ] Enable Switch Control (Accessibility settings)
- [ ] Use Space to simulate switch presses
- [ ] Scan order follows logical flow
- [ ] All interactive elements are scannable
- [ ] No dead-end scanning

#### Contrast Testing
- [ ] All text meets 4.5:1 contrast (AA standard)
- [ ] Large text (18pt+) meets 3:1 contrast
- [ ] Test with Xcode Color Inspector
- [ ] Works in both light and dark modes

#### Motor Accessibility Testing
- [ ] Large touch/click targets (minimum 44x44pt)
- [ ] Buttons have hover feedback
- [ ] No complex gestures required
- [ ] No time limits on interactions
- [ ] No small fine-motor controls

### Using Xcode Accessibility Inspector

```bash
# In Xcode: Cmd+Opt+A
# Or: Xcode → Open Developer Tool → Accessibility Inspector
```

This tool shows:
- VoiceOver description for each element
- Accessibility traits
- Contrast ratios
- Issues flagged

### Testing Matrix

Create a test matrix:

```
Test Case | Input Method | Expected | Pass
----------|--------------|----------|------
Press A | VoiceOver + keyboard | "A" typed | ✓
Press A | Switch Control | "A" typed | ✓
Insert text | Keyboard only | Works | ✓
Delete | Keyboard (Delete key) | Text removed | ✓
Navigation | Tab | Tab order logical | ✓
High contrast | OS dark mode | 4.5:1 ratio | ✓
```

---

## Common Patterns

### Accessible Input Field

```swift
struct AccessibleTextField: View {
    let label: String
    @Binding var value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.headline)
                .foregroundColor(.primary)
            
            TextField("", text: $value)
                .textFieldStyle(.roundedBorder)
                .padding(8)
                .border(Color.blue, width: 2)
                .accessibilityLabel(label)
                .accessibilityHint("Type text here")
        }
    }
}
```

### Accessible Button Group

```swift
struct AccessibleButtonRow: View {
    let buttons: [ButtonConfig]
    
    var body: some View {
        HStack(spacing: 12) {
            ForEach(buttons, id: \.id) { config in
                Button(action: config.action) {
                    Text(config.label)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)  // Touch target size
                }
                .accessibilityLabel(config.label)
                .accessibilityHint(config.hint)
            }
        }
    }
}

struct ButtonConfig {
    let id: String
    let label: String
    let hint: String
    let action: () -> Void
}
```

### Accessible Status Indicator

```swift
struct AccessibleStatusBadge: View {
    enum Status {
        case ready, processing, error
        
        var label: String {
            switch self {
            case .ready: return "Ready"
            case .processing: return "Processing"
            case .error: return "Error"
            }
        }
    }
    
    let status: Status
    
    var body: some View {
        Label(status.label, systemImage: iconName)
            .foregroundColor(foregroundColor)
            .accessibilityLabel(status.label)
            .accessibilityAddTraits(.updatesFrequently)  // Will change dynamically
    }
    
    private var iconName: String {
        switch status {
        case .ready: return "checkmark.circle.fill"
        case .processing: return "hourglass"
        case .error: return "xmark.circle.fill"
        }
    }
    
    private var foregroundColor: Color {
        switch status {
        case .ready: return .green
        case .processing: return .blue
        case .error: return .red
        }
    }
}
```

### Accessible Modal/Alert

```swift
struct AccessibleAlert: View {
    @Binding var isPresented: Bool
    let title: String
    let message: String
    let actions: [AlertAction]
    
    var body: some View {
        if isPresented {
            ZStack {
                Color.black.opacity(0.5)
                    .ignoresSafeArea()
                    .accessibilityHidden(true)
                
                VStack(spacing: 16) {
                    Text(title)
                        .font(.headline)
                        .accessibilityAddTraits(.isHeader)
                    
                    Text(message)
                    
                    HStack(spacing: 12) {
                        ForEach(actions, id: \.label) { action in
                            Button(action: action.handler) {
                                Text(action.label)
                                    .frame(maxWidth: .infinity)
                            }
                            .keyboardShortcut(action.keyboardShortcut, modifiers: [])
                        }
                    }
                }
                .padding()
                .background(Color.white)
                .cornerRadius(12)
                .accessibilityElement(children: .contain)
            }
        }
    }
}

struct AlertAction {
    let label: String
    let keyboardShortcut: KeyboardShortcut?
    let handler: () -> Void
}
```

---

## Accessibility Best Practices Summary

### Do's ✓

- Provide descriptive labels for all controls
- Use semantic colors and sufficient contrast
- Support full keyboard navigation
- Test with VoiceOver enabled
- Respect user's system settings
- Provide alt text for images
- Make clickable areas at least 44x44 points
- Announce status changes
- Support keyboard shortcuts
- Test with actual assistive technologies

### Don'ts ✗

- Don't rely solely on color to convey information
- Don't hide content behind hover states only
- Don't require mouse or trackpad
- Don't implement time limits on interactions
- Don't use auto-playing sounds
- Don't create keyboard traps
- Don't ignore VoiceOver hints
- Don't make text too small
- Don't use complex gestures
- Don't assume how users interact

---

## Resources

### Official Apple Documentation

- [WWDC 2024: Catch up on Accessibility in SwiftUI](https://developer.apple.com/videos/play/wwdc2024/10073/)
- [Accessibility in SwiftUI](https://developer.apple.com/documentation/swiftui/view-accessibility)
- [macOS Accessibility Features](https://support.apple.com/guide/accessibility-mac/welcome/mac)
- [NSAccessibility Protocol](https://developer.apple.com/documentation/appkit/nsaccessibility)

### External Resources

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [The A11Y Project](https://www.a11yproject.com/)

---

**Last Updated:** February 27, 2026  
**Next Review:** June 2026  
**Maintained By:** September Team
