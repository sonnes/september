import CoreGraphics

/// The size of a key, a setting on the Look page. At `extraLarge` the number
/// row, the function row, and the floating panels fold away, so the keys
/// that stay can be large.
public enum KeySize: Int, CaseIterable, Sendable {
    case regular = 48
    case large = 64
    case extraLarge = 88

    /// The height of a standard key, in points.
    public var points: CGFloat { CGFloat(rawValue) }

    /// True when the number row, the function row, and the panels fold away.
    public var foldsAway: Bool { self == .extraLarge }

    /// The size of a key on a screen: the chosen size, or the largest size
    /// that fits `available`, in whole points. `baseWidth` is the width of
    /// the keys at the regular size.
    public func points(fitting available: CGFloat, baseWidth: CGFloat) -> CGFloat {
        guard baseWidth > 0 else { return points }
        let fits = (KeySize.regular.points * available / baseWidth).rounded(.down)
        return min(points, fits)
    }
}
