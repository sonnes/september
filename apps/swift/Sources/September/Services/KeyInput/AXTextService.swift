import ApplicationServices
import os

// MARK: - AXTextService
//
// Reads and writes text in the focused app's text field via
// macOS Accessibility API (AXUIElement). Provides atomic text
// insertion without clipboard manipulation.
//
// Requires Accessibility permission (same as EventInjector).
// Falls back gracefully — callers check return values and use
// EventInjector.typeString() when AX mutation is unsupported.

@MainActor
final class AXTextService {
    private static let logger = Logger(subsystem: "to.september.app", category: "AXTextService")
    private let systemWide = AXUIElementCreateSystemWide()

    /// Read the full text content of the focused text field.
    /// Returns nil if no text field is focused or AX is unsupported.
    func readText() -> String? {
        guard let element = focusedElement() else { return nil }

        var value: AnyObject?
        let result = AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &value)
        guard result == .success, let text = value as? String else {
            return nil
        }
        return text
    }

    /// Insert text at the current cursor position in the focused text field.
    /// Returns true on success, false if the focused element doesn't support text mutation.
    func insertText(_ text: String) -> Bool {
        guard let element = focusedElement() else {
            Self.logger.debug("No focused element for text insertion")
            return false
        }

        // Try to read current value and selected range to insert at cursor
        var currentValue: AnyObject?
        let valueResult = AXUIElementCopyAttributeValue(
            element, kAXValueAttribute as CFString, &currentValue)

        var selectedRange: AnyObject?
        let rangeResult = AXUIElementCopyAttributeValue(
            element, kAXSelectedTextRangeAttribute as CFString, &selectedRange)

        if valueResult == .success, rangeResult == .success,
            let currentText = currentValue as? String,
            let rangeValue = selectedRange
        {
            // Get the CFRange from the AXValue
            var range = CFRange(location: 0, length: 0)
            // rangeValue is always AXValue from AX API; CFGetTypeID guards against unexpected types
            let axValue = rangeValue as! AXValue  // swiftlint:disable:this force_cast
            if AXValueGetValue(axValue, .cfRange, &range) {
                // Build new text with insertion at cursor position
                let nsText = currentText as NSString
                let location = min(range.location, nsText.length)
                let length = min(range.length, nsText.length - location)
                let insertRange = NSRange(location: location, length: length)
                let newText = nsText.replacingCharacters(in: insertRange, with: text)

                let setResult = AXUIElementSetAttributeValue(
                    element, kAXValueAttribute as CFString, newText as CFTypeRef)
                if setResult == .success {
                    // Move cursor to end of inserted text
                    let newPosition = location + text.utf16.count
                    var newRange = CFRange(location: newPosition, length: 0)
                    if let axRange = AXValueCreate(.cfRange, &newRange) {
                        AXUIElementSetAttributeValue(
                            element, kAXSelectedTextRangeAttribute as CFString, axRange)
                    }
                    Self.logger.debug("Inserted \(text.count) chars via AX at position \(location)")
                    return true
                }
            }
        }

        // Fallback: try setting the selected text attribute directly
        let selectedTextResult = AXUIElementSetAttributeValue(
            element, kAXSelectedTextAttribute as CFString, text as CFTypeRef)
        if selectedTextResult == .success {
            Self.logger.debug("Inserted \(text.count) chars via AX selected text")
            return true
        }

        Self.logger.debug("AX text insertion not supported for focused element")
        return false
    }

    /// Check if the currently focused element is a writable text field.
    func isTextInputFocused() -> Bool {
        guard let element = focusedElement() else { return false }
        var writable: DarwinBoolean = false
        let result = AXUIElementIsAttributeSettable(
            element, kAXValueAttribute as CFString, &writable)
        return result == .success && writable.boolValue
    }

    // MARK: - Private

    private func focusedElement() -> AXUIElement? {
        var element: AnyObject?
        let result = AXUIElementCopyAttributeValue(
            systemWide, kAXFocusedUIElementAttribute as CFString, &element)
        guard result == .success else { return nil }
        return (element as! AXUIElement)  // swiftlint:disable:this force_cast
    }
}
