import AppKit
import SeptemberKit
import SwiftUI

/// Renders the keyboard (or the component gallery) to a PNG without opening a
/// window, so the layout can be checked against the design mocks from the
/// terminal: `swift run September --snapshot out.png [--mono] [--gallery]`.
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
        } else {
            view = AnyView(KeyboardScreen().environmentObject(controller))
        }

        let renderer = ImageRenderer(content: view)
        renderer.scale = 2

        guard let image = renderer.cgImage else {
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
