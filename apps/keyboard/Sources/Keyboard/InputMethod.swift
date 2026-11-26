import AppKit
import Carbon
import InputMethodKit
import SeptemberKit

/// The keyboard is a palette input method, as the Apple Accessibility
/// Keyboard is. macOS gives each focused field to `InputController`, and the
/// keyboard reads and changes the field through it. A palette gets no typed
/// keys (`inputText`), so the keyboard reads the client after its own keys.
///
/// The input method runs only from ~/Library/Input Methods. A copy elsewhere,
/// such as /Applications, installs itself there and quits.
@MainActor
enum InputMethod {
    static let sourceID = "app.september.keyboard.inputmethod"
    private static var server: IMKServer?

    /// The input method folder of the user.
    static var folder: URL {
        FileManager.default.homeDirectoryForCurrentUser.appending(path: "Library/Input Methods", directoryHint: .isDirectory)
    }

    /// True when this process is the app bundle in the input method folder.
    static var isInstalledCopy: Bool {
        Bundle.main.bundleURL.deletingLastPathComponent().standardizedFileURL == folder.standardizedFileURL
    }

    /// True for a signed app bundle. `make run` runs the bare binary, which is
    /// no input method.
    static var isAppBundle: Bool {
        Bundle.main.bundleURL.pathExtension == "app"
            && Bundle.main.infoDictionary?["InputMethodConnectionName"] != nil
    }

    /// Starts the server of the input method in the installed copy.
    static func startServer() {
        guard isAppBundle, isInstalledCopy, server == nil,
            let name = Bundle.main.infoDictionary?["InputMethodConnectionName"] as? String
        else { return }
        server = IMKServer(name: name, bundleIdentifier: Bundle.main.bundleIdentifier)
    }

    /// Copies a bundle that runs from elsewhere into the input method folder,
    /// opens the copy, and returns true, so the caller quits. The copy keeps
    /// the signature, so the Accessibility permission stays.
    static func relocateIfNeeded() -> Bool {
        guard isAppBundle, !isInstalledCopy else { return false }
        let target = folder.appending(path: Bundle.main.bundleURL.lastPathComponent)
        do {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            if version(of: target) != version(of: Bundle.main.bundleURL) {
                stopRunningCopies()
                if FileManager.default.fileExists(atPath: target.path) {
                    try FileManager.default.removeItem(at: target)
                }
                try FileManager.default.copyItem(at: Bundle.main.bundleURL, to: target)
            }
        } catch {
            NSLog("September Keyboard: the input method was not installed: \(error.localizedDescription)")
            return false
        }
        TISRegisterInputSource(target as CFURL)
        // `open` hands the launch to LaunchServices before this process quits.
        let open = Process()
        open.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        open.arguments = ["-n", target.path]
        do {
            try open.run()
            open.waitUntilExit()
        } catch {
            return false
        }
        return true
    }

    /// Registers, enables, and selects the input source. The first enable
    /// opens System Settings, where the user confirms it one time.
    static func selectSelf(defaults: UserDefaults = .standard) {
        guard isAppBundle, isInstalledCopy else { return }
        TISRegisterInputSource(Bundle.main.bundleURL as CFURL)
        guard let source = inputSource() else { return }
        if !boolProperty(source, kTISPropertyInputSourceIsEnabled) {
            let asked = "inputMethod.askedToEnable"
            guard !defaults.bool(forKey: asked) else { return }
            defaults.set(true, forKey: asked)
            TISEnableInputSource(source)
            return
        }
        if !boolProperty(source, kTISPropertyInputSourceIsSelected) {
            TISSelectInputSource(source)
        }
    }

    private static func inputSource() -> TISInputSource? {
        let filter = [kTISPropertyInputSourceID as String: sourceID] as CFDictionary
        let list = TISCreateInputSourceList(filter, true)?.takeRetainedValue() as? [TISInputSource]
        return list?.first
    }

    private static func boolProperty(_ source: TISInputSource, _ key: CFString) -> Bool {
        guard let raw = TISGetInputSourceProperty(source, key) else { return false }
        return CFBooleanGetValue(Unmanaged<CFBoolean>.fromOpaque(raw).takeUnretainedValue())
    }

    private static func version(of bundle: URL) -> String? {
        Bundle(url: bundle)?.infoDictionary?["CFBundleVersion"] as? String
    }

    /// Stops the running copies of the keyboard other than this process, so
    /// macOS starts the new copy.
    private static func stopRunningCopies() {
        guard let id = Bundle.main.bundleIdentifier else { return }
        for app in NSRunningApplication.runningApplications(withBundleIdentifier: id)
        where app.processIdentifier != getpid() {
            app.terminate()
        }
    }
}

/// The live input clients of the process: the client of the focused field,
/// between `activateServer` and `deactivateServer`.
@MainActor
final class InputClients {
    static let shared = InputClients()
    private(set) var active: IMKClient?

    /// The client of the app with `bundleID`, or `nil` when the input method
    /// is not active in it.
    func client(forBundleID bundleID: String?) -> IMKClient? {
        guard let active, let bundleID, active.bundleIdentifier == bundleID else { return nil }
        return active
    }

    /// The client of the app in front.
    var frontClient: IMKClient? {
        client(forBundleID: NSWorkspace.shared.frontmostApplication?.bundleIdentifier)
    }

    func activate(_ client: IMKClient) { active = client }

    /// macOS can send a new proxy for the same client, so the app decides.
    func deactivate(_ client: IMKClient) {
        if active?.bundleIdentifier == client.bundleIdentifier { active = nil }
    }
}

/// An `IMKTextInput` client as an `InputClient`.
@MainActor
final class IMKClient: InputClient {
    let client: any IMKTextInput & NSObjectProtocol

    init(_ client: any IMKTextInput & NSObjectProtocol) {
        self.client = client
    }

    var bundleIdentifier: String? { client.bundleIdentifier() }
    var length: Int { client.length() }
    var selectedRange: NSRange { client.selectedRange() }

    func string(from range: NSRange) -> (text: String, range: NSRange)? {
        var actual = NSRange()
        guard let text = client.string(from: range, actualRange: &actual) else { return nil }
        return (text, actual)
    }

    func insert(_ text: String, replacing range: NSRange) {
        client.insertText(text, replacementRange: range)
        closeInlinePrediction()
    }

    /// The apps where the Apple Accessibility Keyboard taps Control after an
    /// insert, so the inline prediction of macOS closes
    /// (`-[ACAPTextInputController shouldCancelInlinePrediction]`).
    static let closesInlinePrediction: Set<String> = [
        "com.apple.MobileSMS", "com.apple.mail", "com.apple.Safari", "com.apple.Notes",
        "com.apple.Spotlight", "com.apple.iCal", "com.apple.Maps",
    ]

    private func closeInlinePrediction() {
        guard let id = bundleIdentifier, Self.closesInlinePrediction.contains(id) else { return }
        for isDown in [true, false] {
            CGEvent(keyboardEventSource: nil, virtualKey: 59, keyDown: isDown)?.post(tap: .cgSessionEventTap)
        }
    }
}

/// The controller that InputMethodKit makes for each client. The name in
/// `InputMethodServerControllerClass` of Info.plist must match.
@objc(SeptemberInputController)
final class InputController: IMKInputController {
    override func activateServer(_ sender: Any!) {
        guard let client = sender as? (any IMKTextInput & NSObjectProtocol) else { return }
        MainActor.assumeIsolated { InputClients.shared.activate(IMKClient(client)) }
    }

    override func deactivateServer(_ sender: Any!) {
        guard let client = sender as? (any IMKTextInput & NSObjectProtocol) else { return }
        MainActor.assumeIsolated { InputClients.shared.deactivate(IMKClient(client)) }
    }
}
