import AppKit
import SwiftUI

/// The card of a shortcut panel in a window of its own, or of the keys: the
/// surface of the keyboard with a grip at the top. The user drags the window
/// by the grip.
public struct PanelCard<Content: View>: View {
    private let sidePadding: CGFloat
    private let content: Content

    public init(
        sidePadding: CGFloat = Metrics.Detached.sidePadding, @ViewBuilder content: () -> Content
    ) {
        self.sidePadding = sidePadding
        self.content = content()
    }

    public var body: some View {
        content
            .padding(.top, Metrics.Detached.topPadding)
            .padding(.horizontal, sidePadding)
            .padding(.bottom, sidePadding)
            .background(
                RoundedRectangle(cornerRadius: Metrics.Detached.cornerRadius, style: .continuous)
                    .fill(Color(Tokens.background))
            )
            .overlay(alignment: .top) { Grip(height: Metrics.Detached.topPadding) }
    }
}

/// The grip at the top of a card: a bar the width of the card. A drag on it
/// moves the window. The drag does not activate the app or take focus.
public struct Grip: View {
    /// The identifier of the view that moves the window.
    public static let identifier = NSUserInterfaceItemIdentifier("september.grip")

    let height: CGFloat
    @Environment(\.isSnapshot) private var isSnapshot

    public var body: some View {
        Capsule()
            .fill(Color(Tokens.labelSecondary))
            .opacity(Metrics.Detached.gripOpacity)
            .frame(width: Metrics.Detached.grip.width, height: Metrics.Detached.grip.height)
            .padding(.top, Metrics.Detached.gripTop)
            .frame(maxWidth: .infinity, minHeight: height, maxHeight: height, alignment: .top)
            .background { if !isSnapshot { WindowDragArea() } }
            .accessibilityHidden(true)
    }
}

extension EnvironmentValues {
    /// True when `--snapshot` draws the view. `ImageRenderer` draws an AppKit
    /// view as a yellow box, so the grip leaves out its drag area.
    @Entry public var isSnapshot = false
}

/// Moves its window when the user drags it. The view moves the window
/// itself, so a panel that never becomes key moves too, and the app does not
/// activate.
private struct WindowDragArea: NSViewRepresentable {
    final class DragView: NSView {
        /// The point of the mouse and the corner of the window when the
        /// button went down, in screen coordinates.
        private var start: (mouse: NSPoint, origin: NSPoint)?

        override var mouseDownCanMoveWindow: Bool { false }
        override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

        override func mouseDown(with event: NSEvent) {
            guard let window else { return }
            start = (window.convertPoint(toScreen: event.locationInWindow), window.frame.origin)
        }

        override func mouseDragged(with event: NSEvent) {
            guard let window, let start else { return }
            let mouse = window.convertPoint(toScreen: event.locationInWindow)
            window.setFrameOrigin(
                NSPoint(x: start.origin.x + mouse.x - start.mouse.x, y: start.origin.y + mouse.y - start.mouse.y))
        }

        override func mouseUp(with event: NSEvent) {
            start = nil
        }
    }

    func makeNSView(context: Context) -> DragView {
        let view = DragView()
        view.identifier = Grip.identifier
        return view
    }

    func updateNSView(_ view: DragView, context: Context) {}
}

/// A keypad in a window of its own: Edit, Text, or System.
public struct KeypadCard: View {
    @EnvironmentObject private var controller: KeyboardController
    private let panel: PanelDefinition

    public init(panel: PanelDefinition) {
        self.panel = panel
    }

    public var body: some View {
        PanelCard {
            PanelGridView(panel: panel) { controller.perform($0) }
        }
    }
}

/// The app panel in a window of its own, with two tabs: the panel of the app
/// in front, and Mine.
public struct AppPanelCard: View {
    @EnvironmentObject private var controller: KeyboardController
    @ObservedObject private var session: KeyboardSession
    @ObservedObject private var appPanels: AppPanelModel
    private let appIcon: NSImage?

    /// - Parameter appIcon: the icon of the app in front, for its tab.
    public init(session: KeyboardSession, appIcon: NSImage?) {
        self.session = session
        appPanels = session.appPanels
        self.appIcon = appIcon
    }

    public var body: some View {
        PanelCard {
            VStack(spacing: Metrics.Detached.tabsBottom) {
                HStack(spacing: Metrics.Detached.tabSpacing) {
                    PanelTab(title: title, icon: appIcon, isSelected: session.appPanelTab == .app) {
                        session.appPanelTab = .app
                    }
                    PanelTab(title: "Mine", icon: nil, isSelected: session.appPanelTab == .mine) {
                        session.appPanelTab = .mine
                    }
                }
                .frame(width: Metrics.AppPanel.width)

                switch session.appPanelTab {
                case .app:
                    AppShortcutsView(panel: appPanels.panel, appName: nil, showsHeader: false) {
                        session.pressAppPanel($0)
                    }
                case .mine:
                    mine
                }
            }
        }
    }

    @ViewBuilder
    private var mine: some View {
        if let error = session.userPanelError {
            message(error)
        } else if session.mineButtons.isEmpty {
            message("Mine is empty. Add buttons in Settings, My Panel.")
        } else {
            MinePanelView(buttons: session.mineButtons) { session.pressMine($0) }
        }
    }

    private func message(_ text: String) -> some View {
        Text(text)
            .font(Typography.panelMessage)
            .foregroundStyle(Color(Tokens.labelSecondary))
            .multilineTextAlignment(.leading)
            .frame(
                width: Metrics.AppPanel.width, height: Metrics.AppPanel.gridHeight, alignment: .topLeading)
    }

    private var title: String {
        appPanels.title(appName: controller.frontmostAppName)
    }
}

/// A tab of the app panel.
private struct PanelTab: View {
    let title: String
    let icon: NSImage?
    let isSelected: Bool
    let select: () -> Void

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Metrics.Detached.tabCornerRadius, style: .continuous)
        HStack(spacing: Metrics.Detached.tabIconSpacing) {
            if let icon {
                Image(nsImage: icon)
                    .resizable()
                    .frame(width: Metrics.Detached.tabIcon, height: Metrics.Detached.tabIcon)
                    .accessibilityHidden(true)
            }
            Text(title)
                .font(Typography.tabLabel)
                .lineLimit(1)
                .minimumScaleFactor(Metrics.AppPanel.keysMinimumScale)
        }
        .foregroundStyle(Color(isSelected ? Tokens.keyText : Tokens.labelSecondary))
        .frame(maxWidth: .infinity)
        .frame(height: Metrics.Detached.tabHeight)
        .background(shape.fill(Color(isSelected ? Tokens.key : Tokens.keySpecial)))
        .overlay(shape.strokeBorder(Color(Tokens.accent), lineWidth: 1).opacity(isSelected ? 1 : 0))
        .pressable(label: "\(title) tab", isSelected: isSelected, onPressing: { _ in }, action: select)
    }
}
