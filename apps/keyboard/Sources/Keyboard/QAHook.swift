#if DEBUG
import AppKit
import SeptemberKit

/// Presses the keyboard's own controls for a test. Debug builds only.
///
/// If `KEYBOARD_QA_FIFO` names a FIFO, the hook reads one `QACommand` per line
/// from it. It sends synthetic mouse events straight to the keyboard's own
/// windows with `NSWindow.sendEvent`, so the pointer of the system does not
/// move and no other window gets an event. The keys still type into the app
/// in front, as a real press does.
///
/// The hook writes one line per command to stderr. It never writes the text
/// of a field.
@MainActor
final class QAHook {
    private let windows: () -> [String: NSWindow]
    private var down: (window: NSWindow, point: NSPoint)?

    /// - Parameter windows: the windows that `drag` can name, such as
    ///   `keyboard` and `edit`.
    init?(windows: @escaping () -> [String: NSWindow]) {
        guard let path = ProcessInfo.processInfo.environment["KEYBOARD_QA_FIFO"] else { return nil }
        self.windows = windows
        let lines = AsyncStream<String> { continuation in
            // Opening a FIFO blocks until a writer opens it, so the reads stay
            // off the main thread.
            Thread.detachNewThread {
                while let handle = FileHandle(forReadingAtPath: path) {
                    let text = String(decoding: handle.readDataToEndOfFile(), as: UTF8.self)
                    text.split(separator: "\n").forEach { continuation.yield(String($0)) }
                    try? handle.close()
                }
                continuation.finish()
            }
        }
        Task { [weak self] in
            for await line in lines { await self?.run(line) }
        }
    }

    private func run(_ line: String) async {
        guard let command = QACommand(line: line) else { return log("unknown: \(line)") }
        switch command {
        case .down(let label):
            press(label)
        case .up:
            release()
        case .tap(let label):
            if press(label) { release() }
        case .hold(let label, let milliseconds):
            if press(label) {
                try? await Task.sleep(for: .milliseconds(milliseconds))
                release()
            }
        case .drag(let name, let dx, let dy):
            await drag(name, by: CGSize(width: dx, height: dy))
        case .wait(let milliseconds):
            try? await Task.sleep(for: .milliseconds(milliseconds))
        }
    }

    // MARK: - Presses

    @discardableResult
    private func press(_ label: String) -> Bool {
        guard let (window, point) = find(label) else {
            log("not found: \(label)")
            return false
        }
        send(.leftMouseDown, to: window, at: point)
        down = (window, point)
        log("down: \(label)")
        return true
    }

    private func release() {
        guard let down else { return log("up: nothing is down") }
        send(.leftMouseUp, to: down.window, at: down.point)
        self.down = nil
        log("up")
    }

    /// The centre of the control with `label`, in its window.
    private func find(_ label: String) -> (NSWindow, NSPoint)? {
        for window in NSApp.windows where window.isVisible {
            guard let root = window.contentView, let frame = search(root, for: label) else { continue }
            return (window, window.convertPoint(fromScreen: NSPoint(x: frame.midX, y: frame.midY)))
        }
        return nil
    }

    /// The screen frame of the accessibility element with `label`. SwiftUI's
    /// elements do not bridge as `NSAccessibilityProtocol`, so key-value
    /// coding calls their getters.
    private func search(_ element: Any, for label: String) -> NSRect? {
        guard let element = element as? NSObject else { return nil }
        if element.value(forKey: "accessibilityLabel") as? String == label {
            return (element.value(forKey: "accessibilityFrame") as? NSValue)?.rectValue
        }
        for child in element.value(forKey: "accessibilityChildren") as? [Any] ?? [] {
            if let frame = search(child, for: label) { return frame }
        }
        return nil
    }

    // MARK: - Drags

    private func drag(_ name: String, by delta: CGSize) async {
        guard let window = windows()[name], let grip = gripView(in: window.contentView) else {
            return log("no grip: \(name)")
        }
        let start = grip.convert(NSPoint(x: grip.bounds.midX, y: grip.bounds.midY), to: nil)
        let startScreen = window.convertPoint(toScreen: start)
        let before = window.frame.origin
        send(.leftMouseDown, to: window, at: start)
        let steps = 10
        for step in 1...steps {
            let t = CGFloat(step) / CGFloat(steps)
            let screen = NSPoint(x: startScreen.x + delta.width * t, y: startScreen.y + delta.height * t)
            send(.leftMouseDragged, to: window, at: window.convertPoint(fromScreen: screen))
            try? await Task.sleep(for: .milliseconds(16))
        }
        let end = window.convertPoint(fromScreen: NSPoint(x: startScreen.x + delta.width, y: startScreen.y + delta.height))
        send(.leftMouseUp, to: window, at: end)
        log("drag: \(name) from \(before) to \(window.frame.origin)")
    }

    private func gripView(in view: NSView?) -> NSView? {
        guard let view else { return nil }
        if view.identifier == Grip.identifier { return view }
        return view.subviews.lazy.compactMap { self.gripView(in: $0) }.first
    }

    // MARK: - Events

    private func send(_ type: NSEvent.EventType, to window: NSWindow, at point: NSPoint) {
        guard
            let event = NSEvent.mouseEvent(
                with: type, location: point, modifierFlags: [],
                timestamp: ProcessInfo.processInfo.systemUptime, windowNumber: window.windowNumber,
                context: nil, eventNumber: 0, clickCount: 1, pressure: type == .leftMouseUp ? 0 : 1)
        else { return }
        window.sendEvent(event)
    }

    private func log(_ message: String) {
        FileHandle.standardError.write(Data("qa: \(message)\n".utf8))
    }
}
#endif
