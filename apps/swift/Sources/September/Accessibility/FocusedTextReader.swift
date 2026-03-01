import AppKit
import ApplicationServices

@Observable
@MainActor
final class FocusedTextReader {
    private(set) var fullText = ""
    private(set) var cursorPosition = 0
    private(set) var textBeforeCursor = ""
    private(set) var isTextFieldFocused = false

    /// Called when focus changes (app switch or element change within an app).
    var onFocusChange: (() -> Void)?

    /// Called when the text value of the focused element changes (physical keyboard, paste, etc.).
    var onValueChange: (() -> Void)?

    private var axObserver: AXObserver?
    private var observedApp: AXUIElement?
    private var observedElement: AXUIElement?

    func startObserving() {
        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(appDidActivate),
            name: NSWorkspace.didActivateApplicationNotification,
            object: nil
        )
    }

    func stopObserving() {
        NSWorkspace.shared.notificationCenter.removeObserver(self)
        removeAXObserver()
    }

    @objc private func appDidActivate(_ notification: Notification) {
        observeFocusedApp()
        onFocusChange?()
    }

    /// Sets up an AXObserver on the frontmost app for focus and value changes.
    private func observeFocusedApp() {
        removeAXObserver()

        guard let app = NSWorkspace.shared.frontmostApplication else { return }
        let pid = app.processIdentifier

        var observer: AXObserver?
        let callback: AXObserverCallback = { _, element, notification, refcon in
            guard let refcon else { return }
            let reader = Unmanaged<FocusedTextReader>.fromOpaque(refcon).takeUnretainedValue()
            let name = notification as String
            Task { @MainActor in
                if name == kAXFocusedUIElementChangedNotification as String {
                    reader.handleFocusedElementChanged()
                } else if name == kAXValueChangedNotification as String
                            || name == kAXSelectedTextChangedNotification as String {
                    reader.onValueChange?()
                }
            }
        }

        guard AXObserverCreate(pid, callback, &observer) == .success,
              let observer else { return }

        let appElement = AXUIElementCreateApplication(pid)
        let refcon = Unmanaged.passUnretained(self).toOpaque()

        AXObserverAddNotification(
            observer,
            appElement,
            kAXFocusedUIElementChangedNotification as CFString,
            refcon
        )

        CFRunLoopAddSource(
            CFRunLoopGetMain(),
            AXObserverGetRunLoopSource(observer),
            .defaultMode
        )

        self.axObserver = observer
        self.observedApp = appElement

        // Also observe the currently focused element for value changes
        observeValueChangesOnFocusedElement()
    }

    private func handleFocusedElementChanged() {
        observeValueChangesOnFocusedElement()
        onFocusChange?()
    }

    /// Observes kAXValueChangedNotification and kAXSelectedTextChangedNotification
    /// on the currently focused UI element so we detect physical keyboard input, paste, etc.
    private func observeValueChangesOnFocusedElement() {
        // Remove old element observation
        if let observer = axObserver, let old = observedElement {
            AXObserverRemoveNotification(observer, old, kAXValueChangedNotification as CFString)
            AXObserverRemoveNotification(observer, old, kAXSelectedTextChangedNotification as CFString)
        }
        observedElement = nil

        guard let observer = axObserver, let app = observedApp else { return }

        // Get the focused element from the app
        var focusedElement: CFTypeRef?
        guard AXUIElementCopyAttributeValue(
            app,
            kAXFocusedUIElementAttribute as CFString,
            &focusedElement
        ) == .success else { return }

        let element = focusedElement as! AXUIElement
        let refcon = Unmanaged.passUnretained(self).toOpaque()

        AXObserverAddNotification(observer, element, kAXValueChangedNotification as CFString, refcon)
        AXObserverAddNotification(observer, element, kAXSelectedTextChangedNotification as CFString, refcon)
        observedElement = element
    }

    private func removeAXObserver() {
        if let observer = axObserver {
            if let app = observedApp {
                AXObserverRemoveNotification(observer, app, kAXFocusedUIElementChangedNotification as CFString)
            }
            if let element = observedElement {
                AXObserverRemoveNotification(observer, element, kAXValueChangedNotification as CFString)
                AXObserverRemoveNotification(observer, element, kAXSelectedTextChangedNotification as CFString)
            }
        }
        axObserver = nil
        observedApp = nil
        observedElement = nil
    }

    /// Reads text and cursor position from the currently focused UI element.
    /// Returns false if the focused element has no readable text value.
    @discardableResult
    func readFocusedElement() -> Bool {
        guard AccessibilityManager.isTrusted else {
            clearState()
            return false
        }

        let systemWide = AXUIElementCreateSystemWide()

        // Get focused application
        var focusedApp: CFTypeRef?
        guard AXUIElementCopyAttributeValue(
            systemWide,
            kAXFocusedApplicationAttribute as CFString,
            &focusedApp
        ) == .success else {
            clearState()
            return false
        }

        // Get focused UI element from that application
        var focusedElement: CFTypeRef?
        guard AXUIElementCopyAttributeValue(
            focusedApp as! AXUIElement,
            kAXFocusedUIElementAttribute as CFString,
            &focusedElement
        ) == .success else {
            clearState()
            return false
        }

        let element = focusedElement as! AXUIElement

        // Read text value
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(
            element,
            kAXValueAttribute as CFString,
            &value
        ) == .success, let textValue = value as? String else {
            clearState()
            return false
        }

        // Read cursor position from selected text range
        var rangeValue: CFTypeRef?
        var cfRange = CFRange(location: 0, length: 0)
        if AXUIElementCopyAttributeValue(
            element,
            kAXSelectedTextRangeAttribute as CFString,
            &rangeValue
        ) == .success,
           let axValue = rangeValue,
           CFGetTypeID(axValue) == AXValueGetTypeID()
        {
            AXValueGetValue(axValue as! AXValue, .cfRange, &cfRange)
        }

        let nsText = textValue as NSString
        let safeCursor = min(cfRange.location, nsText.length)

        fullText = textValue
        cursorPosition = safeCursor
        isTextFieldFocused = true
        textBeforeCursor = nsText.substring(to: safeCursor)
        return true
    }

    /// Replace text from UTF-16 `startIndex` to the cursor with `replacement`.
    /// Selects the range first, then sets the selected text so the cursor
    /// naturally ends up after the inserted text.
    @discardableResult
    func replaceTextBeforeCursor(from startIndex: Int, with replacement: String) -> Bool {
        guard let element = focusedTextElement() else { return false }

        // Read current text length to clamp offsets
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(
            element, kAXValueAttribute as CFString, &value
        ) == .success, let currentText = value as? String else { return false }

        let nsText = currentText as NSString
        let safeStart = max(0, min(startIndex, nsText.length))
        let safeCursor = max(safeStart, min(cursorPosition, nsText.length))

        // Select the range to replace (partial word before cursor)
        var selectRange = CFRange(location: safeStart, length: safeCursor - safeStart)
        guard let axRange = AXValueCreate(.cfRange, &selectRange) else { return false }
        guard AXUIElementSetAttributeValue(
            element, kAXSelectedTextRangeAttribute as CFString, axRange
        ) == .success else { return false }

        // Replace selected text — cursor moves to end of replacement automatically
        guard AXUIElementSetAttributeValue(
            element, kAXSelectedTextAttribute as CFString, replacement as CFTypeRef
        ) == .success else { return false }

        // Update local state
        let nsReplacement = replacement as NSString
        let newCursorPos = safeStart + nsReplacement.length
        let newText = nsText.replacingCharacters(
            in: NSRange(location: safeStart, length: safeCursor - safeStart),
            with: replacement
        )
        fullText = newText
        cursorPosition = newCursorPos
        textBeforeCursor = (newText as NSString).substring(to: newCursorPos)
        return true
    }

    /// Returns the currently focused text element, or nil.
    func focusedTextElement() -> AXUIElement? {
        guard AccessibilityManager.isTrusted else { return nil }
        let systemWide = AXUIElementCreateSystemWide()

        var focusedApp: CFTypeRef?
        guard AXUIElementCopyAttributeValue(
            systemWide, kAXFocusedApplicationAttribute as CFString, &focusedApp
        ) == .success else { return nil }

        var focusedEl: CFTypeRef?
        guard AXUIElementCopyAttributeValue(
            focusedApp as! AXUIElement, kAXFocusedUIElementAttribute as CFString, &focusedEl
        ) == .success else { return nil }

        return (focusedEl as! AXUIElement)
    }

    private func clearState() {
        fullText = ""
        cursorPosition = 0
        textBeforeCursor = ""
        isTextFieldFocused = false
    }
}
