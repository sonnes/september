import ApplicationServices
import SeptemberKit
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

    /// Counts the children without copying them.
    var childCount: Int {
        var count: CFIndex = 0
        AXUIElementGetAttributeValueCount(self, kAXChildrenAttribute as CFString, &count)
        return count
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

/// The reads of the focus and the menu bar that the app shares.
enum AXFocus {
    /// The most elements in the path of `path(of:)`.
    static let pathLimit = 64
    /// The deepest level of the menu bar that `menuBar(pid:_:)` opens.
    static let menuDepthLimit = 6
    /// The most elements of the menu bar that `menuBar(pid:_:)` reads.
    static let menuNodeLimit = 2_000

    /// The focused element and its parents, up to the app.
    static func path(of focused: AXUIElement?) -> [AXUIElement] {
        var path: [AXUIElement] = []
        var current = focused
        // A misbehaving app can report a parent cycle.
        while let element = current, path.count < pathLimit {
            path.append(element)
            current = element.element(kAXParentAttribute)
        }
        return path
    }

    /// True when `element` is a password field.
    static func isSecure(_ element: AXUIElement) -> Bool {
        FocusedField.isSecure(subrole: element.string(kAXSubroleAttribute))
    }

    /// Asks a Chrome or Electron app for its full accessibility tree. These
    /// apps build no tree until an assistive app asks for one. VoiceOver sets
    /// the same attribute.
    static func enableManualAccessibility(_ app: AXUIElement) {
        AXUIElementSetAttributeValue(app, "AXManualAccessibility" as CFString, kCFBooleanTrue)
    }

    /// Builds a tree from the menu bar of the app `pid`, depth first. `node`
    /// gets each element, its place in the walk, and the nodes of its
    /// children, and gives the node of the element, or nil to leave it out.
    /// Returns nil when the app has no menu bar.
    static func menuBar<Node>(
        pid: pid_t, _ node: (_ element: AXUIElement, _ index: Int, _ children: [Node]) -> Node?
    ) -> Node? {
        guard let bar = AXUIElementCreateApplication(pid).element(kAXMenuBarAttribute) else { return nil }
        var count = 0
        func walk(_ element: AXUIElement, depth: Int) -> Node? {
            guard count < menuNodeLimit else { return nil }
            let index = count
            count += 1
            var children: [Node] = []
            if depth < menuDepthLimit {
                for child in element.children {
                    if let built = walk(child, depth: depth + 1) { children.append(built) }
                }
            }
            return node(element, index, children)
        }
        return walk(bar, depth: 0)
    }
}
