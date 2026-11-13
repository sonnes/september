import AppKit
import SwiftUI

/// The tools rail: a column of round buttons at the left of the Write paper.
///
/// The rail is a panel that never becomes the key window, so the caret stays
/// in the editor when the user presses a button. Its bottom is on the bottom
/// of the paper. The paper grows up, so the rail stays in place while the
/// user types.
@MainActor
public final class WriteToolsController {
    public let window: NSPanel
    private let hosting: NSHostingView<WriteToolsView>

    /// The paper sets this. A button calls it when the button goes up.
    public var onTool: ((WriteTool) -> Void)?

    public init() {
        window = WriteToolsWindow(
            contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: true)
        window.isReleasedWhenClosed = false
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.becomesKeyOnlyIfNeeded = true
        hosting = NSHostingView(rootView: WriteToolsView(onTool: { _ in }))
        hosting.rootView = WriteToolsView(onTool: { [weak self] tool in self?.press(tool) })
        window.contentView = hosting
    }

    /// The size of the rail.
    public var size: CGSize { hosting.fittingSize }

    /// The width that the page keeps free on its left for the rail.
    public var leading: CGFloat { size.width + Metrics.WriteEditor.railGap }

    /// Does the action of `tool`, as a press of its button does.
    public func press(_ tool: WriteTool) {
        onTool?(tool)
    }

    /// Shows the rail beside `paper`, above the paper.
    func show(beside paper: NSWindow, frame: CGRect) {
        window.setFrame(
            WritePaper.rail(paper: frame, size: size, gap: Metrics.WriteEditor.railGap), display: true)
        if window.parent !== paper {
            window.parent?.removeChildWindow(window)
            paper.addChildWindow(window, ordered: .above)
        }
        window.orderFront(nil)
    }

    func hide() {
        window.parent?.removeChildWindow(window)
        window.orderOut(nil)
    }

    /// Opens the share picker of macOS for `file`, at the rail.
    public func share(_ file: URL) {
        let picker = NSSharingServicePicker(items: [file])
        picker.show(relativeTo: hosting.bounds, of: hosting, preferredEdge: .minX)
    }
}

/// The panel of the rail. It never takes the focus from the paper.
private final class WriteToolsWindow: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

/// The buttons of the tools rail, in a column.
public struct WriteToolsView: View {
    let onTool: (WriteTool) -> Void

    public init(onTool: @escaping (WriteTool) -> Void) {
        self.onTool = onTool
    }

    public var body: some View {
        VStack(spacing: Metrics.WriteEditor.railSpacing) {
            ForEach(WriteTool.allCases, id: \.self) { tool in
                ModeButton(title: tool.title, symbol: tool.symbol, isOn: false, label: tool.label) {
                    onTool(tool)
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Write tools")
    }
}
