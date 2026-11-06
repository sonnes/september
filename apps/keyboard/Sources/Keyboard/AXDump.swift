import AppKit
import ApplicationServices
import SeptemberKit

/// Prints what Keyboard can read out of the app in front — the focused field
/// it would mirror, and optionally the accessibility tree it came from. The
/// tool for answering "why is this app not mirroring?":
///
///     swift run Keyboard --ax                 # focused field, right now
///     swift run Keyboard --ax --wait 5        # after 5s, so you can click away
///     swift run Keyboard --ax --tree          # + the app's tree, as the viewer shows it
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
                  app          \(field.appName ?? "?")
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

        if arguments.contains("--tree") {
            print("\ntree")
            for row in AXTreeReader.read(app: app).rows() {
                print(line(for: row))
            }
        }
        exit(0)
    }

    private static func line(for row: AXTreeRow) -> String {
        var line = String(repeating: "  ", count: row.depth) + row.node.role
        if let label = row.node.subtitle { line += " \"\(label)\"" }
        if let detail = row.node.detail { line += " = \"\(detail)\"" }
        if row.node.isFocused { line += "  <- focused" }
        if row.hiddenChildren > 0 { line += "  (\(row.hiddenChildren) hidden)" }
        return line
    }
}
