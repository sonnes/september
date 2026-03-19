import SwiftUI

// MARK: - AppearanceSettingsView
//
// Appearance settings pane matching design: settings-appearance.png
//
// Layout:
//   Title: "Appearance"
//   Subtitle: "Customize the look of September."
//   Divider
//   Theme cards (Light, Dark, System)
//   Keyboard Style cards (Rainbow, Mono)

struct AppearanceSettingsView: View {
    @AppStorage("appTheme") private var appTheme: AppTheme = .system
    @AppStorage("keyboardStyle") private var keyboardStyle: KeyboardStyle = .darkRainbow

    private var isRainbow: Bool {
        keyboardStyle.isRainbow
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    Text("Appearance")
                        .font(.system(size: 24, weight: .bold))
                    Text("Customize the look of September.")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }

                Divider()

                // Theme cards
                VStack(alignment: .leading, spacing: 10) {
                    Text("Theme")
                        .font(.system(size: 13, weight: .medium))

                    HStack(spacing: 12) {
                        themeCard(theme: .light)
                        themeCard(theme: .dark)
                        themeCard(theme: .system)
                    }
                }

                // Keyboard Style cards
                VStack(alignment: .leading, spacing: 10) {
                    Text("Keyboard Style")
                        .font(.system(size: 13, weight: .medium))

                    HStack(spacing: 12) {
                        styleCard(rainbow: true)
                        styleCard(rainbow: false)
                    }
                }

                Spacer()
            }
            .padding(32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    // MARK: - Theme Card

    private func themeCard(theme: AppTheme) -> some View {
        let isSelected = appTheme == theme

        return Button {
            appTheme = theme
            NSApp.appearance = theme.nsAppearance
            keyboardStyle = KeyboardStyle.from(theme: theme, rainbow: isRainbow)
        } label: {
            VStack(spacing: 8) {
                themePreview(theme: theme)
                    .frame(width: 40, height: 40)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                Text(theme.label)
                    .font(.system(size: 13, weight: .medium))
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
        .accessibilityLabel("\(theme.label) theme")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    @ViewBuilder
    private func themePreview(theme: AppTheme) -> some View {
        switch theme {
        case .light:
            RoundedRectangle(cornerRadius: 6)
                .fill(.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .strokeBorder(Color.gray.opacity(0.3), lineWidth: 1)
                )
        case .dark:
            RoundedRectangle(cornerRadius: 6)
                .fill(.black)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .strokeBorder(Color.gray.opacity(0.3), lineWidth: 1)
                )
        case .system:
            HStack(spacing: 0) {
                Color.white
                Color.black
            }
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(Color.gray.opacity(0.3), lineWidth: 1)
            )
        }
    }

    // MARK: - Style Card

    private func styleCard(rainbow: Bool) -> some View {
        let isSelected = isRainbow == rainbow

        return Button {
            keyboardStyle = KeyboardStyle.from(theme: appTheme, rainbow: rainbow)
        } label: {
            VStack(spacing: 8) {
                miniKeyboardPreview(rainbow: rainbow)
                    .frame(height: 32)

                Text(rainbow ? "Rainbow" : "Mono")
                    .font(.system(size: 13, weight: .medium))
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
        .accessibilityLabel("\(rainbow ? "Rainbow" : "Mono") keyboard style")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private func miniKeyboardPreview(rainbow: Bool) -> some View {
        let labels = ["Q", "W", "E", "R"]
        let colors: [Color] =
            rainbow
            ? [.red, .orange, .green, .blue]
            : [Color(nsColor: .secondaryLabelColor),
               Color(nsColor: .secondaryLabelColor),
               Color(nsColor: .secondaryLabelColor),
               Color(nsColor: .secondaryLabelColor)]

        return HStack(spacing: 3) {
            ForEach(Array(zip(labels, colors)), id: \.0) { label, color in
                Text(label)
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundStyle(color)
                    .frame(width: 20, height: 20)
                    .background(
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color(nsColor: .controlBackgroundColor))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 3)
                            .strokeBorder(Color.gray.opacity(0.2), lineWidth: 0.5)
                    )
            }
        }
    }
}
