import Foundation

/// The shortcut panels that float in windows of their own beside the keys.
public enum DetachedPanel: String, Sendable, CaseIterable, Identifiable {
    case edit
    case text
    case system
    case app

    public var id: Self { self }

    /// The name of the saved frame in `UserDefaults`.
    public var frameName: String { "September Keyboard Panel \(rawValue)" }
}

/// Where the panels sit until the user drags them: Edit at the left of the
/// keys, and Text, System, and the app panel at the right, with their tops
/// in line with the top of the keys. Frames use the coordinates of AppKit,
/// with the origin at the bottom left.
public enum PanelPlacement {
    /// The panels at the right of the keys, from the keys out.
    static let right: [DetachedPanel] = [.text, .system, .app]

    public static func defaultFrames(
        keys: CGRect, sizes: [DetachedPanel: CGSize]
    ) -> [DetachedPanel: CGRect] {
        let gap = Metrics.Detached.gap
        var frames: [DetachedPanel: CGRect] = [:]
        if let edit = sizes[.edit] {
            frames[.edit] = CGRect(
                x: keys.minX - gap - edit.width, y: keys.maxY - edit.height,
                width: edit.width, height: edit.height)
        }
        var x = keys.maxX + gap
        for panel in right {
            guard let size = sizes[panel] else { continue }
            frames[panel] = CGRect(
                x: x, y: keys.maxY - size.height, width: size.width, height: size.height)
            x += size.width + gap
        }
        return frames
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
        let edit = panels[.edit].map { $0.width + gap } ?? 0
        return CGPoint(x: left + edit, y: screen.minY + margin)
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

    private static func shift(_ mode: KeyboardMode) -> CGFloat {
        KeyboardScreen.keysInset(mode) - KeyboardScreen.keysInset(.type)
    }
}
