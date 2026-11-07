import AppKit
import SeptemberKit
import SwiftUI

/// Renders the keyboard (or the component gallery) to a PNG without opening a
/// window, so the layout can be checked against the design mocks from the
/// terminal:
/// `swift run Keyboard --snapshot out.png [--mono] [--light] [--talk | --write | --mine | --gallery | --viewer]`.
///
/// The keyboard snapshots show the windows where they sit by default, with
/// sample text in place of a real field: Type mode in Messages (frame 1 of the
/// mock), Talk mode during speech (frame 4), and the Write window in front
/// (frame 5). Nothing is read from the apps of the user.
@MainActor
enum Snapshot {
    static func run(arguments: [String]) {
        guard let index = arguments.firstIndex(of: "--snapshot"),
            index + 1 < arguments.count
        else { return }

        let path = arguments[index + 1]
        // A snapshot shows the keyboard as a trusted app sees it, with no banner.
        let permission = AccessibilityPermission(isTrusted: true)

        let view: AnyView
        if arguments.contains("--gallery") {
            view = AnyView(ComponentGallery())
        } else if arguments.contains("--viewer") {
            // The real tree of whatever is in front, so the viewer can be
            // checked against the mocks with something in it.
            let model = AXTreeModel()
            model.tree = AXTreeReader.read(app: NSWorkspace.shared.frontmostApplication)
            view = AnyView(
                AXTreeView(model: model, height: 460, scrolls: false)
                    .environmentObject(permission)
                    .padding(16))
        } else {
            do {
                view = try keyboard(arguments: arguments, permission: permission)
            } catch {
                fail("snapshot: \(error)")
            }
        }

        // The app follows the system appearance, so a snapshot has to say which
        // one it wants: tokens resolve against the appearance being drawn in.
        let isLight = arguments.contains("--light")
        let appearance = NSAppearance(named: isLight ? .aqua : .darkAqua)
        let renderer = ImageRenderer(
            content: view.environment(\.colorScheme, isLight ? .light : .dark).environment(\.isSnapshot, true))
        renderer.scale = 2

        var rendered: CGImage?
        if let appearance {
            appearance.performAsCurrentDrawingAppearance { rendered = renderer.cgImage }
        } else {
            rendered = renderer.cgImage
        }
        guard let image = rendered,
            let data = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])
        else { fail("snapshot: nothing rendered") }
        do {
            try data.write(to: URL(fileURLWithPath: path))
        } catch {
            fail("snapshot: \(error)")
        }
        print("wrote \(path)")
        exit(0)
    }

    // MARK: - The keyboard

    private static func keyboard(arguments: [String], permission: AccessibilityPermission) throws -> AnyView {
        let folder = FileManager.default.temporaryDirectory
            .appendingPathComponent("september-snapshot-\(UUID().uuidString)")
        let defaults = UserDefaults(suiteName: "september-snapshot-\(UUID().uuidString)")!
        let controller = KeyboardController(sink: SilentSink(), panels: try PanelStore.bundled())
        controller.style = arguments.contains("--mono") ? .mono : .rainbow
        let voice = SampleVoice()
        let userPanel = try UserPanelStore(
            fileURL: folder.appendingPathComponent("my-panel.json"), privateTexts: NoPrivateTexts())
        let session = KeyboardSession(
            controller: controller,
            predictions: PredictionEngine(
                predictor: SamplePredictor(), delay: .zero, defaults: defaults),
            speaker: Speaker(
                settings: VoiceSettingsStore(defaults: defaults), system: voice, elevenLabs: voice),
            appPanels: AppPanelModel(
                store: controller.panels,
                usage: UsageStore(fileURL: folder.appendingPathComponent("usage.json")),
                learner: ShortcutLearner(fileURL: folder.appendingPathComponent("learned.json")),
                settings: AppPanelSettings(defaults: defaults)),
            userPanel: .success(userPanel),
            userPanelUsage: UsageStore(fileURL: folder.appendingPathComponent("my-panel-usage.json")),
            clipboard: ClipboardHistory(defaults: defaults, now: { Date().addingTimeInterval(-40 * 60) }),
            pasteboard: MemoryPasteboard())
        let content = WindowContent(
            controller: controller, session: session, permission: permission,
            phrases: try Phrases.bundled())

        var appIcon: NSImage?
        if arguments.contains("--talk") {
            controller.mode = .talk
            for line in ["Thank you, that is better.", "Can you turn the radio down a bit?",
                "Yes, toast and jam is fine.", "Good morning. Did you sleep well?"]
            {
                controller.talk.said.add(line, at: Date().addingTimeInterval(-300))
            }
            controller.talk.type("Can we go to the garden after lunch?")
            voice.word = NSRange(location: 7, length: 2)
            session.speakPressed()
        } else if arguments.contains("--write") {
            session.appChanged(name: "Write", bundleID: WritePanel.id, windowTitle: nil)
            controller.focusChanged(
                to: EditorCaret(text: "Who checks the breathing machine at ni", caret: 38, length: 0)
                    .focusedField)
            appIcon = NSApplication.shared.applicationIconImage.tabIcon()
        } else {
            session.appChanged(name: "Messages", bundleID: "com.apple.MobileSMS", windowTitle: nil)
            controller.focusChanged(
                to: FocusedField(
                    appName: "Messages", role: "AXTextArea", isEditable: true, isSecure: false,
                    text: "I would like a cu", selection: NSRange(location: 17, length: 0)))
            appIcon = icon(of: "com.apple.MobileSMS")?.tabIcon()
            if arguments.contains("--clipboard") {
                addSampleCopies(to: session)
                session.toggleHistory()
            }
            if arguments.contains("--mine") {
                try addSampleButtons(to: userPanel)
                session.appChanged(name: "Messages", bundleID: "com.apple.MobileSMS", windowTitle: nil)
                session.appPanelTab = .mine
            }
        }
        settle(session)

        if arguments.contains("--talk") {
            return content.keyboard()
        }
        return composite(content, appIcon: appIcon)
    }

    /// The keyboard window and the panels where they sit by default.
    private static func composite(_ content: WindowContent, appIcon: NSImage?) -> AnyView {
        let keyboard = content.keyboard()
        let keyboardSize = WindowContent.measure(keyboard)
        let keysSize = WindowContent.measure(content.keysCard())
        var views: [DetachedPanel: AnyView] = [:]
        var sizes: [DetachedPanel: CGSize] = [:]
        for panel in DetachedPanel.allCases {
            views[panel] = content.panel(panel, appIcon: appIcon)
            sizes[panel] = WindowContent.measure(views[panel]!)
        }
        // AppKit coordinates: the bottom left corner of the keys is at zero.
        let keys = CGRect(origin: .zero, size: keysSize)
        let frames = PanelPlacement.defaultFrames(keys: keys, sizes: sizes)
        let keyboardFrame = CGRect(origin: keys.origin, size: keyboardSize)
        let all = frames.values.reduce(keyboardFrame) { $0.union($1) }
        let padding = Metrics.surfacePadding

        func place(_ view: AnyView, _ frame: CGRect) -> some View {
            view.offset(x: frame.minX - all.minX + padding, y: all.maxY - frame.maxY + padding)
        }
        return AnyView(
            ZStack(alignment: .topLeading) {
                place(keyboard, keyboardFrame)
                ForEach(DetachedPanel.allCases) { panel in
                    place(views[panel]!, frames[panel]!)
                }
            }
            .frame(
                width: all.width + padding * 2, height: all.height + padding * 2, alignment: .topLeading))
    }

    private static func addSampleButtons(to store: UserPanelStore) throws {
        let samples: [NewButton] = [
            NewButton(name: "Paste as Text", action: .shortcut(Shortcut(modifiers: [.shift, .command], key: .character("v")))),
            NewButton(name: "Save", action: .shortcut(Shortcut(modifiers: .command, key: .character("s")))),
            NewButton(
                name: "Exit",
                action: .sequence(Array(repeating: Shortcut(modifiers: .control, key: .character("c")), count: 2))),
            NewButton(name: "Go to Definition", action: .shortcut(Shortcut(modifiers: [], key: .virtual(.f12)))),
            NewButton(name: "Be right back", action: .text("Be right back")),
        ]
        for sample in samples { try store.add(sample) }
    }

    /// The copies of the clipboard history mock, oldest first. The history
    /// dates each copy 40 minutes ago.
    private static func addSampleCopies(to session: KeyboardSession) {
        for text in [
            "Room 4, second floor", "Please call me back after six",
            "https://maps.apple.com/?q=St+Thomas+Hospital", "Thanks for the flowers, they made my day",
            "Dear Dr Patel,\nThank you for the appointment on Tuesday.\nI will be there at ten.",
            "Ward 7, bed 12", "the 4:30 train", "14 Elm Road, Leeds LS6 2AB",
        ] {
            session.clipboard.add(text)
        }
        (session.pasteboard as? MemoryPasteboard)?.copy("14 Elm Road, Leeds LS6 2AB")
        session.pasteboardChanged()
    }

    /// Lets the predictions and the voice answer before the render.
    private static func settle(_ session: KeyboardSession) {
        let done = Date().addingTimeInterval(1)
        while Date() < done {
            RunLoop.main.run(until: Date().addingTimeInterval(0.05))
        }
    }

    private static func icon(of bundleID: String) -> NSImage? {
        NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleID)
            .map { NSWorkspace.shared.icon(forFile: $0.path) }
    }

    private static func fail(_ message: String) -> Never {
        FileHandle.standardError.write(Data("\(message)\n".utf8))
        exit(1)
    }
}

private final class SilentSink: KeystrokeSink, @unchecked Sendable {
    func post(_ events: [Keystroke]) {}
    func type(_ text: String) {}
}

/// The sentences of frames 1, 4, and 5 of the mock.
private struct SamplePredictor: SentencePredicting {
    var availability: PredictionAvailability { .ready }

    func predictions(for context: PredictionContext) async throws -> [String] {
        if context.mode == .talk {
            return ["I want to see the roses.", "Bring the blue blanket too.", "Is it warm enough outside?"]
        }
        if context.typed.hasSuffix("at ni") {
            return ["Who checks the breathing machine at night?"]
        }
        return [
            "I would like a cup of tea, please.", "I would like a cup of coffee now.",
            "I would like a custard tart for dessert.",
        ]
    }
}

/// A voice that stops on one word and stays there, for the Talk snapshot.
@MainActor
private final class SampleVoice: SpeechEngine {
    var word: NSRange?

    func canSpeak(_ voice: VoiceSettings) -> Bool { true }

    func speak(
        _ text: String, voice: VoiceSettings, onWord: @escaping @MainActor (NSRange) -> Void
    ) async throws {
        if let word { onWord(word) }
        try await Task.sleep(for: .seconds(60))
    }

    func stop() {}
}

private struct NoPrivateTexts: PrivateTextStore {
    func text(for id: String) throws -> String? { nil }
    func setText(_ text: String, for id: String) throws {}
    func removeText(for id: String) throws {}
}
