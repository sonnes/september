import AppKit
import QuartzCore

/// Runs one animation at a time, and calls `step` with the progress at each
/// tick of its timer. A new run starts from where the last one stopped, so
/// a paper that grows a line at a time never jumps.
///
/// The paper moves its window frame and its scroll with this driver. It uses
/// a timer of the run loop: the animator proxy of a window and the display
/// link of a window both stop for a window with an alpha of 0, and the paper
/// opens from an alpha of 0.
@MainActor
final class WriteMotionDriver: NSObject {
    private var timer: Timer?
    private var started: CFTimeInterval = 0
    private var duration: TimeInterval = 0
    private var curve = CubicCurve.easeOut
    private var step: ((Double) -> Void)?

    func run(duration: TimeInterval, curve: CubicCurve, step: @escaping (Double) -> Void) {
        guard duration > 0 else {
            step(1)
            return
        }
        self.duration = duration
        self.curve = curve
        self.step = step
        started = CACurrentMediaTime()
        if timer == nil {
            let timer = Timer(timeInterval: 1.0 / 120, repeats: true) { [weak self] _ in
                MainActor.assumeIsolated { self?.tick() }
            }
            RunLoop.main.add(timer, forMode: .common)
            self.timer = timer
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        step = nil
    }

    private func tick() {
        let progress = min(1, (CACurrentMediaTime() - started) / duration)
        let current = step
        current?(curve.value(at: progress))
        if progress >= 1 { stop() }
    }
}

extension CGRect {
    /// The rect at `progress` of the way from this rect to `other`.
    func interpolated(to other: CGRect, _ progress: Double) -> CGRect {
        let p = CGFloat(progress)
        return CGRect(
            x: minX + (other.minX - minX) * p, y: minY + (other.minY - minY) * p,
            width: width + (other.width - width) * p, height: height + (other.height - height) * p)
    }
}
