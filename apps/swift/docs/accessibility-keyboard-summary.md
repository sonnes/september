# macOS Accessibility Keyboard - Implementation Summary

**Date:** February 27, 2026  
**Research Completion:** Comprehensive technical research completed  
**See Full Documentation:** `/macOS_ACCESSIBILITY_KEYBOARD_RESEARCH.md`

---

## Quick Reference: Essential Components

### 1. Event Handling Strategy (Choose One)

#### Option A: **Input Monitoring (CGEventTap + listenOnly)** ✓ RECOMMENDED FOR SEPTEMBER
- **Permissions:** Input Monitoring only (works in sandbox)
- **Complexity:** Medium
- **Sandbox:** YES
- **Best for:** Apps targeting App Store + maximum compatibility
```swift
let tap = CGEventTapCreate(tap: .cghidEventTap, place: .headInsertEventTap, 
                           options: .listenOnly, eventMask: eventMask,
                           callback: handleKeyEvent, userInfo: nil)
```

#### Option B: NSEvent Global Monitor
- **Permissions:** Accessibility (better but not in sandbox)
- **Complexity:** Low
- **Sandbox:** NO
- **Best for:** Non-sandboxed desktop apps with full Accessibility access

#### Option C: IOHIDManager
- **Permissions:** Input Monitoring (hardware level)
- **Complexity:** High (C API, pointer management)
- **Sandbox:** YES (with Input Monitoring)
- **Best for:** Only if CGEventTap insufficient; requires Objective-C wrapper

---

### 2. Text Injection Strategy (Layered Approach)

Implement in priority order, fall back as needed:

```swift
func injectText(_ text: String) {
    if canUseCGEventPost() {           // Non-sandboxed + Accessibility
        injectViaCGEvent(text)         // Fastest
    } else if canUseAppleScript() {    // Any app with Automation permission
        injectViaAppleScript(text)     // Reliable fallback
    } else {
        injectViaPasteboard(text)      // Last resort (remote sessions, etc.)
    }
}
```

| Method | Speed | Compatibility | Permission | Notes |
|--------|-------|---------------|-----------|-------|
| **CGEvent.post()** | ⚡⚡⚡ Fast | High | Accessibility | Blocked in sandbox |
| **AppleScript keystroke** | ⚡⚡ Medium | Very High | Post Event | Works across security boundaries |
| **NSPasteboard + Cmd+V** | ⚡ Slow | Medium | None needed | Works in remote/restricted contexts |

---

### 3. Window Management

**Create floating keyboard that doesn't steal focus:**

```swift
// In NSWindowDelegate or AppKit window setup
if let window = NSApplication.shared.windows.first {
    window.styleMask = [.nonactivatingPanel, .titled, .closable]
    window.level = .floating
    window.isFloatingPanel = true
    window.collectionBehavior.insert(.fullScreenAuxiliary)
    window.canBecomeKey = false
    window.hidesOnDeactivate = false  // Keep visible when app inactive
}
```

**Result:** Panel floats above all windows, doesn't steal focus, stays visible during video calls/presentations.

---

### 4. Accessibility Integration

Make keyboard buttons discoverable to Dwell, Head Tracking, and Switch Control:

```swift
class AccessibilityKeyButton: NSButton {
    let keyCharacter: String
    
    override var accessibilityLabel: String? {
        get { "Key: \(keyCharacter)" }
        set { }
    }
    
    override func accessibilityPerformAction(name: NSAccessibilityActionName,
                                             with value: Any? = nil) -> Bool {
        if name == .press {
            injectText(keyCharacter)  // Let Dwell/Switch Control trigger key
            return true
        }
        return super.accessibilityPerformAction(name: name, with: value)
    }
}
```

**What This Enables:**
- ✓ Dwell Control can click buttons (user rests cursor on key)
- ✓ Head Tracking controls pointer (built-in macOS feature)
- ✓ Switch Control navigates between buttons (automatic)
- ✓ VoiceOver can announce button labels

---

### 5. Permissions Setup

**In Xcode Project Settings:**

```xml
<!-- YourApp.entitlements -->
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <false/>  <!-- or true, but limits accessibility -->
    
    <key>com.apple.security.automation</key>
    <true/>  <!-- For AppleScript keystroke -->
</dict>
</plist>
```

**In Info.plist:**

```xml
<key>NSAccessibilityUsageDescription</key>
<string>September needs Accessibility access to help users with motor difficulties send text to any application.</string>

<key>NSAppleEventsUsageDescription</key>
<string>September uses automation to send keystrokes to applications.</string>
```

**What Users See:**
1. First launch: "September needs Accessibility permission"
2. User clicks "Open System Preferences"
3. Settings opens: Privacy & Security > Accessibility
4. User adds September to list
5. App fully functional

---

### 6. Custom Panel Generation

Rather than using Apple's Panel Editor, generate `.ascconfig` bundles programmatically:

```swift
func createAccessibilityKeyboardPanel() {
    let panelPath = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/com.apple.AssistiveControl")
        .appendingPathComponent("September.ascconfig")
    
    // Create bundle structure
    try? FileManager.default.createDirectory(at: panelPath, withIntermediateDirectories: true)
    
    // PanelDefinitions.plist with button layout
    let buttons = [
        (label: "Hello", action: "Hello"),
        (label: "How are you?", action: "How are you?"),
        // ... more buttons
    ]
    
    var panelObjects: [[String: Any]] = []
    for (idx, button) in buttons.enumerated() {
        panelObjects.append([
            "Rect": "{\(CGFloat(idx % 5) * 100), \(CGFloat(idx / 5) * 60)}, {100, 60}",
            "DisplayText": button.label,
            "FontSize": 14,
            "DisplayColor": [1.0, 1.0, 1.0, 1.0],
            "Actions": [[
                "ActionType": "ActionPressKeyCharSequence",
                "ActionData": ["KeySequence": button.action]
            ]]
        ])
    }
    
    let panelDef: [String: Any] = ["PanelObjects": panelObjects]
    let resourcesPath = panelPath.appendingPathComponent("Resources")
    try? FileManager.default.createDirectory(at: resourcesPath, withIntermediateDirectories: true)
    
    try? (panelDef as NSDictionary).write(
        toFile: resourcesPath.appendingPathComponent("PanelDefinitions.plist").path,
        atomically: true
    )
}
```

**Result:** Custom panels appear automatically in Accessibility Keyboard app.

---

## Built-in macOS Features (Don't Reimplement)

These are provided by macOS; you just integrate:

| Feature | Location | Your Role |
|---------|----------|-----------|
| **Dwell Control** | System Preferences > Accessibility > Pointer Control > Dwell | Implement proper accessibility labels; let Dwell click your buttons |
| **Head Tracking** | System Preferences > Accessibility > Pointer Control > Head Tracking | Don't interfere with pointer position; handle cursor movement in your window |
| **Switch Control** | System Preferences > Accessibility > Switch Control | Make UI fully accessible (Tab navigation, focus, NSAccessibility methods) |
| **Voice Control** | System Preferences > Accessibility > Voice Control | Use accessibility labels so Voice Control can name buttons |

---

## Critical Gotchas & Workarounds

### ✗ Problem: "It works in Xcode but not after code signing"
**Cause:** CGEventTap invalidates after re-signing  
**Solution:** Always relaunch app after code-signing changes

### ✗ Problem: "Sandbox + Accessibility permission don't work together"
**Cause:** Apple's security model blocks Accessibility in sandboxed apps  
**Solution:** Build as non-sandboxed app, OR use Input Monitoring instead of Accessibility

### ✗ Problem: "macOS Sequoia: Permission expires every 30 days"
**Cause:** Security feature in Sequoia 15.0+  
**Solution:** Check permission monthly, prompt user to re-grant

### ✗ Problem: "Text injection works for some apps but not others"
**Cause:** Different apps accept input differently (some block, some use remote protocols)  
**Solution:** Provide all three methods; let users know some apps may not work

### ✗ Problem: "Floating keyboard steals focus"
**Cause:** Missing `.nonactivatingPanel` styleMask  
**Solution:** Use exact configuration above

---

## Implementation Roadmap for September

### Phase 1: Foundation (Week 1-2)
- [ ] Set up non-sandboxed macOS app
- [ ] Create floating NSPanel UI with SwiftUI
- [ ] Implement basic permission checking/requesting
- [ ] Add sample keyboard buttons

### Phase 2: Event Monitoring (Week 2-3)
- [ ] Implement CGEventTap with Input Monitoring
- [ ] Add fallback NSEvent monitor (non-sandbox)
- [ ] Test event monitoring is working

### Phase 3: Text Injection (Week 3-4)
- [ ] Implement CGEvent.post() for non-sandbox
- [ ] Implement AppleScript keystroke fallback
- [ ] Implement NSPasteboard + Cmd+V fallback
- [ ] Test injection in various apps

### Phase 4: Accessibility (Week 4-5)
- [ ] Add proper NSAccessibility labels/roles to buttons
- [ ] Test with Dwell Control enabled
- [ ] Test with Head Tracking enabled
- [ ] Test with Switch Control enabled
- [ ] Test with VoiceOver

### Phase 5: Custom Panels (Week 5-6)
- [ ] Implement panel generation code
- [ ] Create sample panel bundles
- [ ] Test panels appear in Accessibility Keyboard

### Phase 6: Polish (Week 6+)
- [ ] User setup/onboarding flow
- [ ] Documentation of permission requirements
- [ ] Handle edge cases and app-specific issues
- [ ] Performance optimization

---

## Testing Checklist

Before considering feature complete:

### Permission & Setup
- [ ] First launch: Permission prompt appears correctly
- [ ] User can find Accessibility permission in System Preferences
- [ ] After granting permission, app works
- [ ] App handles permission denial gracefully
- [ ] Works on macOS 12 Monterey through Sequoia

### Input Monitoring
- [ ] CGEventTap registers events correctly
- [ ] Events fire for all key types
- [ ] Handles event tap timeout (30 second silence)
- [ ] Re-enables tap if it disables

### Text Injection
- [ ] Works in Safari text input
- [ ] Works in TextEdit
- [ ] Works in Mail compose window
- [ ] Works in chat applications (Discord, Slack, etc.)
- [ ] Graceful degradation if CGEvent.post() fails
- [ ] Falls back to AppleScript
- [ ] Falls back to NSPasteboard if needed

### Accessibility
- [ ] Accessibility Inspector shows all buttons
- [ ] Dwell Control can trigger buttons (enable, wait, verify click)
- [ ] Head Tracking controls pointer (enable, move head, verify pointer follows)
- [ ] Switch Control can navigate (enable, use switch, verify tabbing)
- [ ] VoiceOver announces button labels correctly

### Window Behavior
- [ ] Panel stays on top of other windows
- [ ] Panel doesn't steal focus when user types elsewhere
- [ ] Panel stays visible during fullscreen app/video call
- [ ] Panel can be moved (drag title bar)
- [ ] Panel can be closed

---

## Architecture Decision: Sandboxed vs Non-Sandboxed

### Recommendation: **Non-Sandboxed**

**Why:**
- Full Accessibility API access
- Can use CGEvent.post() for fast text injection
- Simpler permission model
- Better compatibility with legacy apps

**Trade-off:**
- Not eligible for App Store distribution
- Users must trust app with system access
- More security-conscious users may be reluctant

**If App Store Distribution Required:**
Use Input Monitoring (CGEventTap + listenOnly) + AppleScript fallback. You lose the ability to observe all events and inject text directly, but retain core functionality.

---

## Performance Considerations

| Operation | Timing | Notes |
|-----------|--------|-------|
| CGEventTap callback | < 1ms | Very fast; don't block |
| NSEvent monitoring | ~1-2ms | Slightly slower |
| CGEvent.post() | ~5-10ms per keystroke | Acceptable for typing |
| AppleScript keystroke | ~50-100ms | Slower; batch if possible |
| NSPasteboard + Cmd+V | ~100-200ms | Slowest but works everywhere |

**Recommendation:** Inject text via CGEvent.post() when available, fall back to AppleScript for better compatibility, use NSPasteboard as last resort.

---

## Security Considerations

**What September Accesses:**
- Keyboard input from all applications (via event tap)
- Focused application identity (via AXUIElement)
- Ability to send keystrokes to any app

**User Trust:**
- Clearly explain why these permissions are needed
- Be transparent about what data is accessed
- Never log/transmit user keystrokes
- Provide local-only operation (no cloud)

**Apple's Perspective:**
- Accessibility features are security-sensitive
- Apps requesting Accessibility get extra scrutiny
- Users must explicitly grant permission
- Permission can be revoked at any time

---

## Further Reading

**Full Research Document:** See `macOS_ACCESSIBILITY_KEYBOARD_RESEARCH.md` for:
- Complete API references for all frameworks
- Detailed code patterns for every approach
- Known bugs and workarounds
- Third-party libraries and references
- Comparison tables and decision trees

**Official Apple Documentation:**
- [Accessibility Programming Guide](https://developer.apple.com/library/archive/documentation/Accessibility/Conceptual/AccessibilityMacOSX/)
- [App accessibility for Switch Control (WWDC20)](https://developer.apple.com/videos/play/wwdc2020/10019/)
- [NSPanel Documentation](https://developer.apple.com/documentation/appkit/nspanel)
- [CGEvent Documentation](https://developer.apple.com/documentation/coregraphics/cgevent)

**Community Resources:**
- [AXSwift on GitHub](https://github.com/tmandry/AXSwift) - Swift accessibility wrapper
- [NSHipster: Accessibility Keyboard](https://nshipster.com/accessibility-keyboard/) - Panel format deep-dive
- [CGEventSupervisor on GitHub](https://github.com/stephancasas/CGEventSupervisor) - Modern Swift event handling

---

**Status:** ✓ Research Complete  
**Next Step:** Prototype Phase 1 (NSPanel + permissions)

