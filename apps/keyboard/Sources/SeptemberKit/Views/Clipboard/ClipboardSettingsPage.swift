import SwiftUI

/// The Clipboard page: the clipboard history switch and Clear Clipboard
/// History.
public struct ClipboardSettingsPage: View {
    @ObservedObject private var history: ClipboardHistory
    @State private var confirmsClear = false

    public init(history: ClipboardHistory) {
        self.history = history
    }

    public var body: some View {
        Form {
            Section {
                Toggle("Keep a history of copied text", isOn: $history.isEnabled)
                HStack {
                    Text(count)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button("Clear Clipboard History…") { confirmsClear = true }
                        .disabled(history.items.isEmpty)
                }
                .confirmationDialog("Clear the clipboard history?", isPresented: $confirmsClear) {
                    Button("Clear Clipboard History", role: .destructive, action: history.clear)
                } message: {
                    Text("The history loses every copied text. You cannot undo this.")
                }
            } footer: {
                Text(
                    "History, at the left of the input bar, shows the text that you copied in the last 7 days, up to 200 texts. The history stays on this Mac. It does not keep a copy from a password manager or a password field. When you turn the history off, it removes every copied text."
                )
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .formStyle(.grouped)
    }

    private var count: String {
        switch history.items.count {
        case 0: "No copied text"
        case 1: "1 copied text"
        case let count: "\(count) copied texts"
        }
    }
}
