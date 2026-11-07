import AppKit
import ApplicationServices
import SeptemberKit

/// Prints the shape of the text around the focused field of the app in front,
/// with no word of the text:
///
///     swift run Keyboard --ax --context-shape --wait 5
///     swift run Keyboard --ax --context-shape --electron --wait 5
///     swift run Keyboard --ax --context-shape --lines 3000
///
/// `--electron` asks Chrome and Electron apps for their full tree first.
/// `--lines` changes the most lines that the probe prints.
@MainActor
enum ContextProbe {
    static let nodeLimit = 3000
    static let depthLimit = 40

    private static let attributes: [String] = [
        kAXRoleAttribute, kAXSubroleAttribute, "AXIdentifier", kAXPositionAttribute, kAXSizeAttribute,
        kAXTitleAttribute, kAXDescriptionAttribute, kAXValueAttribute, kAXPlaceholderValueAttribute,
        kAXHelpAttribute, kAXChildrenAttribute,
    ]
    private static let textNames = [
        kAXTitleAttribute: "title", kAXDescriptionAttribute: "description", kAXValueAttribute: "value",
        kAXPlaceholderValueAttribute: "placeholder", kAXHelpAttribute: "help",
    ]

    static func run(app: NSRunningApplication?, electron: Bool, limit: Int) {
        guard let app else { return print("no app in front") }
        let root = AXUIElementCreateApplication(app.processIdentifier)
        if electron {
            AXUIElementSetAttributeValue(root, "AXManualAccessibility" as CFString, kCFBooleanTrue)
            CFRunLoopRunInMode(.defaultMode, 1, false)
        }
        let focused = root.element(kAXFocusedUIElementAttribute)
        var path: [AXUIElement] = []
        var current = focused
        while let element = current, path.count < 64 {
            path.append(element)
            current = element.element(kAXParentAttribute)
        }
        let window =
            path.first { $0.string(kAXRoleAttribute) == (kAXWindowRole as String) }
            ?? root.element(kAXFocusedWindowAttribute) ?? root

        var walker = Walker(focused: focused, path: path)
        let start = Date()
        let tree = walker.walk(window, depth: 0)
        let elapsed = Int(Date().timeIntervalSince(start) * 1000)

        print("\ncontext shape: \(walker.count) elements in \(elapsed) ms, deepest \(walker.deepest)")
        if walker.count >= nodeLimit { print("stopped at \(nodeLimit) elements") }
        print("focused: \(focused.flatMap { $0.string(kAXRoleAttribute) } ?? "nothing")")
        printExtracted(app: app)
        guard let tree else { return print("no tree") }
        for line in ContextShape.lines(for: tree, field: walker.fieldFrame, limit: limit) {
            print(line)
        }
    }

    /// What the context step reads for the predictions, as shapes.
    private static func printExtracted(app: NSRunningApplication) {
        let rules = (try? ContextRules.bundled()) ?? ContextRules(rules: [:])
        let request = ScreenContextReader.Request(app: app, rules: rules)
        let start = Date()
        let screen = ScreenContextReader.read(request)
        let elapsed = Int(Date().timeIntervalSince(start) * 1000)
        print("\nextracted with \(request.rule.map { "the rule of \($0.name)" } ?? "the general rule") in \(elapsed) ms")
        guard let screen else { return print("  nothing (no focused field, or a password field)\n") }
        func shape(_ text: String?) -> String {
            text.map { "\"\(ContextShape.shape(of: $0))\" (\($0.count) ch)" } ?? "—"
        }
        print("  title  \(shape(screen.title))")
        print("  field  \(shape(screen.field))")
        print("  lines  \(screen.lines.count), \(screen.lines.joined().count) ch")
        for line in screen.lines { print("    \(shape(line))") }
        print("")
    }

    @MainActor
    private struct Walker {
        let focused: AXUIElement?
        let path: [AXUIElement]
        var count = 0
        var deepest = 0
        var fieldFrame: CGRect?

        mutating func walk(_ element: AXUIElement, depth: Int) -> ProbeElement? {
            guard count < ContextProbe.nodeLimit, depth < ContextProbe.depthLimit else { return nil }
            count += 1
            deepest = max(deepest, depth)

            var raw: CFArray?
            guard
                AXUIElementCopyMultipleAttributeValues(
                    element, ContextProbe.attributes as CFArray, AXCopyMultipleAttributeOptions(), &raw)
                    == .success,
                let values = raw as? [AnyObject], values.count == ContextProbe.attributes.count
            else { return nil }
            var read: [String: AnyObject] = [:]
            for (name, value) in zip(ContextProbe.attributes, values) { read[name] = value }

            let subrole = read[kAXSubroleAttribute] as? String
            let isFocused = focused.map { CFEqual($0, element) } ?? false
            let frame = Self.frame(read[kAXPositionAttribute], read[kAXSizeAttribute])
            if isFocused { fieldFrame = frame }

            var texts: [ProbeText] = []
            // A password field gives no value, and the probe does not ask.
            if subrole != (kAXSecureTextFieldSubrole as String) {
                for name in [kAXTitleAttribute, kAXDescriptionAttribute, kAXValueAttribute,
                    kAXPlaceholderValueAttribute, kAXHelpAttribute]
                {
                    if let text = read[name] as? String, !text.isEmpty {
                        texts.append(ProbeText(attribute: ContextProbe.textNames[name]!, text: text))
                    }
                }
            }

            var children: [ProbeElement] = []
            for child in read[kAXChildrenAttribute] as? [AXUIElement] ?? [] {
                if let node = walk(child, depth: depth + 1) { children.append(node) }
            }
            return ProbeElement(
                role: read[kAXRoleAttribute] as? String ?? "unknown", subrole: subrole,
                identifier: read["AXIdentifier"] as? String, frame: frame, texts: texts,
                isFocused: isFocused, onFocusPath: path.contains { CFEqual($0, element) },
                children: children)
        }

        private static func frame(_ position: AnyObject?, _ size: AnyObject?) -> CGRect? {
            guard let position, let size,
                CFGetTypeID(position) == AXValueGetTypeID(), CFGetTypeID(size) == AXValueGetTypeID()
            else { return nil }
            var point = CGPoint.zero
            var extent = CGSize.zero
            guard AXValueGetValue(position as! AXValue, .cgPoint, &point),
                AXValueGetValue(size as! AXValue, .cgSize, &extent)
            else { return nil }
            return CGRect(origin: point, size: extent)
        }
    }
}
