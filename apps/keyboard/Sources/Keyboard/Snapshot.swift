import AppKit
import SeptemberKit
import SwiftUI

/// Renders the keyboard (or the component gallery) to a PNG without opening a
/// window, so the layout can be checked against the design mocks from the
/// terminal:
/// `swift run Keyboard --snapshot out.png [--mono] [--light] [--talk | --write | --mine | --shortcuts | --command | --gallery | --viewer]`.
///
/// `--typed <text>` replaces the sample text of Type mode, Talk mode, or Write.
/// `--write --paper <file.md>` also draws the Write paper with this document
/// above the keyboard window, where the paper opens on a large screen.
/// `--shortcuts` shows the shortcut suggestions of Messages with no text field
/// in focus. `--command` shows them with Command latched in the field.
/// `--mine` fills My Panel with sample buttons.
/// `--spoken <n>` speaks the Talk bar and stops on word `n`, counted from 0.
/// Without `--spoken`, a Talk snapshot with `--typed` shows the bar before
/// Speak. The landing page renders its animations frame by frame with them.
///
/// The keyboard snapshots show the windows where they sit by default, with
/// sample text in place of a real field: Type mode in Messages (frame 1 of the
/// mock), Talk mode during speech (frame 4), and the Write paper in front
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
                AXTreeView(model: model, permission: permission, height: 460, scrolls: false)
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
        let defaults = UserDefaults(suiteName: "september-snapshot-\(UUID().uuidString)")!
        let controller = KeyboardController(sink: SilentSink(), panels: try PanelStore.bundled())
        controller.style = arguments.contains("--mono") ? .mono : .rainbow
        let voice = SampleVoice()
        let userPanel = try UserPanelStore(defaults: defaults, privateTexts: NoPrivateTexts())
        let session = KeyboardSession(
            controller: controller,
            predictions: PredictionEngine(
                predictor: SamplePredictor(), delay: .zero, defaults: defaults,
                history: SentenceHistory(database: try KeyboardDatabase(path: ":memory:"), defaults: defaults)),
            speaker: Speaker(
                settings: VoiceSettingsStore(defaults: defaults), system: voice, elevenLabs: voice),
            userPanel: .success(userPanel),
            userPanelUsage: UsageStore(),
            clipboard: ClipboardHistory(defaults: defaults, now: { Date().addingTimeInterval(-40 * 60) }),
            pasteboard: MemoryPasteboard())
        let content = WindowContent(
            controller: controller, session: session, permission: permission,
            phrases: try Phrases.bundled())

        let typed = value(of: "--typed", in: arguments)
        let spoken = value(of: "--spoken", in: arguments).flatMap(Int.init)
        // The sentence predictions show only after typing, so each field
        // starts empty and the sample text comes after one settle.
        if arguments.contains("--talk") {
            controller.mode = .talk
            settle(session)
            for line in ["Nice try. Two chocolates, not six.", "Ask your mom. She is the boss.",
                "Homework first, then Minecraft.", "Who won the match last night?"]
            {
                controller.talk.said.add(line, at: Date().addingTimeInterval(-300))
            }
            let line = typed ?? "Which Lego set are we building this weekend?"
            controller.talk.type(line)
            if typed == nil || spoken != nil {
                voice.word = word(spoken ?? 3, in: line)
                session.speakPressed()
            }
        } else if arguments.contains("--write") {
            session.appChanged(name: "Write", bundleID: WritePanel.id)
            let line = typed ?? "Send the release notes before the we"
            controller.focusChanged(to: EditorCaret(text: "", caret: 0, length: 0).focusedField)
            settle(session)
            controller.focusChanged(
                to: EditorCaret(text: line, caret: (line as NSString).length, length: 0).focusedField)
        } else {
            session.appChanged(name: "Messages", bundleID: "com.apple.MobileSMS")
            let text = typed ?? "Are we still on for t"
            for sample in ["", text] {
                controller.focusChanged(
                    to: FocusedField(
                        appName: "Messages", role: "AXTextArea", isEditable: true, isSecure: false,
                        text: sample, selection: NSRange(location: (sample as NSString).length, length: 0)))
                settle(session)
            }
            if arguments.contains("--clipboard") {
                addSampleCopies(to: session)
                session.toggleHistory()
            }
            if arguments.contains("--shortcuts") || arguments.contains("--command") {
                session.readMenu = { sampleMenu }
                if arguments.contains("--command") {
                    controller.press(KeyboardLayout.rows.flatMap(\.keys).first { $0.id == "command-left" }!)
                } else {
                    controller.focusChanged(
                        to: FocusedField(
                            appName: "Messages", role: "AXButton", isEditable: false, isSecure: false,
                            text: nil, selection: nil))
                }
            }
            if arguments.contains("--mine") {
                try addSampleButtons(to: userPanel)
                // My Panel ranks its buttons when an app comes to the front.
                session.appChanged(name: "Messages", bundleID: "com.apple.MobileSMS")
            }
        }
        settle(session)

        if arguments.contains("--talk") {
            return content.keyboard()
        }
        if arguments.contains("--write"), let path = value(of: "--paper", in: arguments) {
            return paperScene(content, markdown: try String(contentsOfFile: path, encoding: .utf8))
        }
        return composite(content)
    }

    /// The keyboard window and the panels where they sit by default.
    private static func composite(_ content: WindowContent) -> AnyView {
        let keyboard = content.keyboard()
        let keyboardSize = WindowContent.measure(keyboard)
        let keysSize = WindowContent.measure(content.keysCard())
        var views: [DetachedPanel: AnyView] = [:]
        var sizes: [DetachedPanel: CGSize] = [:]
        for panel in DetachedPanel.allCases {
            views[panel] = content.panel(panel)
            sizes[panel] = WindowContent.measure(views[panel]!)
        }
        // AppKit coordinates: the bottom left corner of the keys is at zero.
        let keys = CGRect(origin: .zero, size: keysSize)
        let frames = PanelPlacement.defaultFrames(keys: keys, sizes: sizes)
        let keyboardFrame = CGRect(origin: KeyboardPosition.typeWindowOrigin(forKeys: keys.origin), size: keyboardSize)
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

    /// The keyboard window with the Write paper open above it, as
    /// `WritePaperController` places and draws it. The screen is a large one,
    /// with 1,000 points above the keyboard. The keyboard floats above the
    /// paper, so it is drawn last.
    private static func paperScene(_ content: WindowContent, markdown: String) -> AnyView {
        let keyboard = content.keyboard()
        let keyboardSize = WindowContent.measure(keyboard)
        let keys = CGRect(origin: .zero, size: WindowContent.measure(content.keysCard()))
        let window = CGRect(origin: KeyboardPosition.typeWindowOrigin(forKeys: keys.origin), size: keyboardSize)
        let screen = CGRect(x: window.minX, y: window.minY, width: window.width, height: window.height + 1_000)
        // The input bar is as wide as the keys and sits over them.
        let bar = CGRect(x: keys.minX, y: window.maxY, width: keys.width, height: 0)
        let page = WritePaper.page(bar: bar, floor: window.maxY, screen: screen, margin: 24)
        let sheet = paperSheet(markdown, width: page.width)
        let paper = WritePaper.paper(height: sheet.size.height, on: page)

        let all = window.union(paper)
        // Room for the shadow of the paper.
        let padding = Metrics.Desk.spacing * 2
        func place(_ frame: CGRect) -> CGSize {
            CGSize(width: frame.minX - all.minX + padding, height: all.maxY - frame.maxY + padding)
        }
        let corners = RoundedRectangle(cornerRadius: Metrics.WriteEditor.paperCornerRadius, style: .continuous)
        return AnyView(
            ZStack(alignment: .topLeading) {
                Image(nsImage: sheet)
                    .clipShape(corners)
                    .shadow(
                        color: Color(Tokens.writeCardShadow), radius: Metrics.Desk.spacing,
                        y: Metrics.Desk.actionGap)
                    .offset(place(paper))
                keyboard.offset(place(window))
            }
            .frame(width: all.width + padding * 2, height: all.height + padding * 2, alignment: .topLeading))
    }

    /// The sheet of the Write paper with `markdown` in the native editor, at
    /// `width`, as tall as its text. The margins are the ones that
    /// `WritePaperController` sets.
    private static func paperSheet(_ markdown: String, width: CGFloat) -> NSImage {
        let editor = WriteTextView(frame: NSRect(x: 0, y: 0, width: width, height: 400))
        let side = max(Metrics.WriteEditor.sideMargin, (width - Metrics.WriteEditor.textWidth) / 2)
        editor.textContainerInset = NSSize(width: side, height: Metrics.WriteEditor.paperMargin)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: width, height: 400), styleMask: [.borderless],
            backing: .buffered, defer: false)
        let view = NSView(frame: window.contentLayoutRect)
        window.contentView = view
        view.addSubview(editor)
        editor.load(markdown)
        let height = editor.contentHeight
        window.setContentSize(NSSize(width: width, height: height))
        view.frame = NSRect(x: 0, y: 0, width: width, height: height)
        editor.frame = view.bounds
        editor.load(markdown)
        view.layoutSubtreeIfNeeded()
        editor.display()

        let image = NSImage(size: NSSize(width: width, height: height))
        guard let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) else { return image }
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
        NSColor(Tokens.key).setFill()
        view.bounds.fill()
        NSGraphicsContext.restoreGraphicsState()
        view.cacheDisplay(in: view.bounds, to: rep)
        image.addRepresentation(rep)
        return image
    }

    /// The value after a flag, such as the text of `--typed <text>`.
    private static func value(of flag: String, in arguments: [String]) -> String? {
        guard let index = arguments.firstIndex(of: flag), index + 1 < arguments.count else { return nil }
        return arguments[index + 1]
    }

    /// The range of word `index` in `line`. Words are split at spaces.
    private static func word(_ index: Int, in line: String) -> NSRange? {
        var location = 0
        for (number, word) in line.split(separator: " ", omittingEmptySubsequences: false).enumerated() {
            let length = (String(word) as NSString).length
            if number == index { return NSRange(location: location, length: length) }
            location += length + 1
        }
        return nil
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

    /// The sample copies of the clipboard history, oldest first. The history
    /// dates each copy 40 minutes ago.
    private static func addSampleCopies(to session: KeyboardSession) {
        for text in [
            "Standup moved to 10:30", "Can you review my pull request today?",
            "https://raviatluri.in/articles/building-september", "Happy birthday! Save me a slice of cake.",
            "Hi team,\nThe keyboard build is ready to test.\nThe notes are in the README.",
            "Table for 4 at 8 pm", "Order #48213", "brew install imagemagick webp",
        ] {
            session.clipboard.add(text)
        }
        (session.pasteboard as? MemoryPasteboard)?.copy("brew install imagemagick webp")
        session.pasteboardChanged()
    }

    /// Lets the predictions and the voice answer before the render.
    private static func settle(_ session: KeyboardSession) {
        let done = Date().addingTimeInterval(1)
        while Date() < done {
            RunLoop.main.run(until: Date().addingTimeInterval(0.05))
        }
    }

    private static func fail(_ message: String) -> Never {
        FileHandle.standardError.write(Data("\(message)\n".utf8))
        exit(1)
    }
}

private final class SilentSink: KeystrokeSink {
    func post(_ events: [Keystroke]) {}
    func post(media key: MediaKey) {}
    func scroll(_ direction: ScrollDirection, at point: CGPoint) {}
    func type(_ text: String) {}
    func beep() {}
}

/// The sample sentences of Type mode, Talk mode, and the Write panel.
private struct SamplePredictor: SentencePredicting {
    var availability: PredictionAvailability { .ready }

    func predictions(for context: PredictionContext) async throws -> [String] {
        if context.mode == .talk {
            return ["Show me the instructions first.", "The spaceship one looks fun.", "You read, I build."]
        }
        // A sentence shows while it continues the typed text.
        return [
            "Are we still on for the match tonight?", "Are we still on for the call at 4?",
            "Are we still on for tomorrow?", "Send the release notes before the weekend.",
        ].filter { $0.hasPrefix(context.typed) && $0 != context.typed }
    }
}

/// Menu items of Messages, for the shortcut snapshots.
private let sampleMenu: [AppShortcut] =
    [
        ("New Message", "n", Modifiers.command), ("Find", "f", .command), ("Bold", "b", .command),
        ("Italic", "i", .command), ("Close Window", "w", .command), ("Minimise", "m", .command),
        ("Delete Conversation", "d", [.command, .shift]), ("Settings…", ",", .command),
        ("Hide Messages", "h", .command), ("Quit Messages", "q", .command),
    ].map { name, key, modifiers in
        AppShortcut(name: name, shortcut: Shortcut(modifiers: modifiers, key: .character(key)))
    } + [
        AppShortcut(
            name: "Emoji & Symbols", shortcut: Shortcut(modifiers: [.control, .command], key: .virtual(.space)))
    ]

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
