import SwiftUI

/// The keyboard window: the prediction stack, the input bar with Speak and
/// the mode buttons, and the keys with the word completions on top.
///
/// In Type mode the shortcut panels float in windows of their own. In Talk
/// mode they hide, and Phrases and the Said list show at the left and the
/// right of the keys.
public struct KeyboardScreen: View {
    @EnvironmentObject private var controller: KeyboardController
    @EnvironmentObject private var permission: AccessibilityPermission
    @ObservedObject private var session: KeyboardSession
    private let phrases: PanelDefinition
    private let write: () -> Void
    private let settings: () -> Void

    public init(
        session: KeyboardSession,
        phrases: PanelDefinition,
        write: @escaping () -> Void,
        settings: @escaping () -> Void
    ) {
        self.session = session
        self.phrases = phrases
        self.write = write
        self.settings = settings
    }

    /// The distance from the left edge of the window to the keys and the
    /// bar. The app keeps the keys in place when the mode changes.
    public static func keysInset(_ mode: KeyboardMode) -> CGFloat {
        switch mode {
        case .type: Metrics.Detached.keysSidePadding
        case .talk: Metrics.surfacePadding + Metrics.Talk.phrasesWidth + Metrics.sectionSpacing
        }
    }

    public var body: some View {
        let inset = Self.keysInset(controller.mode)
        VStack(alignment: .leading, spacing: 0) {
            if !permission.isTrusted {
                PermissionBanner()
                    .padding(.leading, inset)
                    .padding(.bottom, Metrics.TopRow.stackBottom)
            }

            PredictionStack(engine: session.predictions, onType: session.type)
                .padding(.leading, inset)
                .padding(.bottom, Metrics.TopRow.stackBottom)

            HStack(spacing: Metrics.TopRow.spacing) {
                bar
                SpeakButton(mode: session.speakMode, action: session.speakPressed)
                ModeButtons(
                    mode: controller.mode,
                    setMode: { controller.mode = $0 },
                    write: write,
                    settings: settings)
            }
            .padding(.leading, inset)
            .padding(.bottom, Metrics.TopRow.keysTop)

            switch controller.mode {
            case .type: typeKeys
            case .talk: talkKeys
            }
        }
    }

    @ViewBuilder
    private var bar: some View {
        switch controller.mode {
        case .type: InputBar(spokenWord: session.spokenWord)
        case .talk: TalkBar(talk: controller.talk, speakingWord: session.spokenWord)
        }
    }

    private var typeKeys: some View {
        TypeKeysCard(session: session)
    }

    private var talkKeys: some View {
        HStack(alignment: .top, spacing: Metrics.sectionSpacing) {
            PhrasesPanelView(panel: phrases) { controller.perform($0) }
            KeysWithWords(session: session)
            SaidListView(said: controller.talk.said, isSpeaking: session.speakMode == .stop) {
                controller.talk.sayAgain($0)
            }
        }
        .padding(Metrics.surfacePadding)
        .background(Color(Tokens.background))
        .clipShape(RoundedRectangle(cornerRadius: Metrics.surfaceCornerRadius, style: .continuous))
        .overlay(alignment: .top) { Grip(height: Metrics.surfacePadding) }
    }
}

/// The keys with the word completions on top. The accents of a held letter
/// show over the top of the keys, so the keys do not move.
struct KeysWithWords: View {
    @EnvironmentObject private var controller: KeyboardController
    @ObservedObject var session: KeyboardSession

    var body: some View {
        MainKeyboardView {
            WordCompletionRow(engine: session.predictions, onType: session.type)
                .accessibilityHidden(!controller.accentChoices.isEmpty)
        }
        .overlay(alignment: .top) {
            if !controller.accentChoices.isEmpty {
                AccentRow(choices: controller.accentChoices, choose: controller.chooseAccent)
                    .padding(Metrics.Keyboard.padding)
            }
        }
    }
}

/// The keys of Type mode in their card, at the bottom left of the keyboard
/// window. The shortcut panels sit beside this card.
public struct TypeKeysCard: View {
    @ObservedObject private var session: KeyboardSession

    public init(session: KeyboardSession) {
        self.session = session
    }

    public var body: some View {
        PanelCard(sidePadding: Metrics.Detached.keysSidePadding) {
            KeysWithWords(session: session)
        }
    }
}

/// Shown until macOS trusts the app to send keystrokes. Without that trust,
/// macOS drops every key press without an error.
struct PermissionBanner: View {
    @EnvironmentObject private var permission: AccessibilityPermission

    var body: some View {
        HStack(spacing: Metrics.Banner.spacing) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color(Tokens.warning))
            Text("Keyboard needs Accessibility access to type into other apps.")
                .font(Typography.bannerText)
                .foregroundStyle(Color(Tokens.keyText))
            Button("Open Settings") {
                permission.openSettings()
            }
            .buttonStyle(.plain)
            .font(Typography.bannerAction)
            .foregroundStyle(Color(Tokens.accent))
        }
        .padding(.horizontal, Metrics.Banner.horizontalPadding)
        .frame(height: Metrics.Banner.height)
        .background(
            RoundedRectangle(cornerRadius: Metrics.Banner.cornerRadius, style: .continuous)
                .fill(Color(Tokens.warningSurface))
        )
        .accessibilityElement(children: .combine)
    }
}
