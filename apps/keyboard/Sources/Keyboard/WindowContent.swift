import AppKit
import SeptemberKit
import SwiftUI

/// The views of the keyboard window and the panel windows, with their
/// environment. The app and `--snapshot` build the same views.
@MainActor
struct WindowContent {
    let controller: KeyboardController
    let session: KeyboardSession
    let permission: AccessibilityPermission
    let phrases: PanelDefinition
    var write: () -> Void = {}
    var settings: () -> Void = {}

    func keyboard() -> AnyView {
        AnyView(
            KeyboardScreen(session: session, phrases: phrases, write: write, settings: settings)
                .environmentObject(controller)
                .environmentObject(permission))
    }

    /// The keys card of Type mode alone, to measure where the panels go.
    func keysCard() -> AnyView {
        AnyView(TypeKeysCard(session: session).environmentObject(controller))
    }

    func panel(_ panel: DetachedPanel, appIcon: NSImage?) -> AnyView {
        let view: AnyView
        switch panel {
        case .edit: view = AnyView(KeypadCard(panel: controller.panels.edit))
        case .text: view = AnyView(KeypadCard(panel: controller.panels.text))
        case .system: view = AnyView(KeypadCard(panel: controller.panels.system))
        case .app: view = AnyView(AppPanelCard(session: session, appIcon: appIcon))
        }
        return AnyView(view.environmentObject(controller))
    }

    /// The size that a view asks for.
    static func measure(_ view: AnyView) -> CGSize {
        let probe = NSHostingView(rootView: view)
        probe.layoutSubtreeIfNeeded()
        return probe.fittingSize
    }
}

extension FrontApp {
    init(_ app: NSRunningApplication) {
        self.init(pid: app.processIdentifier, name: app.localizedName, bundleID: app.bundleIdentifier)
    }
}

extension NSImage {
    /// The icon drawn once into a small bitmap for the tab of the app panel.
    /// An app icon holds many large images, and `ImageRenderer` draws a grey
    /// layer over the whole view when it meets one.
    func tabIcon() -> NSImage? {
        let side = Int(Metrics.Detached.tabIcon * 2)
        guard
            let bitmap = NSBitmapImageRep(
                bitmapDataPlanes: nil, pixelsWide: side, pixelsHigh: side, bitsPerSample: 8,
                samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                bytesPerRow: 0, bitsPerPixel: 0),
            let context = NSGraphicsContext(bitmapImageRep: bitmap)
        else { return nil }
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = context
        draw(in: NSRect(x: 0, y: 0, width: side, height: side))
        NSGraphicsContext.restoreGraphicsState()
        let image = NSImage(size: NSSize(width: Metrics.Detached.tabIcon, height: Metrics.Detached.tabIcon))
        image.addRepresentation(bitmap)
        return image
    }
}
