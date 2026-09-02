import AppKit
import ApplicationServices
import SeptemberKit

/// Prints what Keyboard can read out of the app in front — the focused field
/// it would mirror, and optionally the accessibility tree it came from. The
/// tool for answering "why is this app not mirroring?":
///
///     swift run Keyboard --ax                 # focused field, right now
///     swift run Keyboard --ax --wait 5        # after 5s, so you can click away
///     swift run Keyboard --ax --tree          # + the app's tree, 4 levels deep
@MainActor
enum AXDump {
    static func run(arguments: [String]) {
        guard arguments.contains("--ax") else { return }

        if !AXIsProcessTrusted() {
            print("not trusted — grant Accessibility, or run from a trusted terminal\n")
        }
        if let index = arguments.firstIndex(of: "--wait"), index + 1 < arguments.count,
            let seconds = Double(arguments[index + 1])
        {
            print("reading in \(seconds)s — click into the app you want to inspect…")
            CFRunLoopRunInMode(.defaultMode, seconds, false)
        }

        let app = NSWorkspace.shared.frontmostApplication
        print("frontmost: \(app?.localizedName ?? "?") (\(app?.bundleIdentifier ?? "?"))")

        let watcher = FocusWatcher()
        if let field = watcher.readFocusedField() {
            print(
                """

                focused field
                  app          \(field.appName)
                  role         \(field.role)
                  editable     \(field.isEditable)
                  secure       \(field.isSecure)
                  text         \(field.text.map { "\"\($0.prefix(200))\"" } ?? "— (app exposes none)")
                  selection    \(field.selection.map { "\($0.location)+\($0.length)" } ?? "—")
                  mirrors as   \(field.display.map(String.init(describing:)) ?? "— (our own echo stands in)")
                """
            )
        } else {
            print("\nno focused field — nothing to mirror")
        }

        if arguments.contains("--tree"), let app {
            print("\ntree")
            dump(AXUIElementCreateApplication(app.processIdentifier), depth: 0, limit: 4)
        }
        exit(0)
    }

    private static func dump(_ element: AXUIElement, depth: Int, limit: Int) {
        guard depth <= limit else { return }
        var role: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &role)
        var title: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXTitleAttribute as CFString, &title)
        var value: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &value)

        var line = String(repeating: "  ", count: depth) + ((role as? String) ?? "?")
        if let title = title as? String, !title.isEmpty { line += " \"\(title)\"" }
        if let value = value as? String, !value.isEmpty { line += " = \"\(value.prefix(60))\"" }
        print(line)

        var children: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &children)
        // Menu bars are every app's biggest, least interesting subtree.
        for child in (children as? [AXUIElement] ?? []).prefix(20) where depth < limit {
            dump(child, depth: depth + 1, limit: limit)
        }
    }
}
