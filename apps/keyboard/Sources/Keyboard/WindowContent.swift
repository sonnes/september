import AppKit
import SeptemberKit
import SwiftUI

/// The views of the keyboard window and the panel windows, with their
/// environment. The app and `--snapshot` build the same views.
@MainActor
struct WindowContent {
    let session: KeyboardSession
    let permission: AccessibilityPermission
    let phrases: PanelDefinition
    /// Times the keys and the panel buttons, which act when the button goes
    /// down.
    var presser = KeyPresser()
    var write: () -> Void = {}
    var arrange: () -> Void = {}
    var settings: () -> Void = {}

    private var controller: KeyboardController { session.controller }

    func keyboard() -> AnyView {
        AnyView(
            KeyboardScreen(
                session: session, phrases: phrases, write: write, arrange: arrange, settings: settings)
                .environmentObject(controller)
                .environmentObject(permission)
                .environment(\.keyPresser, presser))
    }

    /// The keys card of Type mode alone, to measure where the panels go.
    func keysCard() -> AnyView {
        AnyView(TypeKeysCard(session: session).environmentObject(controller))
    }

    func panel(_ panel: DetachedPanel) -> AnyView {
        let view: AnyView
        switch panel {
        case .text: view = AnyView(KeypadCard(panel: controller.panels.text))
        case .system: view = AnyView(KeypadCard(panel: controller.panels.system))
        case .mine: view = AnyView(MyPanelCard(session: session))
        case .rectangle: view = AnyView(KeypadCard(panel: controller.panels.rectangle))
        }
        return AnyView(view.environmentObject(controller).environment(\.keyPresser, presser))
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
