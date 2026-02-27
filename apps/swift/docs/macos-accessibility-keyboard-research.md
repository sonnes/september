# macOS Accessibility Keyboard Development: Comprehensive Research

**Date:** February 27, 2026
**Objective:** Document all relevant macOS accessibility APIs, frameworks, and techniques for building an on-screen accessibility keyboard supporting dwell control, head tracking, switch control integration, and custom panels.

---

## Executive Summary

Building a macOS Accessibility Keyboard requires integrating multiple specialized frameworks spanning event handling, window management, text input, and accessibility APIs. The solution involves three distinct event handling approaches (NSEvent, CGEvent, IOHIDManager) with different permission and capability trade-offs, combined with custom window management for floating UI that doesn't steal focus.

**Key Findings:**
- Event injection requires either **Accessibility permission** (for NSEvent/AppleScript) or **Input Monitoring permission** (for CGEventTap)
- Sandboxed apps cannot use `CGEventPost()` to simulate keyboard input; they must use either Input Monitoring with CGEventTap or request Accessibility permission
- Custom panels are stored as `.ascconfig` bundles with `PanelDefinitions.plist` XML format
- NSPanel with `.nonactivatingPanel` styleMask provides floating UI without stealing focus
- Head tracking and dwell control are built-in macOS features (not custom-implemented); your app integrates via Accessibility API
- Switch Control integration happens automatically for accessible UI; custom actions enhance Switch Control support

---

## Part 1: Core Accessibility Frameworks

### 1.1 AXUIElement (ApplicationServices Framework)

**What It Does:**
C-level API for accessibility automation and control of macOS applications. Used for querying, monitoring, and controlling accessibility attributes of UI elements.

**Key Classes/Functions:**
- `AXUIElement` - C struct representing a UI element
- `AXUIElementCreateSystemWide()` - Get the application element for the system
- `AXUIElementCreateApplication(pid_t pid)` - Get app element by process ID
- `AXUIElementCopyAttributeValue()` - Read attribute values
- `AXUIElementSetAttributeValue()` - Modify attributes
- `AXUIElementPerformAction()` - Execute actions
- `AXObserverCreate()` - Register for accessibility notifications
- `AXUIElementCopyActionDescription()` - Get action descriptions

**Required Permissions:**
- `kTCCServiceAccessibility` - System permission in Privacy & Security > Accessibility

**Sandbox Compatibility:**
- NOT compatible with App Sandbox
- If app is sandboxed with Accessibility permission enabled, `AXIsProcessTrusted()` always returns false
- Workaround: Use CGEventTap with Input Monitoring instead (supported in sandbox)

**Code Pattern (Objective-C):**
```objc
AXUIElement appElement = AXUIElementCreateApplication(pid);
CFTypeRef value;
AXUIElementCopyAttributeValue(appElement, kAXFocusedUIElementAttribute, &value);
AXUIElement focusedElement = (AXUIElement)value;
```

**Common Use Cases:**
- Detecting which app/window has focus
- Reading text from focused input fields
- Performing clicks on accessible elements
- Detecting when UI changes (via accessibility notifications)

---

### 1.2 NSAccessibility Protocol (AppKit)

**What It Does:**
Modern method-based API for making custom views and controls accessible. If you use standard AppKit controls, much accessibility is automatic.

**Key Properties/Methods:**
- `accessibilityRole` - UI role (button, text field, etc.)
- `accessibilityLabel` - Display label
- `accessibilityValue` - Current value
- `accessibilityEnabled` - Is control interactive?
- `accessibilityPerformAction(name:)` - Perform action methods
- `accessibilityChildrenInNavigationOrder` - Custom view hierarchy

**Required Permissions:**
- Accessibility automatically available to your own app's views
- External apps need `kTCCServiceAccessibility` to introspect

**Sandbox Compatibility:**
- Fully compatible within your own app's views
- Requires special handling for external app accessibility

**Code Pattern (Swift):**
```swift
class CustomButton: NSButton {
    override var accessibilityLabel: String? {
        get { "Custom Button" }
        set { }
    }
    
    override func accessibilityPerformAction(name: NSAccessibilityActionName, 
                                              with value: Any? = nil) -> Bool {
        if name == .press {
            // Handle click
            return true
        }
        return super.accessibilityPerformAction(name: name, with: value)
    }
}
```

**Important Notes:**
- Replaces deprecated `NSAccessibility` informal protocol
- Apple strongly recommends method-based API
- Custom controls drawn by containing view need NSAccessibilityElement subclass

---

### 1.3 Accessibility Framework (Modern)

**What It Does:**
Swift-native accessibility API introduced in recent macOS versions for querying and monitoring accessibility features.

**Key Components:**
- `AccessibilityFramework` - Modern Swift interface
- Works alongside AXUIElement for compatibility

**Sandbox Compatibility:**
- Supported in sandboxed apps with appropriate permissions

---

## Part 2: Event Handling & Input Simulation

### 2.1 Three Ways to Handle Keyboard Events (Event Stack)

macOS keyboard events pass through three distinct levels from highest to lowest:

#### **Level 1: NSEvent (AppKit/Cocoa)**

**What It Does:**
Highest-level Cocoa event handling. NSEvent encapsulates key codes and modifier flags.

**Key Functions:**
- `NSEvent.addGlobalMonitor(for eventMask:, handler:)` - Monitor all events system-wide
- `NSEvent(keyCode:modifierFlags:)` - Create synthetic event

**Permissions Required:**
- Accessibility permission (`kTCCServiceAccessibility`)

**Limitations:**
- Cannot distinguish left/right modifier keys (uses same flags)
- Cannot modify received events (listen-only)
- Does not work in all security contexts
- Some apps with Secure Keyboard Entry cannot be monitored

**Sandbox Compatibility:**
- NOT compatible with App Sandbox

**Use Case:**
Simple global hotkey monitoring in non-sandboxed apps.

---

#### **Level 2: CGEvent (Quartz/CoreGraphics)**

**What It Does:**
Intermediate level providing granular control and event tapping capability.

**Key Functions for Event Monitoring:**
- `CGEventTapCreate(tap: CGEventTapLocation, place: CGEventTapPlacement, options: CGEventTapOptions, eventMask: CGEventMask, callback: CGEventTapCallBack, userInfo: UnsafeMutableRawPointer?) -> CFMachPort?`
- `CGEventTapEnable(tap:, enable:)`
- `CGEvent(source:, type:, location:)` - Create synthetic event
- `CGEvent.post(tap:)` - Send event to system

**Permissions (for Different Operations):**

| Operation | Permission | Sandbox OK? |
|-----------|-----------|-----------|
| `CGEventTap` with `.defaultTap` | Accessibility | NO |
| `CGEventTap` with `.listenOnly` | Input Monitoring | YES |
| `CGEvent.post()` | Accessibility or Post Event | NO |

**Important: Permission Functions:**
- `CGPreflightListenEventAccess()` - Check if Input Monitoring permission is granted
- `CGRequestListenEventAccess()` - Request Input Monitoring permission (shows popup)

**Advantages Over NSEvent:**
- Can distinguish left/right modifier keys
- Can modify events in real-time (`CGEventTapCreate` with `.defaultTap`)
- `listenOnly` variant works in sandboxed apps
- More reliable event delivery

**Limitations:**
- Cannot be modified with `.listenOnly` (only monitoring)
- CGEventPost not available in sandboxed apps
- May have timing issues with rapid event sequences
- Some apps (Adobe) behave unexpectedly if observed
- After code-signing, taps may silently fail (must relaunch app)

**Sandbox Compatibility:**
- `.listenOnly` CGEventTap: YES (with Input Monitoring permission)
- `.defaultTap` CGEventTap: NO
- `CGEvent.post()`: NO (sandbox violation)

**Code Pattern (Swift):**
```swift
let eventMask: CGEventMask = (1 << CGEventType.keyDown.rawValue) | 
                              (1 << CGEventType.keyUp.rawValue)

let tap = CGEventTapCreate(
    tap: .cghidEventTap,
    place: .headInsertEventTap,
    options: .listenOnly,  // or .defaultTap for modification
    eventMask: eventMask,
    callback: { (tapProxy, type, event, userInfo) -> Unmanaged<CGEvent>? in
        // Handle event
        return Unmanaged.passRetained(event)
    },
    userInfo: nil
)

if let machPort = tap {
    let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, machPort, 0)
    CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
}
```

---

#### **Level 3: IOHIDManager (IOKit)**

**What It Does:**
Direct hardware-level HID (Human Interface Device) access. Lowest-level, most powerful but most complex.

**Key Functions:**
- `IOHIDManagerCreate()` - Create HID manager
- `IOHIDManagerSetDeviceMatching()` - Filter devices (keyboards, mice, etc.)
- `IOHIDManagerRegisterInputValueCallback()` - Register callback for events
- `IOHIDManagerOpen()` - Open manager and request Input Monitoring permission

**Permissions Required:**
- Input Monitoring (`kTCCServiceInputMonitoring`)
- Automatically requested when `IOHIDManagerOpen()` is called on macOS 11+

**Advantages:**
- Direct hardware access
- Can read raw HID reports
- Works before normal event system
- Most reliable for detecting all input

**Disadvantages:**
- Very complex C API (pointers, CFTypes)
- Painful to use from Swift (requires Objective-C wrapper)
- Overkill for most accessibility keyboard scenarios
- Requires careful memory management

**Sandbox Compatibility:**
- Input Monitoring permission is available even to sandboxed apps (macOS 10.15+)
- IOHIDManager itself works in sandbox

**Code Pattern (Objective-C wrapper needed):**
```objc
IOHIDManagerRef manager = IOHIDManagerCreate(kCFAllocatorDefault, kIOHIDOptionsTypeNone);
IOHIDManagerSetDeviceMatching(manager, NULL); // All devices
IOHIDManagerRegisterInputValueCallback(manager, handleInputValue, (__bridge void *)self);
IOHIDManagerOpen(manager, kIOHIDOptionsTypeNone);
```

**When to Use IOHIDManager:**
- Building a system-wide keyboard interceptor that works in all contexts
- Detecting raw hardware input before OS processing
- Building a driver-like accessibility tool
- Need for lowest-level control

---

### 2.2 Event Injection / Keyboard Simulation

**Key Challenge:** Simulating keyboard input is heavily restricted on macOS for security reasons.

#### **Method 1: CGEvent.post() - Quartz Events**

**Restrictions:**
- **NOT available in sandboxed apps** - results in sandbox violation
- Requires Accessibility permission
- Most direct method but heavily restricted

**Code:**
```swift
let event = CGEvent(keyboardEventSource: nil, virtualKey: 0x31, keyDown: true)
event?.post(tap: .cghidEventTap)
```

**When Available:**
- Non-sandboxed apps with Accessibility permission
- System utilities outside App Sandbox

---

#### **Method 2: AppleScript/System Events - Automation**

**Permissions:**
- Requires `kTCCServicePostEvent` permission (Automation + Accessibility)
- Works in sandboxed apps if properly entitlemented

**Approach:**
Send `keystroke` command to System Events via AppleScript or OSAKit

**Advantages:**
- Works in some sandboxed contexts
- Uses legitimate automation API
- Respects app security boundaries

**Limitations:**
- Slower than direct event injection
- Limited to what AppleScript can do
- Subject to app focus changes

**Code Pattern (AppleScript):**
```applescript
tell application "System Events"
    keystroke "Hello"
    key code 36  -- Return key
end tell
```

---

#### **Method 3: NSPasteboard + Keyboard Shortcut**

**Approach:**
Copy text to pasteboard, then simulate Command-V to paste

**Advantages:**
- Works in many contexts including remote sessions
- Respects clipboard
- Some sandboxed compatibility

**Limitations:**
- Slower than direct input
- Modifies clipboard
- Only works with paste-accepting apps
- Not suitable for rapid input

**Code Pattern (Swift):**
```swift
let pasteboard = NSPasteboard.general
pasteboard.clearContents()
pasteboard.setString("Hello", forType: .string)

// Then simulate Cmd+V
let pasteEvent = CGEvent(keyboardEventSource: nil, virtualKey: 9, keyDown: true)
pasteEvent?.flags = .maskCommand
pasteEvent?.post(tap: .cghidEventTap)
```

---

#### **Method 4: Input Method Framework**

**For Text Composition/IME:**
If you need to support input methods (Japanese, Chinese, Korean), use InputMethodKit

**Key Classes:**
- `IMKServer` - Server representing your input method
- `IMKInputController` - Handles text input
- `IMKCandidates` - Shows candidate selection UI

**Sandbox Compatibility:**
- Likely restricted; requires investigation

---

## Part 3: Window Management for Floating Keyboard UI

### 3.1 NSPanel for Floating Windows

**What It Does:**
NSPanel is a special NSWindow subclass designed to float above other windows without stealing focus or appearing in Window menu.

**Key Properties:**
- `isFloatingPanel` - Makes panel float above other windows
- `styleMask: [.nonactivatingPanel, .titled, .closable]`
- `level` - Window layer (`.floating`, `.modalPanel`, etc.)
- `collectionBehavior` - Behavior flags

**Critical Properties for Accessibility Keyboard:**

| Property | Value | Effect |
|----------|-------|--------|
| `styleMask` | `.nonactivatingPanel` | Doesn't activate app on click |
| `level` | `.floating` | Floats above other windows |
| `collectionBehavior` | `.fullScreenAuxiliary` | Works in fullscreen apps |
| `canBecomeKey` | `false` | Never becomes key window |
| `hidesOnDeactivate` | `true` (optional) | Hide when app loses focus |

**Code Pattern (SwiftUI + NSPanel):**
```swift
@main
struct AccessibilityKeyboardApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    if let window = NSApplication.shared.windows.first {
                        window.styleMask = [.nonactivatingPanel, .titled, .closable]
                        window.level = .floating
                        window.isFloatingPanel = true
                        window.collectionBehavior.insert(.fullScreenAuxiliary)
                    }
                }
        }
    }
}
```

**Important Behaviors:**
- Panels by default disappear when app becomes inactive (set `hidesOnDeactivate = false` to prevent)
- Panels don't show in Window menu
- Panels appear in responder chain before main window
- Excellent for staying on top during fullscreen video calls or presentations

---

### 3.2 Focus Handling for Text Input

When your keyboard sends text to focused apps, the receiving app's text input element needs proper focus management.

**Related APIs:**
- `NSTextInputContext` - Manages connection between view and input system
- `NSTextInputClient` protocol - Modern protocol for text input views (replaces `NSTextInput`)
- `inputContext` property - Access the input context

**Implementation:**
Standard AppKit views handle this automatically. For custom text views, implement NSTextInputClient protocol to ensure proper integration with macOS input methods and accessibility features.

---

## Part 4: Dwell Control & Head Tracking

### 4.1 Dwell Control

**Important Note:** Dwell control is a **built-in macOS feature**, not something you implement from scratch.

**What macOS Provides:**
- Users enable Dwell in System Preferences > Accessibility > Pointer Control
- Dwell control monitors pointer position and waits for specified dwell time
- When dwell time expires, it performs the configured action (click, double-click, etc.)

**Your App's Role:**
- Provide UI elements with proper accessibility attributes so Dwell can interact with them
- Make buttons/interactive elements discoverable via Accessibility API
- Optionally provide custom Accessibility actions via `NSAccessibilityCustomAction`

**Dwell Actions Available:**
- Left Click
- Double Click
- Right Click
- Drag & Drop
- Scroll

**Code Pattern for Dwell Integration:**
```swift
class AccessibleButton: NSButton {
    override var accessibilityLabel: String? {
        get { "Click Me" }
        set { }
    }
    
    override func accessibilityPerformAction(name: NSAccessibilityActionName,
                                             with value: Any? = nil) -> Bool {
        if name == .press {
            // Handle button press from Dwell or other accessibility client
            self.performClick(nil)
            return true
        }
        return super.accessibilityPerformAction(name: name, with: value)
    }
}
```

---

### 4.2 Head Tracking / Pointer Control

**Important Note:** Head tracking is a **built-in macOS feature**, not custom-implemented.

**What macOS Provides (macOS Catalina+):**
- Built-in Head Pointer feature in System Preferences > Accessibility > Pointer Control > Head Tracking
- Uses MacBook/iMac camera to track face position
- Maps head movement to cursor movement
- Supports facial expressions as actions (smile, blink, open mouth, etc.)

**Facial Expression Actions:**
- Eye Blink
- Smile
- Open Mouth
- Stick Out Tongue
- Raise Eyebrows
- Scrunch Nose
- Pucker Lips Outwards
- Pucker Lips Left
- Pucker Lips Right

**Your App's Role:**
- Ensure UI is properly accessible
- Don't interfere with pointer control
- Use standard cursor position APIs if needed

**APIs to Query Pointer Position:**
```swift
let mouseLocation = NSEvent.mouseLocation
```

**When to Build Custom Head Tracking:**
- Only if you need custom tracking beyond macOS's built-in Head Pointer
- Requires ARKit or specialized camera/IR tracking hardware
- Experimental; not commonly done

---

## Part 5: Switch Control Integration

### 5.1 Built-in Integration

**Important Note:** Switch Control is a **macOS built-in feature**. Integration happens automatically through the Accessibility API.

**What macOS Provides:**
- Users enable Switch Control in System Preferences > Accessibility > Switch Control
- Switch Control generates synthetic input from switch hardware/buttons
- Works with any accessible UI (via Accessibility API)
- Standard app buttons/controls work automatically

**What Your App Needs:**
- Implement proper accessibility labels and roles
- Ensure all interactive elements are reachable via Tab/arrow keys
- Implement `NSAccessibilityCustomAction` for complex behaviors

**Custom Actions for Switch Control:**

```swift
let customAction = NSAccessibilityCustomAction(
    name: "Favorite",
    handler: { _ in
        // Handle custom action
        return true
    }
)
element.accessibilityCustomActions = [customAction]
```

**When Switch Control User Encounters Your App:**
1. User activates switch
2. Switch Control highlights next accessible element
3. User presses switch again to activate/select
4. Your app's NSAccessibility methods receive the action
5. Your code responds accordingly

---

### 5.2 Testing Switch Control Integration

1. Enable Switch Control: System Preferences > Accessibility > Switch Control
2. Configure one or more switches
3. Navigate your app using only switch input
4. Verify all features are reachable

---

## Part 6: Custom Panels & Keyboard Layouts

### 6.1 Panel File Format (.ascconfig bundles)

Custom Accessibility Keyboard panels are stored as special bundles.

**File Path:**
`~/Library/Application Support/com.apple.AssistiveControl/`

**Bundle Structure:**
```
MyKeyboard.ascconfig/
├── Info.plist
└── Resources/
    ├── PanelDefinitions.plist
    ├── AssetIndex.plist
    └── [image files]
```

**Info.plist Example:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" 
    "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>My Custom Keyboard</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
</dict>
</plist>
```

### 6.2 PanelDefinitions.plist Format

Defines buttons and their layout.

**Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>PanelObjects</key>
    <array>
        <!-- Each button -->
        <dict>
            <key>Rect</key>
            <string>{{10, 10}, {100, 50}}</string>
            
            <key>DisplayText</key>
            <string>Hello</string>
            
            <key>FontSize</key>
            <integer>14</integer>
            
            <key>DisplayColor</key>
            <array>
                <real>1.0</real> <!-- Red -->
                <real>1.0</real> <!-- Green -->
                <real>1.0</real> <!-- Blue -->
                <real>1.0</real> <!-- Alpha -->
            </array>
            
            <key>Actions</key>
            <array>
                <dict>
                    <key>ActionType</key>
                    <string>ActionPressKeyCharSequence</string>
                    
                    <key>ActionData</key>
                    <dict>
                        <key>KeySequence</key>
                        <string>Hello</string>
                    </dict>
                </dict>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

**Action Types:**
- `ActionPressKeyCharSequence` - Type characters
- `ActionAppleScript` - Execute AppleScript
- `ActionSystemEvent` - System event (power, volume, etc.)
- `ActionOpenPanel` - Switch to another panel
- `ActionOpenApplication` - Launch app
- `ActionSpecialKey` - Special keys (Return, Tab, etc.)

### 6.3 Programmatic Panel Generation

**Advantage:** You can generate these `.ascconfig` bundles from code rather than using Apple's Panel Editor.

**Process:**
1. Create directory with `.ascconfig` extension
2. Generate Info.plist
3. Generate PanelDefinitions.plist with button/action layout
4. Place in `~/Library/Application Support/com.apple.AssistiveControl/`
5. Accessibility Keyboard automatically detects new panels

**Code Pattern (Swift):**
```swift
func createPanel(name: String, buttons: [(text: String, action: String)]) {
    let panelPath = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/com.apple.AssistiveControl")
        .appendingPathComponent("\(name).ascconfig")
    
    try? FileManager.default.createDirectory(at: panelPath, withIntermediateDirectories: true)
    
    // Create Info.plist
    let infoPlist: [String: Any] = [
        "CFBundleName": name,
        "CFBundleVersion": "1.0"
    ]
    let infoPlistPath = panelPath.appendingPathComponent("Info.plist")
    try? (infoPlist as NSDictionary).write(toFile: infoPlistPath.path, atomically: true)
    
    // Create PanelDefinitions.plist
    var panelObjects: [[String: Any]] = []
    for (index, button) in buttons.enumerated() {
        let x = CGFloat(index % 5) * 100
        let y = CGFloat(index / 5) * 60
        
        let buttonDict: [String: Any] = [
            "Rect": "{\(x), \(y)}, {100, 50}",
            "DisplayText": button.text,
            "FontSize": 14,
            "DisplayColor": [1.0, 1.0, 1.0, 1.0],
            "Actions": [
                [
                    "ActionType": "ActionPressKeyCharSequence",
                    "ActionData": ["KeySequence": button.action]
                ]
            ]
        ]
        panelObjects.append(buttonDict)
    }
    
    let panelDef: [String: Any] = ["PanelObjects": panelObjects]
    let panelPath = panelPath.appendingPathComponent("Resources/PanelDefinitions.plist")
    try? (panelDef as NSDictionary).write(toFile: panelPath.path, atomically: true)
}
```

---

## Part 7: Accessibility Permissions & Entitlements

### 7.1 Permission Model (TCC - Transparency, Consent, Control)

macOS uses TCC database to track which apps have permission for sensitive features.

**Services Relevant to Accessibility Keyboard:**

| Service | Entitlement | Permission Prompt | Sandbox OK | Use Case |
|---------|-----------|----------|-----------|----------|
| Accessibility | `kTCCServiceAccessibility` | "needs to use the Accessibility feature" | NO | NSEvent monitors, AXUIElement, some AppleScript |
| Input Monitoring | `kTCCServiceInputMonitoring` | "needs to monitor your keyboard input" | YES | CGEventTap (listenOnly), IOHIDManager |
| Post Event | `kTCCServicePostEvent` | "needs to send keystrokes" | Partial | AppleScript keystroke, System Events |

### 7.2 Required Entitlements File (.entitlements)

For accessibility apps, create `YourApp.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" 
    "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Required for posting keyboard events -->
    <key>com.apple.security.automation</key>
    <true/>
    
    <!-- Required if using AXUIElement (not sandboxed apps) -->
    <!-- For sandboxed apps, this doesn't help with Accessibility permission -->
    <key>com.apple.security.accessibility</key>
    <true/>
    
    <!-- For Input Monitoring (works in sandbox) -->
    <key>com.apple.security.device.camera</key>
    <true/>
    
    <!-- Enable/disable app sandboxing -->
    <key>com.apple.security.app-sandbox</key>
    <false/>  <!-- Set to true if using sandbox, but limits accessibility features -->
</dict>
</plist>
```

### 7.3 Info.plist Declarations

Add to `Info.plist`:

```xml
<dict>
    <!-- Description of why app needs Accessibility -->
    <key>NSAccessibilityUsageDescription</key>
    <string>This app needs access to Accessibility features to provide keyboard input for users with motor difficulties.</string>
    
    <!-- Description for Automation -->
    <key>NSAppleEventsUsageDescription</key>
    <string>This app needs to automate keyboard input through System Events.</string>
</dict>
```

### 7.4 Permission Request Flow

**User First Launch:**

1. User runs your app
2. App attempts to access Accessibility or Input Monitoring feature
3. macOS shows permission prompt
4. User clicks "Open System Preferences" → Privacy & Security → Accessibility/Input Monitoring
5. User adds your app to the list
6. Next time app runs, permission is granted

**Checking Permission Status (Swift):**

```swift
// Check Input Monitoring permission (works in sandbox)
import CoreGraphics

if !CGPreflightListenEventAccess() {
    // Not granted
    CGRequestListenEventAccess()  // Request it
}

// Check Accessibility permission (non-sandbox only)
import ApplicationServices

let trusted = AXIsProcessTrustedWithOptions(
    [kAXTrustedCheckOptionPrompt.takeRetainedValue() as String: true] as CFDictionary
)
```

### 7.5 Sandboxed vs Non-Sandboxed Approach

**For Accessibility Keyboard, Apple's recommendation:**

| Approach | Sandbox | Accessibility Permission | Input Monitoring | Event Injection | Status |
|----------|---------|----------|----------|----------|--------|
| **Recommended** | YES | NO (limited) | YES | AppleScript/NSPasteboard + Cmd+V | ✓ Works in App Store |
| **Full Featured** | NO | YES | YES | CGEvent.post() | ✓ Powerful, not App Store |
| **Hybrid** | YES | Partial | YES | Limited to AppleScript | ✓ Compromise |

**Sandboxed App Issue:**
- Enabling App Sandbox prevents Accessibility permission prompt from appearing
- `AXIsProcessTrusted()` always returns false in sandboxed app
- Workaround: Use Input Monitoring with CGEventTap (`.listenOnly`) instead

**Recommended Architecture for Maximum Compatibility:**
1. Build main app as **non-sandboxed** to access full Accessibility API
2. Request Accessibility permission on first launch
3. Fall back to Input Monitoring for event monitoring in restricted contexts
4. Use AppleScript for keyboard injection when CGEvent.post() unavailable

---

## Part 8: Input Methods & Text Handling

### 8.1 InputMethodKit Framework

For advanced text input scenarios (composition, IMEs), use InputMethodKit.

**Key Classes:**
- `IMKServer` - Represents your input method
- `IMKInputController` - Handles text input and composition
- `IMKCandidates` - Shows candidate selection UI
- `IMKTextInput` protocol - Client app interface

**Architecture:**
- Input Method acts as server
- Text applications are clients
- Communication via NSConnection (Distributed Objects)

**When to Use:**
- Building input method for non-English languages (Japanese, Chinese, Korean)
- Need composition/candidate selection
- Complex text entry scenarios

**Sandbox Compatibility:**
- Likely restricted; InputMethodKit has system-level access requirements

---

### 8.2 NSTextInputClient Protocol

For custom text input views in your keyboard app or receiving apps.

**Key Methods to Implement:**
```swift
protocol NSTextInputClient {
    func insertText(_ string: Any, replacementRange: NSRange)
    func doCommandBySelector(_ selector: Selector)
    func setMarkedText(_ string: Any, selectedRange: NSRange, replacementRange: NSRange)
    func unmarkText()
}
```

**Use Case:**
If your accessibility keyboard has its own text input field for composing messages, implement NSTextInputClient for proper IME and input method support.

---

## Part 9: Limitations & Gotchas

### 9.1 Accessibility API Limitations

| Issue | Impact | Workaround |
|-------|--------|-----------|
| **Sandboxed + Accessibility = no permission** | Sandbox prevents Accessibility popup; AXIsProcessTrusted() always false | Use Input Monitoring with CGEventTap instead |
| **CGEventPost blocked in sandbox** | Cannot inject keyboard events from sandboxed app | Use AppleScript `keystroke` or NSPasteboard + Cmd+V |
| **Code-signing breaks CGEventTap** | After re-signing, taps silently fail; must relaunch app | Always relaunch app after code signing changes |
| **Secure Keyboard Entry blocks monitoring** | Some apps block all event monitoring | No workaround; respect app's security choice |
| **Adobe apps drop events if observed** | Observing inputs in Adobe apps causes input loss | Don't monitor Adobe app input; document limitation |
| **macOS Sequoia monthly permission reset** | Starting 15.0, Accessibility permission expires monthly | Users must re-grant monthly (security feature) |

### 9.2 Event Handling Gotchas

| Issue | Impact | Solution |
|-------|--------|----------|
| **CGEventTap timeout** | Tap goes quiet after ~30 seconds of slow callbacks | Handle `kCGEventTapDisabledByTimeout` and re-enable |
| **Left/right modifier confusion** | NSEvent doesn't distinguish Shift-L from Shift-R | Use CGEvent instead; examine key codes directly |
| **Timing issues with rapid events** | Key up/down events can get out of sync | Add debouncing; queue events |
| **Full Keyboard Access disabled** | Users must manually enable in Accessibility settings | Document requirement; provide setup guide |

### 9.3 Window Management Gotchas

| Issue | Impact | Solution |
|-------|--------|----------|
| **NSPanel hides when app inactive** | Floating keyboard disappears when user switches apps | Set `hidesOnDeactivate = false` |
| **Panel steals focus** | Keyboard becomes key window unexpectedly | Use `.nonactivatingPanel` styleMask; set `canBecomeKey = false` |
| **Window positioning conflicts** | Keyboard overlaps menu bar or dock | Implement smart positioning; detect screen edges |

### 9.4 User Experience Gotchas

| Issue | Impact | Solution |
|-------|--------|----------|
| **Permission prompt confusion** | Users don't understand why app needs Accessibility | Provide clear setup guide; explain in marketing |
| **Delayed permission effect** | After granting permission, feature still doesn't work | Require app restart; show "Restart Required" message |
| **Input lag with dwell** | Dwell timing too slow or unpredictable | Test with actual dwell settings; provide calibration |
| **Keyboard layout not discoverable** | Users don't know custom panels exist | Provide tutorial; document in help |

---

## Part 10: Open-Source References & Community Projects

### 10.1 Notable Swift Projects

**AXSwift** - Swift wrapper for accessibility APIs
- GitHub: [tmandry/AXSwift](https://github.com/tmandry/AXSwift)
- Provides Swift-friendly interface to AXUIElement
- Active maintenance, community usage

**ModDrag** - Window control using Accessibility APIs
- GitHub: [GR0SST/ModDrag](https://github.com/GR0SST/ModDrag)
- Demonstrates keyboard modifier + accessibility interaction
- CLI tool; less relevant but shows patterns

**CGEventSupervisor** - Event monitoring utilities
- GitHub: [stephancasas/CGEventSupervisor](https://github.com/stephancasas/CGEventSupervisor)
- Modern Swift utilities for CGEvent handling
- Good reference for event tap patterns

**KeyboardShortcuts** - Global keyboard shortcuts
- GitHub: [sindresorhus/KeyboardShortcuts](https://github.com/sindresorhus/KeyboardShortcuts)
- Not accessibility-specific, but shows modern Swift patterns for keyboard handling

### 10.2 Technical Articles & References

**NSHipster: Accessibility Keyboard** - [nshipster.com/accessibility-keyboard/](https://nshipster.com/accessibility-keyboard/)
- Technical deep dive into panel format and architecture
- Panel Definition plist structure
- Code generation possibilities

**R0uter's Blog: Three Ways to Intercept Keyboard Events**
- [logcg.com/en/archives/2902.html](https://www.logcg.com/en/archives/2902.html)
- Compares NSEvent vs CGEvent vs IOHIDManager
- Excellent breakdown of event stack levels
- Performance characteristics

**macOS TCC Deep Dive** - HackTricks
- [angelica.gitbook.io](https://angelica.gitbook.io/hacktricks/macos-hardening/macos-security-and-privilege-escalation/macos-security-protections/macos-tcc)
- Comprehensive TCC database documentation
- Permission model and bypass techniques (security research)

---

## Part 11: Architecture Recommendations for September

Based on research, here's recommended architecture for September's macOS accessibility keyboard:

### 11.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│  September macOS Accessibility Keyboard        │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  SwiftUI Keyboard UI                       │ │
│  │  - Floating NSPanel (nonactivatingPanel)   │ │
│  │  - Custom key layouts                      │ │
│  │  - Dwell visualization (if dwell enabled)  │ │
│  └────────────────────────────────────────────┘ │
│                     │                            │
│  ┌──────────────────▼──────────────────────────┐ │
│  │  Input Pipeline                            │ │
│  │  - Keyboard event monitoring (CGEventTap)  │ │
│  │  - Switch Control detection                │ │
│  │  - Text composition handling               │ │
│  └────────────────────────────────────────────┘ │
│                     │                            │c
│  ┌──────────────────▼──────────────────────────┐ │
│  │  Text Injection Layer                      │ │
│  │  - CGEvent.post() (if not sandboxed)       │ │
│  │  - AppleScript keystroke (fallback)        │ │
│  │  - NSPasteboard + Cmd+V (last resort)      │ │
│  └────────────────────────────────────────────┘ │
│                     │                            │
│  ┌──────────────────▼──────────────────────────┐ │
│  │  Accessibility Integration                 │ │
│  │  - AXUIElement for focused app detection   │ │
│  │  - NSAccessibility custom actions          │ │
│  │  - Dwell action handling                   │ │
│  │  - Switch Control awareness                │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 11.2 Permission Strategy

**Recommended Approach:**
1. **Primary (Non-Sandboxed):** Request Accessibility permission for full feature set
2. **Secondary (Sandboxed):** Request Input Monitoring permission as fallback
3. **Fallback:** AppleScript automation for text injection

**Info.plist Entry:**
```xml
<key>NSAccessibilityUsageDescription</key>
<string>September needs Accessibility access to help you control your Mac's keyboard and send text to any application.</string>

<key>NSAppleEventsUsageDescription</key>
<string>September uses automation to send keystrokes to applications when the Accessibility feature is not available.</string>
```

### 11.3 Event Monitoring Strategy

```swift
class KeyboardEventMonitor {
    // Try 1: CGEventTap (Input Monitoring) - Works in sandbox
    // Try 2: NSEvent global monitor (Accessibility) - Better, but not in sandbox
    // Try 3: IOHIDManager - Most reliable, but complex
    
    var tapSource: CFMachPort?
    
    func startMonitoring() {
        // First check Input Monitoring
        if CGPreflightListenEventAccess() {
            setupCGEventTap()
        } else {
            // Request it
            CGRequestListenEventAccess()
            // User must grant, then restart app
        }
        
        // Also try NSEvent as supplement (if not sandboxed)
        if !isSandboxed() {
            setupNSEventMonitor()
        }
    }
    
    private func setupCGEventTap() {
        let eventMask: CGEventMask = (1 << CGEventType.keyDown.rawValue)
        
        tapSource = CGEventTapCreate(
            tap: .cghidEventTap,
            place: .headInsertEventTap,
            options: .listenOnly,  // Doesn't require Accessibility, only Input Monitoring
            eventMask: eventMask,
            callback: { [weak self] (tapProxy, type, event, userInfo) in
                self?.handleKeyEvent(event)
                return Unmanaged.passRetained(event)
            },
            userInfo: nil
        )
        
        if let tapSource = tapSource {
            let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tapSource, 0)
            CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
            CGEventTapEnable(tapSource, true)
        }
    }
}
```

### 11.4 Text Injection Strategy

```swift
class TextInjectionManager {
    
    func injectText(_ text: String) {
        // Try in order of preference
        
        if canUseCGEventPost() {
            injectViaCGEvent(text)
        } else if canUseAppleScript() {
            injectViaAppleScript(text)
        } else {
            injectViaPasteboard(text)
        }
    }
    
    private func injectViaCGEvent(_ text: String) {
        // Fastest, requires Accessibility permission and non-sandboxed
        for char in text {
            if let keyCode = keyCodeForCharacter(char) {
                let event = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true)
                event?.post(tap: .cghidEventTap)
                
                let upEvent = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false)
                upEvent?.post(tap: .cghidEventTap)
            }
        }
    }
    
    private func injectViaAppleScript(_ text: String) {
        // Requires Automation + Accessibility permission
        let script = """
        tell application "System Events"
            keystroke "\(escapeAppleScript(text))"
        end tell
        """
        var error: NSDictionary?
        NSAppleScript(source: script)?.executeAndReturnError(&error)
    }
    
    private func injectViaPasteboard(_ text: String) {
        // Works in remote sessions; slowest
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
        
        // Simulate Cmd+V
        let vEvent = CGEvent(keyboardEventSource: nil, virtualKey: 9, keyDown: true)
        vEvent?.flags = .maskCommand
        // Can't use post() in sandbox, so this only works non-sandboxed
    }
}
```

### 11.5 Accessibility Integration

```swift
class AccessibilityKeyboardView: NSView {
    
    // Make keyboard accessible to Switch Control and other assistive tech
    override var isAccessibilityElement: Bool { true }
    
    override var accessibilityRole: NSAccessibility.Role { .toolbar }
    
    override var accessibilityLabel: String? {
        get { "Accessibility Keyboard" }
        set { }
    }
    
    // Each key button
    class AccessibilityKeyButton: NSButton {
        let character: String
        
        override var accessibilityLabel: String? {
            get { "Key: \(character)" }
            set { }
        }
        
        override func accessibilityPerformAction(name: NSAccessibilityActionName,
                                                 with value: Any? = nil) -> Bool {
            if name == .press {
                // Handle key press
                performKeyAction()
                return true
            }
            return super.accessibilityPerformAction(name: name, with: value)
        }
    }
}
```

### 11.6 Custom Panel Generation

```swift
class CustomPanelGenerator {
    
    func createPanel(name: String, layout: [[KeyDefinition]]) {
        let panelPath = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/com.apple.AssistiveControl")
            .appendingPathComponent("\(name).ascconfig")
        
        try? FileManager.default.createDirectory(at: panelPath, withIntermediateDirectories: true)
        
        // Generate Info.plist
        let infoPlist: [String: Any] = [
            "CFBundleName": name,
            "CFBundleVersion": "1.0"
        ]
        let infoPlistPath = panelPath.appendingPathComponent("Info.plist")
        try? (infoPlist as NSDictionary).write(toFile: infoPlistPath.path, atomically: true)
        
        // Generate PanelDefinitions.plist
        var panelObjects: [[String: Any]] = []
        for (row, keyRow) in layout.enumerated() {
            for (col, keyDef) in keyRow.enumerated() {
                let x = CGFloat(col) * 60
                let y = CGFloat(row) * 60
                
                panelObjects.append([
                    "Rect": "{\(x), \(y)}, {60, 60}",
                    "DisplayText": keyDef.label,
                    "FontSize": 12,
                    "DisplayColor": [1.0, 1.0, 1.0, 1.0],
                    "Actions": [
                        [
                            "ActionType": "ActionPressKeyCharSequence",
                            "ActionData": ["KeySequence": keyDef.output]
                        ]
                    ]
                ])
            }
        }
        
        let panelDef: [String: Any] = ["PanelObjects": panelObjects]
        try? FileManager.default.createDirectory(
            at: panelPath.appendingPathComponent("Resources"),
            withIntermediateDirectories: true
        )
        let panelDefPath = panelPath.appendingPathComponent("Resources/PanelDefinitions.plist")
        try? (panelDef as NSDictionary).write(toFile: panelDefPath.path, atomically: true)
    }
}
```

---

## Part 12: Development Checklist

### Before Starting Development

- [ ] Read [Apple's Accessibility Programming Guide](https://developer.apple.com/library/archive/documentation/Accessibility/Conceptual/AccessibilityMacOSX/)
- [ ] Review [App accessibility for Switch Control WWDC20](https://developer.apple.com/videos/play/wwdc2020/10019/)
- [ ] Decide: Sandboxed or non-sandboxed app (affects features)
- [ ] Test with Accessibility Inspector (built into Xcode)
- [ ] Set up .entitlements file with required permissions

### During Development

- [ ] Implement NSPanel with `.nonactivatingPanel` for floating UI
- [ ] Test CGEventTap with Input Monitoring permission first (more compatible)
- [ ] Add fallback text injection methods (AppleScript, NSPasteboard)
- [ ] Make all UI elements accessible (labels, roles, actions)
- [ ] Test with actual Dwell Control and Head Tracking enabled
- [ ] Test with actual Switch Control active
- [ ] Handle permission denial gracefully
- [ ] Display setup guide if permissions not granted

### After Initial Build

- [ ] Use Accessibility Inspector to verify UI is discoverable
- [ ] Test on actual hardware (not just simulator) for camera/dwell
- [ ] Test keyboard injection in various apps (browsers, text editors, etc.)
- [ ] Handle CGEventTap timeout (kCGEventTapDisabledByTimeout)
- [ ] Re-sign and relaunch to verify CGEventTap still works
- [ ] Document permission requirements in setup flow
- [ ] Test with users who use actual accessibility features

### Before Release

- [ ] Decide on App Store distribution or direct download
- [ ] If App Store: Remove Accessibility features or use Input Monitoring only
- [ ] If direct download: Can request full Accessibility permission
- [ ] Add user documentation on permission setup
- [ ] Create tutorial video showing setup steps
- [ ] Test on multiple macOS versions (Monterey, Ventura, Sonoma, Sequoia)

---

## Part 13: Essential vs. Accidental Complexity Analysis

### Essential Complexity

These are unavoidable complexities inherent to the problem:

1. **Multi-layer event handling** - macOS has three event levels (NSEvent, CGEvent, IOHIDManager); choosing which to use adds inherent complexity
2. **Permission model** - TCC security requires permission requests and error handling
3. **Accessibility API complexity** - AXUIElement is C-based; NSAccessibility has many role-specific protocols
4. **Floating window management** - Creating a UI that stays on top without stealing focus requires careful NSPanel configuration
5. **Dwell/Head tracking integration** - Must handle macOS's built-in features and track pointer position
6. **Text injection limitations** - Different methods (CGEvent, AppleScript, pasteboard) work in different contexts

### Accidental Complexity (Avoid)

These complexities should be minimized:

1. **IOHIDManager usage** - Only use if absolutely necessary; CGEventTap covers most cases
2. **Input Method Framework** - Don't implement unless specifically supporting non-English input methods
3. **Custom panel format parsing** - Generate panels programmatically; avoid manual XML manipulation
4. **Over-ambitious permission handling** - Stick with simple "request once" model; don't try to be clever about permission checking
5. **Trying to work in sandbox** - Build as non-sandboxed app if accessibility is priority; sandbox adds accidental complexity for marginal benefit

---

## Part 14: Known Issues & Workarounds

### Issue 1: CGEventTap Silent Failure After Code Signing

**Symptom:** After re-signing your app, CGEventTap appears to install successfully, but events never fire.

**Root Cause:** macOS security invalidates the tap after code-signing changes.

**Workaround:** Always relaunch the app after code-signing. Add to build scripts:
```bash
killall "September" || true  # Force quit old instance
open "$BUILT_PRODUCTS_DIR/$EXECUTABLE_PATH"  # Relaunch
```

### Issue 2: Accessibility Permission Not Requesting in Sandbox

**Symptom:** Sandboxed app never gets Accessibility permission popup; `AXIsProcessTrusted()` always false.

**Root Cause:** Apple's security model blocks Accessibility in sandboxed apps.

**Workaround:** 
- Build as non-sandboxed app (`com.apple.security.app-sandbox = false`)
- Or use Input Monitoring (CGEventTap + `listenOnly`) instead
- Or use AppleScript for keyboard injection

### Issue 3: macOS Sequoia Monthly Permission Reset

**Symptom:** Starting macOS Sequoia 15.0, Accessibility permission expires every 30 days.

**Workaround:** 
- Document this requirement for users
- Provide clear error message if permission expires
- Implement `AXIsProcessTrustedWithOptions()` check with prompt option on app launch

---

## Summary: Decision Tree for Implementation

```
┌─ Is app for App Store distribution?
│
├─ YES → Use Input Monitoring (CGEventTap + listenOnly)
│        + AppleScript for text injection
│        + NSPasteboard + Cmd+V fallback
│        ✓ Works in sandbox
│        ✗ Can't observe all events
│
└─ NO (Direct download) → Request Accessibility permission
                          + Use NSEvent/CGEvent monitoring
                          + Use CGEvent.post() for injection
                          ✓ Full capabilities
                          ✗ Requires non-sandboxed app
                          ✗ Users must grant permission
```

---

## Resources

### Official Apple Documentation

- [Accessibility Programming Guide for OS X](https://developer.apple.com/library/archive/documentation/Accessibility/Conceptual/AccessibilityMacOSX/)
- [Accessibility Framework Documentation](https://developer.apple.com/documentation/accessibility)
- [Switch Control Documentation](https://developer.apple.com/documentation/accessibility/switch-control)
- [App accessibility for Switch Control (WWDC20)](https://developer.apple.com/videos/play/wwdc2020/10019/)
- [InputMethodKit Documentation](https://developer.apple.com/documentation/inputmethodkit)
- [NSTextInputClient Protocol](https://developer.apple.com/documentation/appkit/nstextinputclient)
- [NSPanel Documentation](https://developer.apple.com/documentation/appkit/nspanel)
- [CGEvent Documentation](https://developer.apple.com/documentation/coregraphics/cgevent)
- [AXUIElement Reference](https://developer.apple.com/documentation/applicationservices/axuielement_h)

### Third-Party Resources

- NSHipster: [Accessibility Keyboard](https://nshipster.com/accessibility-keyboard/)
- AXSwift: [tmandry/AXSwift](https://github.com/tmandry/AXSwift)
- CGEventSupervisor: [stephancasas/CGEventSupervisor](https://github.com/stephancasas/CGEventSupervisor)
- MacOS TCC Reference: [HackTricks macOS TCC](https://angelica.gitbook.io/hacktricks/macos-hardening/macos-security-and-privilege-escalation/macos-security-protections/macos-tcc)
- Event Interception Article: [R0uter's Blog - Three Ways to Intercept Keyboard Events](https://www.logcg.com/en/archives/2902.html)
- macOS Head Pointer: [Thoughtbot - Introduction to macOS Head Pointer](https://thoughtbot.com/blog/an-introduction-to-macos-head-pointer)

---

**Document Status:** Complete Research - Ready for Implementation
**Last Updated:** February 27, 2026
**Target Product:** September macOS Accessibility Keyboard POC

