import SwiftUI

/// The keyboard window: the prediction stack, the input bar with the
/// clipboard buttons at its left and Speak and the mode buttons at its right,
/// and the keys with the word completions on top. History shows the
/// clipboard history in the place of the prediction stack. With no text field
/// in focus, or while Command or Control is on, the shortcuts of the app take
/// the place of the input bar.
///
/// The bar is as wide as the keys and sits over them. The clipboard buttons
/// sit at the left of the bar, past the left edge of the keys, so the window
/// has a clear space at the left of the keys card.
///
/// In Type mode the shortcut panels float in windows of their own. In Talk
/// mode they hide, and Phrases and the Said list show at the left and the
/// right of the keys.
public struct KeyboardScreen: View {
    @EnvironmentObject private var controller: KeyboardController
    @EnvironmentObject private var permission: AccessibilityPermission
    @ObservedObject private var session: KeyboardSession
    @ObservedObject private var inputBar: InputBarVisibility
    private let phrases: PanelDefinition
    private let write: () -> Void
    private let arrange: () -> Void
    private let settings: () -> Void

    public init(
        session: KeyboardSession,
        phrases: PanelDefinition,
        write: @escaping () -> Void,
        arrange: @escaping () -> Void = {},
        settings: @escaping () -> Void
    ) {
        self.session = session
        inputBar = session.inputBar
        self.phrases = phrases
        self.write = write
        self.arrange = arrange
        self.settings = settings
    }

    public var body: some View {
        let inset = Metrics.Screen.keysInset(controller.mode)
        VStack(alignment: .leading, spacing: 0) {
            if !permission.isTrusted {
                PermissionBanner()
                    .padding(.leading, inset)
                    .padding(.bottom, Metrics.TopRow.stackBottom)
            }

            stack
                .shown(inputBar.isVisible || session.isHistoryOpen)
                .padding(.leading, inset)
                .padding(.bottom, Metrics.TopRow.stackBottom)

            HStack(alignment: .barCenter, spacing: Metrics.TopRow.spacing) {
                // Copy works with no text field, for example on a web page,
                // so the buttons always show.
                ClipboardButtons(session: session)
                ZStack(alignment: .leading) {
                    bar.shown(inputBar.isVisible && session.shortcuts.isEmpty)
                        .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: {
                            inputBar.frame = $0
                        }
                    ShortcutBar(shortcuts: session.shortcuts, onPress: session.pressShortcut)
                        .shown(!session.shortcuts.isEmpty)
                }
                SpeakButton(mode: session.speakMode, action: session.speakPressed)
                ModeButtons(
                    mode: controller.mode,
                    setMode: { controller.mode = $0 },
                    write: write,
                    arrange: arrange,
                    settings: settings)
            }
            .padding(.leading, inset - Metrics.Screen.clipboardReach)
            .padding(.bottom, Metrics.TopRow.keysTop)

            Group {
                switch controller.mode {
                case .type: typeKeys
                case .talk: talkKeys
                }
            }
            .padding(.leading, Metrics.Screen.cardInset(controller.mode))
        }
    }

    @ViewBuilder
    private var stack: some View {
        if session.isHistoryOpen {
            ClipboardHistoryView(session: session)
        } else {
            PredictionStack(
                engine: session.predictions, mode: controller.mode == .talk ? .talk : .type,
                onType: session.type)
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
    @ObservedObject private var session: KeyboardSession
    @ObservedObject private var inputBar: InputBarVisibility

    init(session: KeyboardSession) {
        self.session = session
        inputBar = session.inputBar
    }

    var body: some View {
        MainKeyboardView {
            WordCompletionRow(engine: session.predictions, onPick: session.pickWord)
                .shown(inputBar.isVisible)
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

extension View {
    /// Hides the view and keeps its space, so the keys do not move when the
    /// input bar hides or shows.
    func shown(_ isShown: Bool) -> some View {
        opacity(isShown ? 1 : 0)
            .allowsHitTesting(isShown)
            .accessibilityHidden(!isShown)
            .animation(.easeOut(duration: Metrics.activeAnimation), value: isShown)
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
            Text("September Keyboard needs Accessibility access to type into other apps.")
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
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Accessibility access")
    }
}
