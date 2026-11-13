import SwiftUI

/// The My Panel page of the Settings window: the buttons by use, Add Button,
/// the import, and the switch for new private text. It uses the standard
/// macOS controls.
public struct MyPanelSettingsPage: View {
    @ObservedObject private var store: UserPanelStore
    private let usage: any ButtonUsage
    private let makeImporter: () -> AccessibilityKeyboardImporter

    @State private var adding: AddButtonSheet.Kind?
    @State private var importChoice: ImportChoice?
    @State private var failure: String?

    public init(
        store: UserPanelStore,
        usage: any ButtonUsage = NoButtonUsage(),
        makeImporter: @escaping () -> AccessibilityKeyboardImporter = {
            AccessibilityKeyboardImporter(layout: SystemKeyboardLayout.currentProbe())
        }
    ) {
        self.store = store
        self.usage = usage
        self.makeImporter = makeImporter
    }

    public var body: some View {
        Form {
            Section {
                if store.buttons.isEmpty {
                    Text("No buttons yet. Add a button, or import your panels from the Accessibility Keyboard.")
                        .foregroundStyle(.secondary)
                }
                ForEach(store.ranked(by: usage)) { button in
                    row(button)
                }
            } footer: {
                foot(
                    "The panel shows 11 buttons and a page button on each page, most used first. "
                        + "\(store.buttons.count) \(store.buttons.count == 1 ? "button" : "buttons") in all.")
            }

            Section {
                HStack(spacing: Metrics.UserPanel.actionSpacing) {
                    Menu("Add Button") {
                        Button("Keys…") { adding = .keys }
                        Button("Sequence…") { adding = .sequence }
                        Button("Text…") { adding = .text }
                    }
                    .fixedSize()
                    Button("Import from Accessibility Keyboard…", action: openImport)
                }
            }

            Section {
                Toggle("Make new text private", isOn: $store.makeNewTextPrivate)
            } header: {
                Text("Private Text")
            } footer: {
                foot(
                    "The keyboard types private text, but it never shows the text, keeps a copy, "
                        + "predicts from it, or learns from it.")
            }
        }
        .formStyle(.grouped)
        .sheet(item: $adding) { kind in
            AddButtonSheet(kind: kind, makesPrivate: store.makeNewTextPrivate) { button in
                run { try store.add(button) }
            }
        }
        .sheet(isPresented: Binding(get: { importChoice != nil }, set: { if !$0 { importChoice = nil } })) {
            if let importChoice {
                ImportView(choice: importChoice) {
                    self.importChoice = nil
                } importButtons: {
                    run {
                        try store.importButtons(
                            importChoice.chosenButtons, textAsPrivate: importChoice.textAsPrivate)
                    }
                    self.importChoice = nil
                }
            }
        }
        .alert(
            "My Panel",
            isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })
        ) {
            Button("OK") { failure = nil }
        } message: {
            Text(failure ?? "")
        }
    }

    private func row(_ button: UserButton) -> some View {
        HStack(spacing: Metrics.UserPanel.rowSpacing) {
            KeysChip(text: button.action.keysLabel ?? "Text")
            VStack(alignment: .leading, spacing: Metrics.UserPanel.rowDetailSpacing) {
                Text(button.name)
                Text(summary(button))
                    .font(Typography.UserPanel.rowDetail)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            if isTextButton(button) {
                Toggle("Private", isOn: privateBinding(button))
                    .toggleStyle(.switch)
            }
            Button {
                run { try store.remove(id: button.id) }
            } label: {
                Image(systemName: "minus.circle")
            }
            .buttonStyle(.borderless)
            .help("Remove \(button.name)")
            .accessibilityLabel("Remove \(button.name)")
        }
        .accessibilityElement(children: .contain)
    }

    private func summary(_ button: UserButton) -> String {
        let count = usage.uses(of: button.id)
        let uses = "\(count) \(count == 1 ? "use" : "uses")"
        switch button.action {
        case .shortcut: return "Keys. \(uses)"
        case .sequence: return "Sequence. \(uses)"
        case .text: return "Text. \(uses)"
        case .privateText: return "Text, in the Keychain. \(uses)"
        case .scroll: return "Scroll. \(uses)"
        }
    }

    /// A button whose text can move into the Keychain and back.
    private func isTextButton(_ button: UserButton) -> Bool {
        switch button.action {
        case .text, .privateText: true
        case .shortcut, .sequence, .scroll: false
        }
    }

    private func privateBinding(_ button: UserButton) -> Binding<Bool> {
        Binding {
            if case .privateText = button.action { true } else { false }
        } set: { isPrivate in
            run { try store.setPrivate(isPrivate, for: button.id) }
        }
    }

    private func openImport() {
        run { importChoice = ImportChoice(panels: try makeImporter().panels()) }
    }

    /// Runs a change and shows its error. An error never holds the text of a
    /// button.
    private func run(_ change: () throws -> Void) {
        do {
            try change()
        } catch {
            failure = String(describing: error)
        }
    }

    private func foot(_ text: String) -> some View {
        Text(text)
            .font(Typography.UserPanel.foot)
            .foregroundStyle(.secondary)
    }
}

/// The keys of a button, in a small rounded box.
struct KeysChip: View {
    let text: String

    var body: some View {
        Text(text)
            .font(Typography.UserPanel.chip)
            .lineLimit(1)
            .padding(.horizontal, Metrics.UserPanel.chipHorizontalPadding)
            .padding(.vertical, Metrics.UserPanel.chipVerticalPadding)
            .frame(minWidth: Metrics.UserPanel.chipMinWidth)
            .background(
                RoundedRectangle(cornerRadius: Metrics.UserPanel.chipCornerRadius, style: .continuous)
                    .fill(Color(Tokens.UserPanel.chip))
            )
            .accessibilityHidden(true)
    }
}

/// The sheet that adds one button: keys, a sequence, or text.
struct AddButtonSheet: View {
    enum Kind: String, Identifiable {
        case keys, sequence, text
        var id: Self { self }
    }

    let kind: Kind
    let makesPrivate: Bool
    let add: (NewButton) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var keys = ""
    @State private var text = ""

    var body: some View {
        VStack(alignment: .leading, spacing: Metrics.UserPanel.rowSpacing) {
            Form {
                TextField("Name", text: $name)
                switch kind {
                case .keys, .sequence:
                    TextField("Keys", text: $keys, prompt: Text(kind == .keys ? "cmd+shift+v" : "ctrl+c ctrl+c"))
                    if let parsed = ShortcutSpec.parse(keys) {
                        KeysChip(text: PanelAction.sequence(parsed).keysLabel ?? "")
                    }
                case .text:
                    if makesPrivate {
                        SecureField("Text", text: $text)
                    } else {
                        TextField("Text", text: $text)
                    }
                }
            }
            Text(hint)
                .font(Typography.UserPanel.foot)
                .foregroundStyle(.secondary)
            HStack {
                Spacer()
                Button("Cancel", role: .cancel) { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button("Add") {
                    if let newButton { add(newButton) }
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
                .disabled(newButton == nil)
            }
        }
        .padding(Metrics.UserPanel.sheetPadding)
        .frame(width: Metrics.UserPanel.sheetWidth)
    }

    private var hint: String {
        switch kind {
        case .keys:
            "Type the keys with + between them, for example cmd+shift+v or ⇧⌘V."
        case .sequence:
            "Put a space between the steps, for example ctrl+c ctrl+c or esc esc."
        case .text where makesPrivate:
            "The text goes to the Keychain. The keyboard shows only the name."
        case .text:
            "The text goes to the settings file of the keyboard."
        }
    }

    private var newButton: NewButton? {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        switch kind {
        case .keys:
            guard let parsed = ShortcutSpec.parse(keys), parsed.count == 1 else { return nil }
            return NewButton(name: trimmed.isEmpty ? parsed[0].display : trimmed, action: .shortcut(parsed[0]))
        case .sequence:
            guard let parsed = ShortcutSpec.parse(keys), parsed.count > 1 else { return nil }
            let action = PanelAction.sequence(parsed)
            return NewButton(name: trimmed.isEmpty ? action.keysLabel ?? "" : trimmed, action: action)
        case .text:
            guard !trimmed.isEmpty, !text.isEmpty else { return nil }
            return NewButton(name: trimmed, action: .text(text))
        }
    }
}
