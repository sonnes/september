import AppKit
import SeptemberKit
import SwiftUI

/// Renders the keyboard (or the component gallery) to a PNG without opening a
/// window, so the layout can be checked against the design mocks from the
/// terminal: `swift run Keyboard --snapshot out.png [--mono] [--light] [--gallery | --viewer]`.
@MainActor
enum Snapshot {
    static func run(arguments: [String]) {
        guard let index = arguments.firstIndex(of: "--snapshot"),
            index + 1 < arguments.count
        else { return }

        let path = arguments[index + 1]
        // A snapshot shows the keyboard as a trusted app sees it, with no banner.
        let permission = AccessibilityPermission(isTrusted: true)

        let view: AnyView
        if arguments.contains("--gallery") {
            view = AnyView(ComponentGallery())
        } else {
            let panels: PanelStore
            do {
                panels = try PanelStore.bundled()
            } catch {
                fail("snapshot: \(error)")
            }
            let controller = KeyboardController(sink: SilentSink(), panels: panels)
            controller.style = arguments.contains("--mono") ? .mono : .rainbow
            let keyboard = KeyboardScreen(controller: controller, permission: permission)
            if arguments.contains("--viewer") {
                // The real tree of whatever is in front, so the viewer can be
                // checked against the mocks with something in it.
                let model = AXTreeModel()
                model.tree = AXTreeReader.read(app: NSWorkspace.shared.frontmostApplication)
                view = AnyView(
                    AXTreeView(
                        model: model,
                        permission: permission,
                        height: NSHostingView(rootView: keyboard).fittingSize.height,
                        scrolls: false
                    )
                    .padding(Metrics.surfacePadding))
            } else {
                view = AnyView(keyboard)
            }
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
        guard let image = rendered,
            let data = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])
        else { fail("snapshot: nothing rendered") }
        do {
            try data.write(to: URL(fileURLWithPath: path))
        } catch {
            fail("snapshot: \(error)")
        }
        print("wrote \(path)")
        exit(0)
    }

    private static func fail(_ message: String) -> Never {
        FileHandle.standardError.write(Data("\(message)\n".utf8))
        exit(1)
    }
}

private final class SilentSink: KeystrokeSink {
    func post(_ events: [Keystroke]) {}
    func type(_ text: String) {}
    func beep() {}
}
