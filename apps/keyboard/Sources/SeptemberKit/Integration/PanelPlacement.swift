import Foundation

/// The shortcut panels that float in windows of their own beside the keys.
public enum DetachedPanel: String, Sendable, CaseIterable, Identifiable {
    case text
    case system
    /// My Panel, with the keys of Write while Write is in front.
    case mine
    /// The shortcuts of Rectangle, the window manager.
    case rectangle

    public var id: Self { self }

    /// The name of the saved frame in `UserDefaults`.
    public var frameName: String { "September Keyboard Panel \(rawValue)" }

    /// The bundle ID of Rectangle.
    public static let rectangleBundleID = "com.knollsoft.Rectangle"

    /// The panels that show. The Rectangle panel shows only when Rectangle
    /// is installed, because its shortcuts do nothing without it.
    public static func shown(rectangleInstalled: Bool) -> [DetachedPanel] {
        allCases.filter { $0 != .rectangle || rectangleInstalled }
    }

    /// The panels show only in Type mode. Talk mode holds Phrases in the
    /// keyboard window.
    public static func isShown(in mode: KeyboardMode) -> Bool {
        mode == .type
    }
}

/// Where the panels sit until the user drags them: System and My Panel
/// at the left of the keys, and Text and Rectangle at the right, with their tops
/// in line with the top of the keys. Frames use the coordinates of AppKit, with
/// the origin at the bottom left.
public enum PanelPlacement {
    /// The panels at the left of the keys, from the keys out.
    static let left: [DetachedPanel] = [.system, .mine]
    /// The panels at the right of the keys, from the keys out.
    static let right: [DetachedPanel] = [.text, .rectangle]

    public static func defaultFrames(
        keys: CGRect, sizes: [DetachedPanel: CGSize]
    ) -> [DetachedPanel: CGRect] {
        let gap = Metrics.Detached.gap
        var frames: [DetachedPanel: CGRect] = [:]
        var x = keys.minX
        for panel in left {
            guard let size = sizes[panel] else { continue }
            x -= gap + size.width
            frames[panel] = CGRect(
                x: x, y: keys.maxY - size.height, width: size.width, height: size.height)
        }
        x = keys.maxX + gap
        for panel in right {
            guard let size = sizes[panel] else { continue }
            frames[panel] = CGRect(
                x: x, y: keys.maxY - size.height, width: size.width, height: size.height)
            x += size.width + gap
        }
        return frames
    }

    /// The panels around the keys where the keyboard is now, as in
    /// `defaultFrames`. A panel that has no room at its side goes to the
    /// other side, out from the panels there. Then each frame moves onto the
    /// screen.
    public static func arrangedFrames(
        keys: CGRect, sizes: [DetachedPanel: CGSize], screen: CGRect
    ) -> [DetachedPanel: CGRect] {
        let gap = Metrics.Detached.gap
        var left = keys.minX
        var right = keys.maxX
        var frames: [DetachedPanel: CGRect] = [:]

        func place(_ panel: DetachedPanel, preferLeft: Bool) {
            guard let size = sizes[panel] else { return }
            let fitsLeft = left - gap - size.width >= screen.minX
            let fitsRight = right + gap + size.width <= screen.maxX
            let x: CGFloat
            if preferLeft ? (fitsLeft || !fitsRight) : (!fitsRight && fitsLeft) {
                x = left - gap - size.width
                left = x
            } else {
                x = right + gap
                right = x + size.width
            }
            frames[panel] = CGRect(x: x, y: keys.maxY - size.height, width: size.width, height: size.height)
        }

        for panel in Self.left { place(panel, preferLeft: true) }
        for panel in Self.right { place(panel, preferLeft: false) }
        return frames.mapValues { onScreen($0, screen) }
    }

    /// `frame`, moved by the least distance so that it is inside `screen`.
    static func onScreen(_ frame: CGRect, _ screen: CGRect) -> CGRect {
        var frame = frame
        frame.origin.x = min(max(frame.minX, screen.minX), screen.maxX - frame.width)
        frame.origin.y = min(max(frame.minY, screen.minY), screen.maxY - frame.height)
        return frame
    }

    /// The bottom left corner of the keys, so that the keys and the panels
    /// beside them are centred in the screen, less `rightInset`.
    public static func keysOrigin(
        keysSize: CGSize, panels: [DetachedPanel: CGSize], in screen: CGRect,
        rightInset: CGFloat, margin: CGFloat
    ) -> CGPoint {
        let gap = Metrics.Detached.gap
        let widths = panels.values.reduce(0) { $0 + $1.width + gap }
        let group = keysSize.width + widths
        let left = (screen.minX + screen.maxX - rightInset) / 2 - group / 2
        let leftPanels = Self.left.compactMap { panels[$0] }.reduce(0) { $0 + $1.width + gap }
        return CGPoint(x: left + leftPanels, y: screen.minY + margin)
    }

    /// True when a saved frame is on one of the screens.
    public static func isVisible(_ frame: CGRect, on screens: [CGRect]) -> Bool {
        screens.contains { $0.intersects(frame) }
    }
}

/// The place of the keyboard window after the user drags it by its grip.
///
/// The saved place is the bottom left corner of the window in Type mode. In
/// Talk mode the window is wider at the left, so that the keys stay where
/// they are on the screen.
@MainActor
public struct KeyboardPosition {
    /// The name of the saved place in `UserDefaults`.
    public static let key = "September Keyboard Window Origin"
    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    public var saved: CGPoint? {
        get {
            guard let pair = defaults.array(forKey: Self.key) as? [Double], pair.count == 2 else { return nil }
            return CGPoint(x: pair[0], y: pair[1])
        }
        nonmutating set {
            defaults.set(newValue.map { [Double($0.x), Double($0.y)] }, forKey: Self.key)
        }
    }

    /// The saved place, if a window of `size` there is on one of the
    /// screens. Otherwise `fallback`.
    public static func origin(
        saved: CGPoint?, size: CGSize, screens: [CGRect], fallback: CGPoint
    ) -> CGPoint {
        guard let saved, PanelPlacement.isVisible(CGRect(origin: saved, size: size), on: screens)
        else { return fallback }
        return saved
    }

    /// The Type mode corner of a window at `origin` in `mode`.
    public static func typeOrigin(of origin: CGPoint, in mode: KeyboardMode) -> CGPoint {
        CGPoint(x: origin.x + shift(mode), y: origin.y)
    }

    /// The corner of the window in `mode` for the Type mode corner `origin`.
    public static func windowOrigin(_ origin: CGPoint, in mode: KeyboardMode) -> CGPoint {
        CGPoint(x: origin.x - shift(mode), y: origin.y)
    }

    /// The bottom left corner of the keys card of a window at `origin` in
    /// `mode`. The window reaches past the keys card at the left, for the
    /// clipboard buttons.
    public static func keysOrigin(ofWindow origin: CGPoint, in mode: KeyboardMode) -> CGPoint {
        let type = typeOrigin(of: origin, in: mode)
        return CGPoint(x: type.x + Metrics.Screen.cardInset(.type), y: type.y)
    }

    /// The corner of the Type mode window whose keys card is at `keys`.
    public static func typeWindowOrigin(forKeys keys: CGPoint) -> CGPoint {
        CGPoint(x: keys.x - Metrics.Screen.cardInset(.type), y: keys.y)
    }

    private static func shift(_ mode: KeyboardMode) -> CGFloat {
        Metrics.Screen.keysInset(mode) - Metrics.Screen.keysInset(.type)
    }
}
