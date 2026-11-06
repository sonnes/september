import SwiftUI

/// The Said list at the right of the keys in Talk mode: the newest lines of
/// this session. A press on a line speaks it again.
public struct SaidListView: View {
    @ObservedObject private var said: SaidList
    private let isSpeaking: Bool
    private let sayAgain: (SaidLine) -> Void

    /// `isSpeaking` marks the current line with the speech icon and the
    /// accent border.
    public init(said: SaidList, isSpeaking: Bool, sayAgain: @escaping (SaidLine) -> Void) {
        self.said = said
        self.isSpeaking = isSpeaking
        self.sayAgain = sayAgain
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Metrics.Panel.titleSpacing) {
            SectionLabel(text: "SAID")
            if said.lines.isEmpty {
                Text("The lines that you speak show here.")
                    .font(Typography.saidAge)
                    .foregroundStyle(Color(Tokens.labelSecondary))
            } else {
                TimelineView(.everyMinute) { context in
                    VStack(spacing: Metrics.Talk.saidRowSpacing) {
                        ForEach(said.lines.prefix(Metrics.Talk.saidVisibleRows)) { line in
                            SaidRow(
                                line: line,
                                age: line.age(at: context.date),
                                isCurrent: isSpeaking && line.id == said.currentID
                            ) { sayAgain(line) }
                        }
                    }
                }
            }
        }
        .frame(width: Metrics.Talk.saidWidth, alignment: .topLeading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Said")
    }
}

private struct SaidRow: View {
    let line: SaidLine
    let age: String
    let isCurrent: Bool
    let press: () -> Void

    @State private var isPressed = false

    var body: some View {
        let shape = RoundedRectangle(
            cornerRadius: Metrics.Talk.buttonCornerRadius, style: .continuous)
        HStack(spacing: Metrics.Talk.saidRowGap) {
            Image(systemName: isCurrent ? "waveform" : "arrow.counterclockwise")
                .font(Typography.saidIcon)
                .foregroundStyle(Color(Tokens.accent))
            Text(line.text)
                .font(Typography.saidText)
                .foregroundStyle(Color(Tokens.keyText))
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(age)
                .font(Typography.saidAge)
                .foregroundStyle(Color(Tokens.labelSecondary))
                .lineLimit(1)
        }
        .padding(.vertical, Metrics.Talk.saidRowVerticalPadding)
        .padding(.horizontal, Metrics.Talk.saidRowHorizontalPadding)
        .frame(minHeight: Metrics.Talk.saidRowMinHeight)
        .background(shape.fill(Color(fill)))
        .overlay(
            shape.strokeBorder(Color(isCurrent ? Tokens.accent : Tokens.strokeStandard), lineWidth: 1)
        )
        .pressable(label: "Say again: \(line.text)", isSelected: isCurrent) {
            isPressed = $0
        } action: {
            press()
        }
    }

    private var fill: ThemeColor {
        if isPressed { return Tokens.key.pressed }
        return isCurrent ? Tokens.keyActive : Tokens.key
    }
}
