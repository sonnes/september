import Foundation

/// A timing curve, as `cubic-bezier(x1, y1, x2, y2)` in CSS and
/// `CAMediaTimingFunction(controlPoints:)` in Core Animation.
public struct CubicCurve: Equatable, Sendable {
    public let x1, y1, x2, y2: Double

    public init(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double) {
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2
    }

    /// The ease-out curve of Core Animation.
    public static let easeOut = CubicCurve(0, 0, 0.58, 1)

    /// The progress at `time`, where both run from 0 to 1.
    public func value(at time: Double) -> Double {
        let t = min(max(time, 0), 1)
        if t == 0 || t == 1 { return t }
        // Find the curve parameter whose x is the time, then read its y.
        var low = 0.0
        var high = 1.0
        var s = t
        for _ in 0..<8 {
            let x = Self.bezier(s, x1, x2) - t
            let slope = Self.slope(s, x1, x2)
            if abs(x) < 1e-6 { return Self.bezier(s, y1, y2) }
            if abs(slope) < 1e-6 { break }
            s -= x / slope
        }
        s = t
        for _ in 0..<40 {
            let x = Self.bezier(s, x1, x2)
            if abs(x - t) < 1e-6 { break }
            if x < t { low = s } else { high = s }
            s = (low + high) / 2
        }
        return Self.bezier(s, y1, y2)
    }

    private static func bezier(_ s: Double, _ p1: Double, _ p2: Double) -> Double {
        let u = 1 - s
        return 3 * u * u * s * p1 + 3 * u * s * s * p2 + s * s * s
    }

    private static func slope(_ s: Double, _ p1: Double, _ p2: Double) -> Double {
        let u = 1 - s
        return 3 * u * u * p1 + 6 * u * s * (p2 - p1) + 3 * s * s * (1 - p2)
    }
}
