import AppKit

/// Listens for a key or a click that does not come from Keyboard: the
/// hardware keyboard, the trackpad, the mouse, or another tool that posts
/// events. Each one uses up the latched modifiers, as Sticky Keys of macOS
/// does.
///
/// The monitors are global, so they get only the events of other apps. A
/// click on a key of Keyboard never reaches them. They need the Accessibility
/// permission that Keyboard already has, and not Input Monitoring. The
/// monitor reads no character of a key.
@MainActor
final class OtherInputMonitor {
    private let onInput: () -> Void
    private var monitors: [Any] = []

    init(onInput: @escaping () -> Void) {
        self.onInput = onInput
    }

    /// A click acts on the button up, so a drag keeps the modifier, as a
    /// Shift-drag selection needs.
    func start() {
        guard monitors.isEmpty else { return }
        let mask: NSEvent.EventTypeMask = [.keyDown, .leftMouseUp, .rightMouseUp, .otherMouseUp]
        if let monitor = NSEvent.addGlobalMonitorForEvents(matching: mask, handler: { [weak self] event in
            guard !Self.isOwn(event), !(event.type == .keyDown && event.isARepeat) else { return }
            MainActor.assumeIsolated { self?.onInput() }
        }) {
            monitors.append(monitor)
        }
    }

    func stop() {
        monitors.forEach(NSEvent.removeMonitor)
        monitors = []
    }

    /// True for an event that Keyboard posted itself.
    private nonisolated static func isOwn(_ event: NSEvent) -> Bool {
        event.cgEvent?.getIntegerValueField(.eventSourceUnixProcessID) == Int64(getpid())
    }
}
