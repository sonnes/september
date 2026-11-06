import SwiftUI

/// Import from Accessibility Keyboard: the panels on this Mac, each with a
/// check box, and the switch that keeps the imported text private.
public struct ImportView: View {
    @ObservedObject private var choice: ImportChoice
    private let cancel: () -> Void
    private let importButtons: () -> Void

    public init(
        choice: ImportChoice,
        cancel: @escaping () -> Void,
        importButtons: @escaping () -> Void
    ) {
        self.choice = choice
        self.cancel = cancel
        self.importButtons = importButtons
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Form {
                if choice.panels.isEmpty {
                    Text("No panels of the Accessibility Keyboard are on this Mac.")
                        .foregroundStyle(.secondary)
                } else {
                    panels
                    if choice.textCount > 0 { text }
                }
            }
            .formStyle(.grouped)

            HStack(spacing: Metrics.UserPanel.actionSpacing) {
                Spacer()
                Button("Cancel", role: .cancel, action: cancel)
                    .keyboardShortcut(.cancelAction)
                Button(importTitle, action: importButtons)
                    .keyboardShortcut(.defaultAction)
                    .disabled(choice.buttonCount == 0)
            }
            .padding(Metrics.UserPanel.sheetPadding)
        }
        .frame(width: Metrics.UserPanel.importWidth)
    }

    private var panels: some View {
        Section {
            ForEach(choice.panels) { panel in
                Toggle(isOn: Binding(get: { choice.isChosen(panel.id) }, set: { _ in choice.toggle(panel.id) })) {
                    VStack(alignment: .leading, spacing: Metrics.UserPanel.rowDetailSpacing) {
                        Text(panel.name)
                        Text(panel.summary)
                            .font(Typography.UserPanel.rowDetail)
                            .foregroundStyle(.secondary)
                    }
                }
                .toggleStyle(.checkbox)
            }
        } header: {
            Text("Panels on This Mac")
        } footer: {
            foot("The standard keys of these panels are not imported. The keyboard already has them.")
        }
    }

    private var text: some View {
        Section {
            Toggle(
                "Import all \(choice.textCount) text \(choice.textCount == 1 ? "button" : "buttons") as private",
                isOn: $choice.textAsPrivate)
        } header: {
            Text("Text")
        } footer: {
            foot(
                "The Accessibility Keyboard keeps this text in a plain file in your Library folder. "
                    + "After the import, remove the text buttons there.")
        }
    }

    private var importTitle: String {
        let count = choice.buttonCount
        return "Import \(count) \(count == 1 ? "Button" : "Buttons")"
    }

    private func foot(_ text: String) -> some View {
        Text(text)
            .font(Typography.UserPanel.foot)
            .foregroundStyle(.secondary)
    }
}
