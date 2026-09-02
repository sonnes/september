import AppKit
import SeptemberKit
import SwiftUI

/// Renders the keyboard (or the component gallery) to a PNG without opening a
/// window, so the layout can be checked against the design mocks from the
/// terminal: `swift run Keyboard --snapshot out.png [--mono] [--gallery]`.
@MainActor
enum Snapshot {
    static func run(arguments: [String]) -> Bool {
        guard let index = arguments.firstIndex(of: "--snapshot"),
            index + 1 < arguments.count
        else { return false }

        let path = arguments[index + 1]
        let controller = KeyboardController(sink: SilentSink())
        controller.style = arguments.contains("--mono") ? .mono : .rainbow

        let view: AnyView
        if arguments.contains("--gallery") {
            view = AnyView(ComponentGallery().environmentObject(controller))
        } else if arguments.contains("--viewer") {
            // The real tree of whatever is in front, so the viewer can be
            // checked against the mocks with something in it.
            let model = AXTreeModel()
            model.tree = AXTreeReader.read(app: NSWorkspace.shared.frontmostApplication)
            view = AnyView(AXTreeView(model: model, height: 460, scrolls: false).padding(16))
        } else {
            view = AnyView(KeyboardScreen().environmentObject(controller))
        }

        // The app follows the system appearance, so a snapshot has to say which
        // one it wants: tokens resolve against the appearance being drawn in.
        let isLight = arguments.contains("--light")
        let appearance = NSAppearance(named: isLight ? .aqua : .darkAqua)
        let renderer = ImageRenderer(
            content: view.environment(\.colorScheme, isLight ? .light : .dark))
        renderer.scale = 2

        var rendered: CGImage?
        if let appearance {
            appearance.performAsCurrentDrawingAppearance { rendered = renderer.cgImage }
        } else {
            rendered = renderer.cgImage
        }
        guard let image = rendered else {
            FileHandle.standardError.write(Data("snapshot: nothing rendered\n".utf8))
            exit(1)
        }
        let rep = NSBitmapImageRep(cgImage: image)
        guard let data = rep.representation(using: .png, properties: [:]) else { exit(1) }
        try? data.write(to: URL(fileURLWithPath: path))
        print("wrote \(path)")
        exit(0)
    }
}

/// Swallows keystrokes — used while rendering snapshots.
private final class SilentSink: KeystrokeSink, @unchecked Sendable {
    func post(_ events: [Keystroke]) {}
    func type(_ text: String) {}
}
