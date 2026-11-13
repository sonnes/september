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
        Task { await render(to: path, arguments: arguments) }
        // The main thread runs the render, and the render ends the process.
        RunLoop.main.run()
        fail("snapshot: the run loop stopped")
    }

    /// The three tabs of the Debug panel side by side. The Context and the
    /// Records tabs show sample text. The Tree tab shows the real tree of
    /// whatever is in front, so it can be checked with something in it.
    private static func debugPanels(permission: AccessibilityPermission) async -> AnyView {
        let predictions = PredictionEngine(
            predictor: DebugSamplePredictor(), delay: .zero, defaults: UserDefaults(suiteName: "september-snapshot-\(UUID().uuidString)")!)
        let screen = ScreenContext(
            appName: "Messages", title: "Sam", field: "iMessage",
            lines: ["Are you still up for coffee this week?", "I'm free Wed or Thu after 2"])
        let said = ["I'll be home by six tonight", "Can you grab the charger?"]
        predictions.update(input: .mirrored(text: "", caret: 0, selectionLength: 0), mode: .type, said: said)
        let typed = "Sounds good, I can do Thursday aft"
        predictions.update(
            input: .mirrored(text: typed, caret: typed.utf16.count, selectionLength: 0), mode: .type, said: said,
            screen: screen)
        await predictions.settle()

        let database = try! KeyboardDatabase(path: ":memory:")
        let now = Date().timeIntervalSince1970
        for (index, text) in ["Sounds good, see you then", "Running a few minutes late"].enumerated() {
            try? database.execute(
                "INSERT INTO sentence (text, key, uses, first_at, last_at) VALUES (?, ?, ?, ?, ?)",
                [.text(text), .text(text.lowercased()), .int(Int64(9 - index)), .double(now - 86_400),
                 .double(now - Double(index + 1) * 600)])
        }
        let tree = AXTreeReader.read(app: NSWorkspace.shared.frontmostApplication)
        let panels = DebugTab.allCases.map { tab in
            let model = DebugPanelModel(records: RecordBrowser(database: database))
            model.tab = tab
            model.reloadRecords()
            model.tree.tree = tree
            return DebugPanelView(
                model: model, predictions: predictions, permission: permission, height: 460, scrolls: false)
        }
        return AnyView(
            HStack(alignment: .top, spacing: 16) {
                ForEach(Array(panels.enumerated()), id: \.offset) { $0.element }
            }
            .padding(16))
    }

    private static func render(to path: String, arguments: [String]) async -> Never {
        // A snapshot shows the keyboard as a trusted app sees it, with no banner.
        let permission = AccessibilityPermission(isTrusted: true)

        let view: AnyView
        if arguments.contains("--gallery") {
            view = AnyView(ComponentGallery())
        } else if arguments.contains("--viewer") {
            view = await debugPanels(permission: permission)
        } else {
            do {
                view = try await keyboard(arguments: arguments, permission: permission)
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

    private static func keyboard(arguments: [String], permission: AccessibilityPermission) async throws -> AnyView {
        let defaults = UserDefaults(suiteName: "september-snapshot-\(UUID().uuidString)")!
        let database = try KeyboardDatabase(path: ":memory:")
        let voice = SampleVoice()
        let reader = SampleReader()
        let pasteboard = MemoryPasteboard()
        let assembly = try KeyboardAssembly(
            sink: SilentSink(), database: database, pasteboard: pasteboard, reader: reader,
            speaker: Speaker(settings: VoiceSettingsStore(defaults: defaults), system: voice, elevenLabs: voice),
            write: SampleWrite(),
            predictions: PredictionEngine(
                predictor: SamplePredictor(), delay: .zero, defaults: defaults,
                history: SentenceHistory(database: database, defaults: defaults)),
            defaults: defaults, privateTexts: NoPrivateTexts(),
            clipboardClock: { Date().addingTimeInterval(-40 * 60) }, scheduler: NoDelayScheduler())
        let session = assembly.session
        let controller = session.controller
        assembly.settings.style = arguments.contains("--mono") ? .mono : .rainbow
        let content = WindowContent(session: session, permission: permission, phrases: assembly.phrases)

        let typed = value(of: "--typed", in: arguments)
        let spoken = value(of: "--spoken", in: arguments).flatMap(Int.init)
        // The sentence predictions show only after typing, so each field
        // starts empty and the sample text comes after one settle.
        if arguments.contains("--talk") {
            controller.mode = .talk
            await session.settle()
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
            session.writeKeyChanged(true, panel: .paper, front: nil)
            let line = typed ?? "Send the release notes before the we"
            await session.settle()
            session.writeCaretMoved(EditorCaret(text: line, caret: (line as NSString).length, length: 0))
        } else {
            session.appActivated(FrontApp(pid: 0, name: "Messages", bundleID: "com.apple.MobileSMS"))
            let text = typed ?? "Are we still on for t"
            for sample in ["", text] {
                session.focusChanged(
                    to: FocusedField(
                        appName: "Messages", role: "AXTextArea", isEditable: true, isSecure: false,
                        text: sample, selection: NSRange(location: (sample as NSString).length, length: 0)))
                await session.settle()
            }
            if arguments.contains("--clipboard") {
                addSampleCopies(to: session, pasteboard: pasteboard)
                session.toggleHistory()
            }
            if arguments.contains("--shortcuts") || arguments.contains("--command") {
                reader.menu = sampleMenu
                if arguments.contains("--command") {
                    controller.press(KeyboardLayout.rows.flatMap(\.keys).first { $0.id == "command-left" }!)
                } else {
                    session.focusChanged(
                        to: FocusedField(
                            appName: "Messages", role: "AXButton", isEditable: false, isSecure: false,
                            text: nil, selection: nil))
                }
            }
            if arguments.contains("--mine") {
                guard let userPanel = session.userPanel else { fail("snapshot: \(session.userPanelError ?? "")") }
                try addSampleButtons(to: userPanel)
            }
        }
        await session.settle()

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
    /// with room for the paper above the keyboard. The keyboard floats above
    /// the paper, so it is drawn last. The tools rail stands at the left
    /// of the paper.
    private static func paperScene(_ content: WindowContent, markdown: String) -> AnyView {
        let keyboard = content.keyboard()
        let keyboardSize = WindowContent.measure(keyboard)
        let keys = CGRect(origin: .zero, size: WindowContent.measure(content.keysCard()))
        let window = CGRect(origin: KeyboardPosition.typeWindowOrigin(forKeys: keys.origin), size: keyboardSize)
        let screen = CGRect(x: window.minX, y: window.minY, width: window.width, height: window.height + 1_000)
        // The input bar is as wide as the keys and sits over them.
        let bar = CGRect(x: keys.minX, y: window.maxY, width: keys.width, height: 0)
        let tools = WriteToolsView(onTool: { _ in })
        let toolsSize = WindowContent.measure(AnyView(tools))
        let page = WritePaper.page(
            bar: bar, floor: window.maxY, screen: screen, margin: 24,
            leading: toolsSize.width + Metrics.WriteEditor.railGap)
        let sheet = NSImage(size: NSSize(width: page.width, height: 0))
        if let rep = WritePaperController.renderSheet(markdown, width: page.width) {
            sheet.size = rep.size
            sheet.addRepresentation(rep)
        }
        let paper = WritePaper.paper(height: sheet.size.height, on: page)
        let rail = WritePaper.rail(paper: paper, size: toolsSize, gap: Metrics.WriteEditor.railGap)

        let all = window.union(paper).union(rail)
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
                tools.offset(place(rail))
                keyboard.offset(place(window))
            }
            .frame(width: all.width + padding * 2, height: all.height + padding * 2, alignment: .topLeading))
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

    /// The sample copies of the clipboard history, oldest first.
    private static func addSampleCopies(to session: KeyboardSession, pasteboard: MemoryPasteboard) {
        for text in [
            "Standup moved to 10:30", "Can you review my pull request today?",
            "https://raviatluri.in/articles/building-september", "Happy birthday! Save me a slice of cake.",
            "Hi team,\nThe keyboard build is ready to test.\nThe notes are in the README.",
            "Table for 4 at 8 pm", "Order #48213", "brew install imagemagick webp",
        ] {
            session.clipboard.add(text)
        }
        pasteboard.copy("brew install imagemagick webp")
        session.pasteboardChanged()
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

/// The menu of the sample app, and no text on screen.
@MainActor
private final class SampleReader: FrontAppReading {
    var menu: [AppShortcut] = []

    func menuShortcuts(pid: pid_t) -> [AppShortcut] { menu }
    func screenContext(app: FrontApp) async -> ScreenContext? { nil }
}

/// Does the work of a delay at once, so the snapshot shows the state after
/// the delay, such as an input bar that hid.
private struct NoDelayScheduler: DelayScheduler {
    private final class Done: ScheduledWork {
        func cancel() {}
    }

    func schedule(after delay: TimeInterval, _ work: @escaping @MainActor () -> Void) -> any ScheduledWork {
        MainActor.assumeIsolated { work() }
        return Done()
    }
}

/// A new Write document with no text.
@MainActor
private final class SampleWrite: WriteReading {
    let caret = EditorCaret(text: "", caret: 0, length: 0, documentIsEmpty: true)
    let speech = EditorSpeech(selection: "", markdown: "")
}

private struct NoPrivateTexts: PrivateTextStore {
    func text(for id: String) throws -> String? { nil }
    func setText(_ text: String, for id: String) throws {}
    func removeText(for id: String) throws {}
}

/// Answers of the Debug panel snapshot, one of which does not fit the field.
private struct DebugSamplePredictor: SentencePredicting {
    var availability: PredictionAvailability { .ready }

    func predictions(for context: PredictionContext) async throws -> [String] {
        ["afternoon, around three?", "afternoon works for me", "Coffee is fine."]
    }
}
