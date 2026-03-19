import SwiftData
import SwiftUI

// MARK: - WriterView
//
// Main writer view composing all chrome around the MarkdownTextView.
//
// Layout (top to bottom):
//   WriterMenuBar (28px) — File/Edit/Format/View/Focus
//   WriterFormatBar (36px) — block type, headings, lists, B/I/U
//   MarkdownTextView (flex) — NSTextView with markdown highlighting
//   WriterFooter (30px) — word count, read time, focus indicator

struct WriterView: View {
    @Bindable var writerState: WriterState
    @Binding var document: Document?
    @State private var text: String = ""
    @State private var cursorPosition: Int = 0
    @State private var showFocusDropdown = false

    @Query private var documents: [Document]
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        VStack(spacing: 0) {
            // Menu bar
            WriterMenuBar(
                writerState: writerState,
                showFocusDropdown: $showFocusDropdown,
                onNew: newDocument,
                onSave: saveDocument
            )

            Divider()

            // Format bar
            WriterFormatBar(text: $text)

            Divider()

            // Editor
            MarkdownTextView(
                text: $text,
                writerState: writerState,
                onCursorChange: { cursorPosition = $0 }
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .onChange(of: text) { _, newValue in
                writerState.updateStats(for: newValue)
                document?.content = newValue
                document?.updatedAt = Date()
            }

            Divider()

            // Footer
            WriterFooter(writerState: writerState)
        }
        .background(Color(nsColor: .textBackgroundColor))
        .onAppear {
            if let doc = document {
                text = doc.content
                writerState.documentName = doc.name
            }
            writerState.updateStats(for: text)
        }
        .onChange(of: document?.id) { _, _ in
            if let doc = document {
                text = doc.content
                writerState.documentName = doc.name
                writerState.updateStats(for: text)
            }
        }
    }

    private func newDocument() {
        let doc = Document(name: "Untitled")
        modelContext.insert(doc)
        document = doc
        text = ""
        writerState.documentName = doc.name
        writerState.updateStats(for: "")
    }

    private func saveDocument() {
        guard let doc = document else {
            newDocument()
            return
        }
        doc.content = text
        doc.updatedAt = Date()
    }
}

// MARK: - WriterMenuBar

struct WriterMenuBar: View {
    var writerState: WriterState
    @Binding var showFocusDropdown: Bool
    var onNew: () -> Void
    var onSave: () -> Void

    var body: some View {
        HStack(spacing: 0) {
            // File menu
            Menu("File") {
                Button("New") { onNew() }
                    .keyboardShortcut("n", modifiers: .command)
                Button("Save") { onSave() }
                    .keyboardShortcut("s", modifiers: .command)
            }
            .menuStyle(.borderlessButton)
            .fixedSize()
            .padding(.horizontal, 8)

            // Edit menu
            Menu("Edit") {
                Button("Undo") { NSApp.sendAction(Selector(("undo:")), to: nil, from: nil) }
                    .keyboardShortcut("z", modifiers: .command)
                Button("Redo") { NSApp.sendAction(Selector(("redo:")), to: nil, from: nil) }
                    .keyboardShortcut("z", modifiers: [.command, .shift])
                Divider()
                Button("Cut") { NSApp.sendAction(#selector(NSText.cut(_:)), to: nil, from: nil) }
                    .keyboardShortcut("x", modifiers: .command)
                Button("Copy") {
                    NSApp.sendAction(#selector(NSText.copy(_:)), to: nil, from: nil)
                }
                    .keyboardShortcut("c", modifiers: .command)
                Button("Paste") {
                    NSApp.sendAction(#selector(NSText.paste(_:)), to: nil, from: nil)
                }
                    .keyboardShortcut("v", modifiers: .command)
                Button("Select All") {
                    NSApp.sendAction(#selector(NSText.selectAll(_:)), to: nil, from: nil)
                }
                    .keyboardShortcut("a", modifiers: .command)
            }
            .menuStyle(.borderlessButton)
            .fixedSize()
            .padding(.horizontal, 8)

            // Format menu
            Menu("Format") {
                Button("Bold") { insertMarkdown("**", "**") }
                    .keyboardShortcut("b", modifiers: .command)
                Button("Italic") { insertMarkdown("*", "*") }
                    .keyboardShortcut("i", modifiers: .command)
                Divider()
                Button("Heading 1") { insertLinePrefix("# ") }
                Button("Heading 2") { insertLinePrefix("## ") }
                Button("Heading 3") { insertLinePrefix("### ") }
                Divider()
                Button("Bullet List") { insertLinePrefix("- ") }
                Button("Numbered List") { insertLinePrefix("1. ") }
                Button("Blockquote") { insertLinePrefix("> ") }
                Button("Code Block") { insertMarkdown("```\n", "\n```") }
                Button("Checkbox") { insertLinePrefix("- [ ] ") }
            }
            .menuStyle(.borderlessButton)
            .fixedSize()
            .padding(.horizontal, 8)

            // View menu
            Menu("View") {
                Toggle("Show Syntax", isOn: .init(
                    get: { writerState.showSyntax },
                    set: { writerState.showSyntax = $0 }
                ))
            }
            .menuStyle(.borderlessButton)
            .fixedSize()
            .padding(.horizontal, 8)

            Spacer()

            // Focus toggle
            focusButton
        }
        .frame(height: 28)
        .background(Color(nsColor: .controlBackgroundColor))
    }

    private var focusButton: some View {
        Menu {
            Button("Disable Focus Mode") {
                writerState.focusMode = .disabled
            }
            .keyboardShortcut("d", modifiers: .command)

            Divider()

            Button {
                writerState.focusMode = .sentence
            } label: {
                HStack {
                    Text("Sentence")
                    if writerState.focusMode == .sentence { Image(systemName: "checkmark") }
                }
            }

            Button {
                writerState.focusMode = .paragraph
            } label: {
                HStack {
                    Text("Paragraph")
                    if writerState.focusMode == .paragraph { Image(systemName: "checkmark") }
                }
            }

            Button {
                writerState.focusMode = .typewriter
            } label: {
                HStack {
                    Text("Typewriter")
                    if writerState.focusMode == .typewriter { Image(systemName: "checkmark") }
                }
            }

            Divider()

            // Show Syntax submenu
            Toggle("Show Syntax", isOn: .init(
                get: { writerState.showSyntax },
                set: { writerState.showSyntax = $0 }
            ))

            Divider()

            // Style Check submenu
            Toggle("Enable Style Check", isOn: .init(
                get: { writerState.styleCheckEnabled },
                set: { writerState.styleCheckEnabled = $0 }
            ))

            if writerState.styleCheckEnabled {
                Toggle("  Fillers", isOn: .init(
                    get: { writerState.styleCheckFillers },
                    set: { writerState.styleCheckFillers = $0 }
                ))
                Toggle("  Clichés", isOn: .init(
                    get: { writerState.styleCheckCliches },
                    set: { writerState.styleCheckCliches = $0 }
                ))
                Toggle("  Redundancies", isOn: .init(
                    get: { writerState.styleCheckRedundancies },
                    set: { writerState.styleCheckRedundancies = $0 }
                ))
            }
        } label: {
            HStack(spacing: 4) {
                Text("Focus")
                    .font(.system(size: 12, weight: .medium))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(
                writerState.focusMode != .disabled
                    ? Color(nsColor: .systemBlue)
                    : Color.clear
            )
            .foregroundStyle(
                writerState.focusMode != .disabled
                    ? .white
                    : .primary
            )
            .clipShape(Capsule())
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
        .padding(.trailing, 12)
    }

    // Placeholders — actual insertion happens via NSTextView responder chain
    private func insertMarkdown(_ prefix: String, _ suffix: String) {
        // Format commands are handled by NSTextView's responder chain
    }

    private func insertLinePrefix(_ prefix: String) {
        // Format commands are handled by NSTextView's responder chain
    }
}

// MARK: - WriterFormatBar

struct WriterFormatBar: View {
    @Binding var text: String

    var body: some View {
        HStack(spacing: 2) {
            // Block type
            Menu("Paragraph") {
                Button("Paragraph") {}
                Button("Heading 1") {}
                Button("Heading 2") {}
                Button("Heading 3") {}
            }
            .menuStyle(.borderlessButton)
            .fixedSize()
            .padding(.horizontal, 8)

            Divider()
                .frame(height: 20)

            formatButton(icon: "textformat.size", label: "Heading", action: {})
            formatButton(icon: "list.bullet", label: "Bullet list", action: {})
            formatButton(icon: "list.number", label: "Numbered list", action: {})
            formatButton(icon: "text.quote", label: "Blockquote", action: {})
            formatButton(icon: "curlybraces", label: "Code block", action: {})
            formatButton(icon: "checklist", label: "Checkbox", action: {})

            Divider()
                .frame(height: 20)

            formatButton(icon: "bold", label: "Bold", action: {})
            formatButton(icon: "italic", label: "Italic", action: {})
            formatButton(icon: "underline", label: "Underline", action: {})

            Divider()
                .frame(height: 20)

            formatButton(icon: "link", label: "Link", action: {})
            formatButton(icon: "photo", label: "Image", action: {})

            Spacer()
        }
        .frame(height: 36)
        .background(Color(nsColor: .controlBackgroundColor).opacity(0.5))
        .padding(.horizontal, 8)
    }

    private func formatButton(icon: String, label: String, action: @escaping () -> Void) -> some View
    {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 13))
                .frame(width: 28, height: 28)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

// MARK: - WriterFooter

struct WriterFooter: View {
    var writerState: WriterState

    var body: some View {
        HStack {
            // Left: stats
            HStack(spacing: 16) {
                Text("\(writerState.wordCount) words")
                Text("\(writerState.characterCount) characters")
                Text("\(writerState.readTimeMinutes) min read")
            }
            .font(.system(size: 11))
            .foregroundStyle(.secondary)

            Spacer()

            // Right: focus mode indicator
            if writerState.focusMode != .disabled {
                HStack(spacing: 4) {
                    Text("\(writerState.focusMode.rawValue.capitalized) Focus")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 6, height: 6)
                }
            }
        }
        .frame(height: 30)
        .padding(.horizontal, 16)
        .background(Color(nsColor: .controlBackgroundColor))
    }
}
