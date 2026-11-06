import AppKit
import ApplicationServices
import SeptemberKit

/// Reads the focused text field out of whatever app is in front, and keeps
/// reading it as the user types, so the input bar can mirror it.
///
/// Changes arrive through an `AXObserver` on the frontmost app's process.
/// Apps that stay quiet are caught by the refresh after every keystroke we
/// send and by a slow poll.
@MainActor
final class FocusWatcher {
    /// Called with the focused field, or `nil` when nothing readable is focused.
    var onChange: ((FocusedField?) -> Void)?
    /// Called when a different app comes to the front, with the title of its
    /// focused window, before any field of its own is read, so the last app's
    /// text can be cleared first.
    var onAppChanged: ((NSRunningApplication?, String?) -> Void)?
    /// Called when focus lands somewhere else entirely — a different element or
    /// a different app — as opposed to the same field simply changing.
    var onFocusMoved: (() -> Void)?
    /// Called when the title of the focused window of the app in front
    /// changes, such as a terminal that starts Claude Code.
    var onWindowTitleChanged: ((String?) -> Void)?

    /// Reading a whole document on every keystroke is wasteful; past this many
    /// characters we ask only for the text around the caret.
    private let windowThreshold = 400
    private let windowRadius = 200

    private let systemElement = AXUIElementCreateSystemWide()
    private var observer: AXObserver?
    private var observedElements: [AXUIElement] = []
    private var workspaceObserver: (any NSObjectProtocol)?
    private var refreshScheduled = false
    private var pollTimer: Timer?
    private var last: FocusedField?
    private var lastElement: AXUIElement?
    private var lastTitle: String?

    func start() {
        workspaceObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            let app =
                notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication
            MainActor.assumeIsolated {
                self?.follow(app)
            }
        }
        follow(NSWorkspace.shared.frontmostApplication)

        // Not every app announces its own edits, and none of them announce a
        // caret moved with the hardware keyboard. A slow poll keeps the bar
        // honest; the reads are cheap and identical results change nothing.
        pollTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.refresh() }
        }
    }

    /// Re-reads the field a moment from now. Called after we post keystrokes:
    /// not every app announces its own text changes, and the ones that do
    /// announce them just after the key lands.
    func refreshSoon() {
        guard !refreshScheduled else { return }
        refreshScheduled = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
            self?.refreshScheduled = false
            self?.refresh()
        }
    }

    func refresh() {
        let title = windowTitle(of: NSWorkspace.shared.frontmostApplication)
        if title != lastTitle {
            lastTitle = title
            onWindowTitleChanged?(title)
        }

        let field = readFocusedField()
        guard field != last else { return }
        last = field
        onChange?(field)
    }

    /// Follows the app in front again, as if it had just come to the front.
    func refollow() {
        follow(NSWorkspace.shared.frontmostApplication)
    }

    /// The title of the focused window of an app. The keyboard's own windows
    /// have no title to report.
    func windowTitle(of app: NSRunningApplication?) -> String? {
        guard let app, app.processIdentifier != ProcessInfo.processInfo.processIdentifier,
            let window = AXUIElementCreateApplication(app.processIdentifier)
                .element(kAXFocusedWindowAttribute)
        else { return nil }
        return window.string(kAXTitleAttribute)
    }

    // MARK: - Following the frontmost app

    private func follow(_ app: NSRunningApplication?) {
        tearDownObserver()
        // The field we were watching belonged to the app we just left, so the
        // next read has to publish even if it looks the same.
        last = nil
        lastElement = nil
        lastTitle = windowTitle(of: app)
        onAppChanged?(app, lastTitle)
        onFocusMoved?()
        guard let app, app.processIdentifier != ProcessInfo.processInfo.processIdentifier else {
            refresh()
            return
        }

        let element = AXUIElementCreateApplication(app.processIdentifier)
        // Electron and Chromium apps build no accessibility tree until an
        // assistive app asks for one. VoiceOver flips the same switch.
        AXUIElementSetAttributeValue(
            element, "AXManualAccessibility" as CFString, kCFBooleanTrue)

        var created: AXObserver?
        guard AXObserverCreate(app.processIdentifier, focusWatcherCallback, &created) == .success,
            let created
        else {
            refresh()
            return
        }
        observer = created

        let context = Unmanaged.passUnretained(self).toOpaque()
        add(kAXFocusedUIElementChangedNotification, on: element, context: context)
        // Some apps announce text changes on the app element, some only on the
        // field itself — register for both and let the coalescing sort it out.
        add(kAXValueChangedNotification, on: element, context: context)
        add(kAXSelectedTextChangedNotification, on: element, context: context)

        CFRunLoopAddSource(
            CFRunLoopGetMain(), AXObserverGetRunLoopSource(created), .defaultMode)

        refresh()
        followFocusedElement(context: context)
        lastElement = focusedElement()
        // Focus often lands a beat after the app comes forward.
        refreshSoon()
    }

    /// Registers on the focused element too, for apps that only notify there.
    /// The previous field's registrations go first — tabbing through a form
    /// would otherwise pile them up for the life of the app.
    private func followFocusedElement(context: UnsafeMutableRawPointer) {
        if let observer {
            for element in observedElements {
                AXObserverRemoveNotification(
                    observer, element, kAXValueChangedNotification as CFString)
                AXObserverRemoveNotification(
                    observer, element, kAXSelectedTextChangedNotification as CFString)
            }
        }
        observedElements = []

        guard let element = focusedElement() else { return }
        add(kAXValueChangedNotification, on: element, context: context)
        add(kAXSelectedTextChangedNotification, on: element, context: context)
        observedElements = [element]
    }

    private func add(
        _ notification: String,
        on element: AXUIElement,
        context: UnsafeMutableRawPointer
    ) {
        guard let observer else { return }
        AXObserverAddNotification(observer, element, notification as CFString, context)
    }

    private func tearDownObserver() {
        if let observer {
            CFRunLoopRemoveSource(
                CFRunLoopGetMain(), AXObserverGetRunLoopSource(observer), .defaultMode)
        }
        observer = nil
        observedElements = []
    }

    /// The observer fires for the app element, so a new focus means new
    /// notifications to register on the field itself.
    ///
    /// Some apps announce a focus change when only the text changed. Private
    /// text stays hidden until the focus leaves its field, so a focus move
    /// counts only when the element itself is a different one.
    fileprivate func focusMoved() {
        followFocusedElement(context: Unmanaged.passUnretained(self).toOpaque())
        let element = focusedElement()
        let isSame = element.flatMap { new in lastElement.map { CFEqual(new, $0) } } ?? false
        lastElement = element
        if !isSame { onFocusMoved?() }
        refresh()
    }

    // MARK: - Reading the field

    /// The focused element, asked of the frontmost app first.
    ///
    /// The system-wide element is the documented route but it returns nothing
    /// whenever the window server's key window and `NSWorkspace`'s frontmost
    /// app disagree — which is most of the time for an app that was activated
    /// programmatically. Asking the app itself always answers.
    private func focusedElement() -> AXUIElement? {
        let ours = ProcessInfo.processInfo.processIdentifier
        if let app = NSWorkspace.shared.frontmostApplication, app.processIdentifier != ours,
            let element = AXUIElementCreateApplication(app.processIdentifier)
                .element(kAXFocusedUIElementAttribute)
        {
            return element
        }
        // Our own panel never takes focus, but the menu bar item can.
        guard let element = systemElement.element(kAXFocusedUIElementAttribute),
            element.pid != ours
        else { return nil }
        return element
    }

    func readFocusedField() -> FocusedField? {
        guard let element = focusedElement() else { return nil }

        let isSecure = element.string(kAXSubroleAttribute) == (kAXSecureTextFieldSubrole as String)
        var settable: DarwinBoolean = false
        AXUIElementIsAttributeSettable(element, kAXValueAttribute as CFString, &settable)

        let selection = element.range(kAXSelectedTextRangeAttribute)
        let read = isSecure ? (text: nil, selection: selection) : readText(element, selection: selection)

        return FocusedField(
            appName: NSRunningApplication(processIdentifier: element.pid)?.localizedName,
            role: element.string(kAXRoleAttribute) ?? "unknown",
            isEditable: settable.boolValue,
            isSecure: isSecure,
            text: read.text,
            selection: read.selection
        )
    }

    /// The field's text, or a window of it around the caret when the field
    /// holds a whole document. A windowed read moves the caret with it, so the
    /// offsets stay relative to the text we hand back.
    private func readText(
        _ element: AXUIElement,
        selection: NSRange?
    ) -> (text: String?, selection: NSRange?) {
        if let count = element.number(kAXNumberOfCharactersAttribute), count > windowThreshold,
            let selection
        {
            let start = max(0, selection.location - windowRadius)
            let length = min(count - start, selection.length + 2 * windowRadius)
            if let window = element.string(
                kAXStringForRangeParameterizedAttribute,
                range: NSRange(location: start, length: length)
            ) {
                return (
                    window,
                    NSRange(location: selection.location - start, length: selection.length)
                )
            }
        }
        return (element.string(kAXValueAttribute), selection)
    }
}

/// AXObserver callbacks are C function pointers, so the watcher travels in the
/// refcon. The observer's run loop source is on the main run loop, which is the
/// main actor.
private func focusWatcherCallback(
    _ observer: AXObserver,
    _ element: AXUIElement,
    _ notification: CFString,
    _ context: UnsafeMutableRawPointer?
) {
    guard let context else { return }
    let watcher = Unmanaged<FocusWatcher>.fromOpaque(context).takeUnretainedValue()
    let name = notification as String
    MainActor.assumeIsolated {
        if name == kAXFocusedUIElementChangedNotification {
            watcher.focusMoved()
        } else {
            watcher.refresh()
        }
    }
}
