import AppKit
import Combine
import SeptemberKit
import SwiftUI

// Write Lab: the Write paper of the keyboard on its own, with a stand-in for
// the keyboard bar.
//
//   WriteLab                    a stand-in for the keyboard bar, with Write
//   WriteLab --demo             also types a sample document into the paper
//   WriteLab --desk             also opens the desk of documents
//   WriteLab --folder <path>    the folder of documents
//   WriteLab --snapshot <png> [--dark] [--file <md>]
//                               renders the paper to a PNG and quits
//
// The lab keeps its documents in "~/Library/Application Support/September/
// Write Lab", never in the folder of the keyboard.

let arguments = CommandLine.arguments

func argument(after flag: String) -> String? {
    guard let index = arguments.firstIndex(of: flag), index + 1 < arguments.count else { return nil }
    return arguments[index + 1]
}

let app = NSApplication.shared

if let output = argument(after: "--snapshot") {
    MainActor.assumeIsolated {
        let markdown = argument(after: "--file").flatMap { try? String(contentsOfFile: $0, encoding: .utf8) } ?? LabSample.text
        let ok = LabSnapshot.render(markdown, to: URL(fileURLWithPath: output), dark: arguments.contains("--dark"))
        exit(ok ? 0 : 1)
    }
}

let delegate = MainActor.assumeIsolated { LabDelegate() }
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()

// MARK: - App

@MainActor
final class LabDelegate: NSObject, NSApplicationDelegate {
    private var write: WriteController!
    private var paper: WritePaperController { write.paper }
    private let state = LabState()
    private var bar: NSPanel!
    private var demo: LabDemo?
    private var frames = 0
    private var subscription: AnyCancellable?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let folder =
            argument(after: "--folder").map { URL(fileURLWithPath: $0, isDirectory: true) }
            ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("September/Write Lab", isDirectory: true)
        seed(folder)
        write = WriteController(host: self, library: DocumentLibrary(folder: folder))
        NSApp.mainMenu = Self.menu()

        subscription = write.model.$current.sink { [weak self] document in
            self?.state.status = document?.title ?? ""
        }
        write.start()
        showBar()
        toggleWrite()
        if arguments.contains("--demo") { runDemo() }
        if arguments.contains("--desk") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self] in self?.write.showDesk() }
        }
        if arguments.contains("--debug") {
            Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                MainActor.assumeIsolated {
                    guard let self else { return }
                    print("paper", self.paper.window.frame, "alpha", self.paper.window.alphaValue, "content", self.paper.editor.contentHeight, "visible", self.paper.window.isVisible, "sheet", self.paper.window.contentView?.frame ?? .zero, "scroll", self.paper.editor.enclosingScrollView?.frame ?? .zero, "editor", self.paper.editor.frame, "container", self.paper.editor.textContainer?.size ?? .zero)
                    fflush(stdout)
                    self.frames += 1
                    LabSnapshot.capture(self.paper.window, to: URL(fileURLWithPath: "/tmp/writelab-\(self.frames).png"))
                    if self.write.isDeskOpen {
                        LabSnapshot.capture(
                            self.write.desk.window, to: URL(fileURLWithPath: "/tmp/writelab-desk-\(self.frames).png"))
                    }
                }
            }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        write.save()
    }

    /// Puts the sample document into an empty folder.
    private func seed(_ folder: URL) {
        let library = DocumentLibrary(folder: folder)
        guard (try? library.documents().isEmpty) ?? true else { return }
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try? LabSample.text.write(to: folder.appendingPathComponent("Write Lab.md"), atomically: true, encoding: .utf8)
    }

    private func newDocument() {
        write.newDocument()
    }

    // MARK: Bar and paper

    private func showBar() {
        let screen = NSScreen.main?.visibleFrame ?? .zero
        let size = NSSize(width: 760, height: 72)
        let frame = NSRect(x: screen.midX - size.width / 2, y: screen.minY + 24, width: size.width, height: size.height)
        let panel = LabPanel(contentRect: frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.level = .floating
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.contentView = NSHostingView(
            rootView: LabBar(
                state: state,
                write: { [weak self] in self?.toggleWrite() },
                newDocument: { [weak self] in self?.newDocument() },
                documents: { [weak self] in self?.write.showDesk() },
                demo: { [weak self] in
                    guard let self else { return }
                    if !paper.isOpen { toggleWrite() }
                    runDemo()
                }))
        panel.orderFrontRegardless()
        bar = panel
    }

    private func runDemo() {
        newDocument()
        let demo = LabDemo(editor: paper.editor)
        self.demo = demo
        demo.start()
    }

    private func toggleWrite() {
        if paper.isOpen, paper.window.isKeyWindow {
            paper.close()
            return
        }
        let screen = bar.screen?.visibleFrame ?? NSScreen.main?.visibleFrame ?? .zero
        let barFrame = bar.frame.insetBy(dx: 120, dy: 12)
        write.show(from: barFrame, floor: bar.frame.maxY, screen: screen, margin: 24)
    }

    private static func menu() -> NSMenu {
        let main = NSMenu()
        let item = NSMenuItem()
        main.addItem(item)
        let menu = NSMenu()
        menu.addItem(withTitle: "Quit Write Lab", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        item.submenu = menu
        return main
    }
}

/// The lab is a regular app, so a window of Write activates it.
extension LabDelegate: WriteHost {
    func bringToFront(_ window: NSWindow) {
        NSApp.activate()
        window.makeKeyAndOrderFront(nil)
    }

    func windowClosed(_ window: NSWindow) {}
    func writeKeyChanged(_ isKey: Bool) {}
    func writePanelChanged(_ panel: WritePanel) {}

    func writeCaretMoved(_ caret: EditorCaret) {
        state.caret = caret
    }
}

/// The bar never takes the focus, as the keyboard does not.
final class LabPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

@MainActor
final class LabState: ObservableObject {
    @Published var caret = EditorCaret(text: "", caret: 0, length: 0, documentIsEmpty: true)
    @Published var status = ""
}

/// A stand-in for the input bar of the keyboard. It shows the paragraph at
/// the caret, as the keyboard reads it for the predictions.
struct LabBar: View {
    @ObservedObject var state: LabState
    let write: () -> Void
    let newDocument: () -> Void
    let documents: () -> Void
    let demo: () -> Void

    var body: some View {
        HStack(spacing: Metrics.Input.spacing) {
            VStack(alignment: .leading, spacing: 2) {
                Text(mirror)
                    .font(Typography.inputText)
                    .foregroundStyle(Color(Tokens.keyText))
                    .lineLimit(1)
                    .truncationMode(.head)
                Text("caret \(state.caret.caret) · selection \(state.caret.length) · \(state.status)")
                    .font(Typography.bannerText)
                    .foregroundStyle(Color(Tokens.labelSecondary))
                    .lineLimit(1)
            }
            .padding(.horizontal, Metrics.Input.horizontalPadding)
            .frame(maxWidth: .infinity, minHeight: Metrics.Input.height, alignment: .leading)
            .background(Capsule().fill(Color(Tokens.key)))
            Button("Demo", action: demo)
            Button("New", action: newDocument)
            Button("Documents", action: documents)
            Button("Write", action: write)
                .keyboardShortcut(.defaultAction)
        }
        .padding(Metrics.surfacePadding / 2)
        .background(RoundedRectangle(cornerRadius: Metrics.surfaceCornerRadius).fill(Color(Tokens.background)))
    }

    /// The paragraph with a bar at the caret.
    private var mirror: String {
        let text = state.caret.text as NSString
        guard state.caret.caret <= text.length else { return state.caret.text }
        return text.substring(to: state.caret.caret) + "|" + text.substring(from: state.caret.caret)
    }
}

// MARK: - Demo

/// Types a short document into the editor, one character at a time, through
/// the same calls that key events make. It shows the paper feed with no key
/// events, so it never types into another app.
@MainActor
final class LabDemo {
    private let editor: WriteTextView
    private var steps: [Character] = []
    private static let script = """
        # Morning notes
        Slept well. The **new chair** helps.
        - [ ] Call the clinic
        [ ] Ask about the *eye gaze* trial

        Things to say today:
        - Thank you for coming
        - Can we go outside?

        """

    init(editor: WriteTextView) {
        self.editor = editor
    }

    func start() {
        steps = Array(Self.script.dropFirst(2))
        tick()
    }

    private func tick() {
        guard !steps.isEmpty else { return }
        let char = steps.removeFirst()
        if char == "\n" {
            editor.insertNewline(nil)
        } else {
            editor.insertText(String(char), replacementRange: NSRange(location: NSNotFound, length: 0))
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + (char == "\n" ? 0.35 : 0.06)) { [weak self] in
            self?.tick()
        }
    }
}

// MARK: - Snapshot

@MainActor
enum LabSnapshot {
    /// Draws the content of a window into a PNG.
    static func capture(_ window: NSWindow, to url: URL) {
        guard let view = window.contentView,
            let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds)
        else { return }
        view.cacheDisplay(in: view.bounds, to: rep)
        try? rep.representation(using: .png, properties: [:])?.write(to: url)
    }

    /// Renders the paper with `markdown` at the width of an A4 page.
    static func render(_ markdown: String, to url: URL, dark: Bool) -> Bool {
        let appearance = NSAppearance(named: dark ? .darkAqua : .aqua)
        guard let rep = WritePaperController.renderSheet(markdown, width: 595, appearance: appearance),
            let data = rep.representation(using: .png, properties: [:])
        else { return false }
        return (try? data.write(to: url)) != nil
    }
}

// MARK: - Sample

enum LabSample {
    static let text = """
        # Write Lab

        The native editor of the **Write** paper. Type Markdown marks and they turn into the *look*: `# ` for a heading, `- ` for a list, `[ ] ` for a to-do item, and `**bold**` for ~~plain~~ bold text. Links go to [the web](https://september.app) and to [[Welcome]].

        ## Today

        - [ ] Call the clinic
        - [x] Charge the eye gaze camera
        - [ ] Ask about the trial

        ### Things to say

        - Thank you for coming
        - Can we go outside?
          - After lunch
        1. Water
        2. Tea

        > The paper grows as you type, as paper comes out of a typewriter.

        ```swift
        let paper = WritePaperController()
        paper.show(from: bar, floor: top, screen: frame, margin: 24)
        ```

        ---

        | Key | Does |
        |---|---|
        | ⌘B | Bold |

        """
}
