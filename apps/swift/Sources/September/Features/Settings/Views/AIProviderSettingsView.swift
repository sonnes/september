import SwiftUI

// MARK: - AIProviderSettingsView
//
// AI Provider settings pane matching design: settings-ai-provider.png
//
// Layout:
//   Title: "AI Provider"
//   Subtitle: "Configure the language model used for AI features."
//   Divider
//   Provider cards (3, with icons)
//   Model dropdown
//   API Key field (masked)
//   Temperature slider

struct AIProviderSettingsView: View {
    @Bindable var account: Account
    @State private var apiKeyInput = ""
    @State private var ollamaModels: [String] = []

    private var config: SuggestionsConfig {
        account.aiSuggestions
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    Text("AI Provider")
                        .font(.system(size: 24, weight: .bold))
                    Text("Configure the language model used for AI features.")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }

                Divider()

                // Provider cards
                VStack(alignment: .leading, spacing: 10) {
                    Text("Provider")
                        .font(.system(size: 13, weight: .medium))

                    HStack(spacing: 12) {
                        providerCard(
                            provider: .openai,
                            icon: "sparkles",
                            name: "OpenAI",
                            subtitle: "GPT-4o, GPT-4"
                        )
                        providerCard(
                            provider: .anthropic,
                            icon: "server.rack",
                            name: "Anthropic",
                            subtitle: "Claude 4, Sonnet"
                        )
                        providerCard(
                            provider: .ollama,
                            icon: "cloud",
                            name: "Ollama",
                            subtitle: "Local models"
                        )
                    }
                }

                // Model picker
                VStack(alignment: .leading, spacing: 6) {
                    Text("Model")
                        .font(.system(size: 13, weight: .medium))

                    Picker("Model", selection: $account.aiSuggestions.model) {
                        Text(defaultModelName).tag(String?.none)
                        ForEach(availableModels, id: \.id) { model in
                            Text(model.name).tag(Optional(model.id))
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .strokeBorder(Color(nsColor: .separatorColor), lineWidth: 1)
                    )
                }

                // API Key (only for providers that need it)
                if AIProviderRegistry.providerInfo(config.provider)?.requiresAPIKey == true {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("API Key")
                            .font(.system(size: 13, weight: .medium))

                        SecureField(
                            account.maskedAPIKey(for: config.provider) ?? "Enter API key",
                            text: $apiKeyInput
                        )
                        .textFieldStyle(.roundedBorder)
                        .font(.system(size: 13, design: .monospaced))
                        .onSubmit { saveAPIKey() }
                        .onChange(of: apiKeyInput) { _, _ in saveAPIKey() }
                    }
                }

                // Temperature
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Temperature")
                            .font(.system(size: 13, weight: .medium))
                        Spacer()
                        Text(String(format: "%.1f", config.temperature))
                            .font(.system(size: 13, design: .monospaced))
                            .foregroundStyle(.secondary)
                    }

                    Slider(
                        value: $account.aiSuggestions.temperature,
                        in: 0.0...1.0,
                        step: 0.1
                    )
                    .tint(.blue)
                }

                Spacer()
            }
            .padding(32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .onAppear {
            apiKeyInput = account.apiKey(for: config.provider) ?? ""
            if config.provider == .ollama { loadOllamaModels() }
        }
        .onChange(of: config.provider) { _, newProvider in
            apiKeyInput = account.apiKey(for: newProvider) ?? ""
            if newProvider == .ollama { loadOllamaModels() }
        }
    }

    // MARK: - Provider Card

    private func providerCard(
        provider: AIProvider, icon: String, name: String, subtitle: String
    ) -> some View {
        let isSelected = config.provider == provider

        return Button {
            account.aiSuggestions.provider = provider
            account.aiSuggestions.model = nil
        } label: {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundStyle(isSelected ? .blue : .secondary)
                Text(name)
                    .font(.system(size: 13, weight: .medium))
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(
                        isSelected ? Color.blue : Color(nsColor: .separatorColor),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(name) provider")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: - Helpers

    private var defaultModelName: String {
        switch config.provider {
        case .openai: "GPT-4o"
        case .anthropic: "Claude Sonnet 4"
        case .ollama: "Default"
        case .foundationModels: "Default"
        }
    }

    private var availableModels: [AIModelInfo] {
        if config.provider == .ollama {
            return ollamaModels.map { AIModelInfo(id: $0, name: $0, description: "") }
        }
        return AIProviderRegistry.modelsForProvider(config.provider)
    }

    private func saveAPIKey() {
        guard !apiKeyInput.isEmpty else { return }
        account.setAPIKey(apiKeyInput, for: config.provider)
    }

    private func loadOllamaModels() {
        Task {
            let service = OllamaService()
            ollamaModels = (try? await service.listModels()) ?? []
        }
    }
}
