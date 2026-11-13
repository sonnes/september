import AppKit
import SeptemberKit

/// Listens for a key or a click that does not come from Keyboard: the
/// hardware keyboard, the trackpad, the mouse, or another tool that posts
/// events. Each one uses up the latched modifiers, as Sticky Keys of macOS
/// does.
///
/// It also reports the modifier keys that the hardware holds. This is the
/// only source of the modifiers that macOS holds.
///
/// The global monitors get only the events of other apps. The local monitors
/// get the keys of the windows of Keyboard that take focus: Write and
/// Settings. No monitor listens to a click in Keyboard, so a click on a key
/// never uses up a latch. The monitors need the Accessibility permission
/// that Keyboard already has, and not Input Monitoring. The monitor reads no
/// character of a key.
@MainActor
final class OtherInputMonitor {
    private let onInput: () -> Void
    private let onModifiers: (Modifiers) -> Void
    private let pointer: PointerRestTracker
    private var monitors: [Any] = []

    /// - Parameter pointer: gets each move and click of the pointer outside
    ///   the keyboard, so a scroll button knows what to scroll.
    init(
        onInput: @escaping () -> Void, onModifiers: @escaping (Modifiers) -> Void,
        pointer: PointerRestTracker
    ) {
        self.onInput = onInput
        self.onModifiers = onModifiers
        self.pointer = pointer
    }

    /// A click acts on the button up, so a drag keeps the modifier, as a
    /// Shift-drag selection needs.
    func start() {
        guard monitors.isEmpty else { return }
        let mask: NSEvent.EventTypeMask = [.keyDown, .leftMouseUp, .rightMouseUp, .otherMouseUp]
        if let monitor = NSEvent.addGlobalMonitorForEvents(matching: mask, handler: { [weak self] event in
            guard Self.isOtherInput(event) else { return }
            let location = event.type == .leftMouseUp ? event.cgEvent?.location : nil
            MainActor.assumeIsolated {
                self?.onInput()
                if let location { self?.pointer.clicked(at: location) }
            }
        }) {
            monitors.append(monitor)
        }
        if let monitor = NSEvent.addGlobalMonitorForEvents(matching: .mouseMoved, handler: { [weak self] event in
            guard let location = event.cgEvent?.location else { return }
            MainActor.assumeIsolated { self?.pointer.moved(to: location) }
        }) {
            monitors.append(monitor)
        }
        if let monitor = NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged, handler: { [weak self] event in
            guard let modifiers = Self.hardwareModifiers(of: event) else { return }
            MainActor.assumeIsolated { self?.onModifiers(modifiers) }
        }) {
            monitors.append(monitor)
        }
        if let monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown, handler: { [weak self] event in
            if Self.isOtherInput(event) {
                MainActor.assumeIsolated { self?.onInput() }
            }
            return event
        }) {
            monitors.append(monitor)
        }
        if let monitor = NSEvent.addLocalMonitorForEvents(matching: .flagsChanged, handler: { [weak self] event in
            if let modifiers = Self.hardwareModifiers(of: event) {
                MainActor.assumeIsolated { self?.onModifiers(modifiers) }
            }
            return event
        }) {
            monitors.append(monitor)
        }
    }

    func stop() {
        monitors.forEach(NSEvent.removeMonitor)
        monitors = []
    }

    private nonisolated static func isOtherInput(_ event: NSEvent) -> Bool {
        !isOwn(event) && !(event.type == .keyDown && event.isARepeat)
    }

    private nonisolated static func hardwareModifiers(of event: NSEvent) -> Modifiers? {
        guard !isOwn(event) else { return nil }
        return Modifiers(deviceFlags: event.cgEvent?.flags ?? [])
    }

    private nonisolated static func isOwn(_ event: NSEvent) -> Bool {
        event.cgEvent?.getIntegerValueField(.eventSourceUnixProcessID) == Int64(getpid())
    }
}
