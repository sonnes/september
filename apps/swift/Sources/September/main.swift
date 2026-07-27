import AppKit

// `--snapshot <path>` renders to a PNG and exits; no window, no permissions.
_ = MainActor.assumeIsolated { Snapshot.run(arguments: CommandLine.arguments) }
// `--ax` prints the focused field (and optionally the tree) and exits.
MainActor.assumeIsolated { AXDump.run(arguments: CommandLine.arguments) }

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
// Accessory: no Dock icon, no menu bar takeover, never becomes the active app.
app.setActivationPolicy(.accessory)
app.run()
