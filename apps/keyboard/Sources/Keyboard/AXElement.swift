import ApplicationServices
import Foundation

/// Typed reads of another app's accessibility attributes. Each read returns
/// nil when the app does not answer.
extension AXUIElement {
    func value(_ attribute: String) -> CFTypeRef? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(self, attribute as CFString, &value) == .success
        else { return nil }
        return value
    }

    func string(_ attribute: String) -> String? {
        value(attribute) as? String
    }

    func number(_ attribute: String) -> Int? {
        (value(attribute) as? NSNumber)?.intValue
    }

    func element(_ attribute: String) -> AXUIElement? {
        guard let value = value(attribute), CFGetTypeID(value) == AXUIElementGetTypeID()
        else { return nil }
        return (value as! AXUIElement)
    }

    func range(_ attribute: String) -> NSRange? {
        guard let value = value(attribute), CFGetTypeID(value) == AXValueGetTypeID()
        else { return nil }
        var cfRange = CFRange()
        guard AXValueGetValue(value as! AXValue, .cfRange, &cfRange) else { return nil }
        return NSRange(location: cfRange.location, length: cfRange.length)
    }

    var children: [AXUIElement] {
        value(kAXChildrenAttribute) as? [AXUIElement] ?? []
    }

    var pid: pid_t {
        var pid: pid_t = 0
        AXUIElementGetPid(self, &pid)
        return pid
    }

    func string(_ attribute: String, range: NSRange) -> String? {
        var cfRange = CFRange(location: range.location, length: range.length)
        guard let parameter = AXValueCreate(.cfRange, &cfRange) else { return nil }
        var value: CFTypeRef?
        guard
            AXUIElementCopyParameterizedAttributeValue(
                self, attribute as CFString, parameter, &value) == .success
        else { return nil }
        return value as? String
    }
}
