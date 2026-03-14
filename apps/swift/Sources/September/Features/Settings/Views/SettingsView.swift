import SwiftData
import SwiftUI

// MARK: - SettingsView
//
// Main settings window with sidebar navigation.
// Matches design: docs/swift/assets/settings-ai-provider.png
//
// Sidebar items:
//   - Appearance
//   - AI Provider
//   - Text to Speech
//   - Transcription

enum SettingsTab: String, CaseIterable {
    case appearance
    case aiProvider
    case textToSpeech
    case transcription

    var label: String {
        switch self {
        case .appearance: "Appearance"
        case .aiProvider: "AI Provider"
        case .textToSpeech: "Text to Speech"
        case .transcription: "Transcription"
        }
    }

    var icon: String {
        switch self {
        case .appearance: "paintbrush"
        case .aiProvider: "brain"
        case .textToSpeech: "speaker.wave.2"
        case .transcription: "mic"
        }
    }
}

struct SettingsView: View {
    @State private var selectedTab: SettingsTab = .aiProvider
    @Query private var accounts: [Account]

    var body: some View {
        NavigationSplitView {
            List(SettingsTab.allCases, id: \.self, selection: $selectedTab) { tab in
                Label(tab.label, systemImage: tab.icon)
            }
            .navigationSplitViewColumnWidth(200)
        } detail: {
            if let account = accounts.first {
                switch selectedTab {
                case .appearance:
                    placeholderPane("Appearance")
                case .aiProvider:
                    AIProviderSettingsView(account: account)
                case .textToSpeech:
                    placeholderPane("Text to Speech")
                case .transcription:
                    placeholderPane("Transcription")
                }
            }
        }
        .frame(minWidth: 700, minHeight: 500)
    }

    private func placeholderPane(_ title: String) -> some View {
        VStack {
            Text(title)
                .font(.title)
                .foregroundStyle(.secondary)
            Text("Coming soon")
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
