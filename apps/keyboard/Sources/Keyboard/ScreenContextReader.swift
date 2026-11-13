import AppKit
import ApplicationServices
import SeptemberKit

/// An element of the app in front, read for the context step.
///
/// The read runs off the main thread. An `AXUIElement` is a CoreFoundation
/// object that the accessibility API accepts from any thread, so the wrapper
/// is `@unchecked Sendable`.
struct AXContextNode: ContextNode, @unchecked Sendable {
    let element: AXUIElement

    var role: String? { element.string(kAXRoleAttribute) }
    var subrole: String? { element.string(kAXSubroleAttribute) }
    var identifier: String? { element.string("AXIdentifier") }
    var children: [AXContextNode] { element.children.map(AXContextNode.init) }

    func text(_ attribute: ContextAttribute) -> String? {
        switch attribute {
        case .value: element.string(kAXValueAttribute)
        case .description: element.string(kAXDescriptionAttribute)
        case .title: element.string(kAXTitleAttribute)
        case .placeholder: element.string(kAXPlaceholderValueAttribute)
        }
    }

    func isSame(as other: AXContextNode) -> Bool {
        CFEqual(element, other.element)
    }
}

/// Reads the text near the focused field of an app with
/// `ScreenContextExtractor`. It never reads a password field.
enum ScreenContextReader {
    /// What one read needs to know about the app in front.
    struct Request: Sendable {
        let pid: pid_t
        let bundleID: String?
        let appName: String?
        let rule: ContextRule?
        /// Chrome and Electron apps show their full tree only when they are
        /// asked for it.
        let isElectron: Bool

        @MainActor
        init(app: NSRunningApplication, rules: ContextRules) {
            pid = app.processIdentifier
            bundleID = app.bundleIdentifier
            appName = app.localizedName
            rule = rules.rule(for: app.bundleIdentifier)
            isElectron =
                app.bundleURL.map {
                    FileManager.default.fileExists(
                        atPath: $0.appendingPathComponent("Contents/Frameworks/Electron Framework.framework").path)
                } ?? false
        }
    }

    /// The longest time that one read takes.
    static let timeLimit: TimeInterval = 0.3

    static func read(_ request: Request) -> ScreenContext? {
        let app = AXUIElementCreateApplication(request.pid)
        // A slow app must not hold the read for the default 6 seconds.
        AXUIElementSetMessagingTimeout(app, 0.25)
        if request.isElectron { AXFocus.enableManualAccessibility(app) }
        guard let focused = app.element(kAXFocusedUIElementAttribute), !AXFocus.isSecure(focused)
        else { return nil }

        let full = AXFocus.path(of: focused)
        let window = full.firstIndex { $0.string(kAXRoleAttribute) == (kAXWindowRole as String) }
        let path = full[...(window ?? full.count - 1)].map(AXContextNode.init)

        let deadline = Date().addingTimeInterval(timeLimit)
        return ScreenContextExtractor.extract(
            path: path, rule: request.rule, appName: request.appName, bundleID: request.bundleID,
            isExpired: { Date() > deadline })
    }
}
