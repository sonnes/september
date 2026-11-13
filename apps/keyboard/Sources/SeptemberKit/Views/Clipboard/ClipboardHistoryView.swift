import SwiftUI

/// The clipboard history, in the place of the prediction stack and with its
/// size, so the bar and the keys do not move.
///
/// A page holds `ClipboardHistory.pageSize` copied texts, in rows of
/// `Metrics.Clipboard.columns`. The newest text is at the bottom left, next
/// to the bar, as the best prediction is. A column at the right holds Newer, the page number, and Older.
public struct ClipboardHistoryView: View {
    @ObservedObject private var session: KeyboardSession
    @ObservedObject private var history: ClipboardHistory
    private let now: () -> Date

    public init(session: KeyboardSession, now: @escaping () -> Date = Date.init) {
        self.session = session
        history = session.clipboard
        self.now = now
    }

    public var body: some View {
        Group {
            if !history.isEnabled {
                // One press turns the history on, with no trip to Settings.
                ClipboardNotice(message: "Clipboard history is off.", action: "Turn On") {
                    history.isEnabled = true
                }
            } else if history.items.isEmpty {
                ClipboardNotice(message: "Nothing copied yet. Text that you copy in any app shows here.")
            } else {
                grid
            }
        }
        .frame(width: Metrics.keyboardWidth, height: Metrics.Predictions.stackHeight, alignment: .bottomLeading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Clipboard history")
    }

    private static let rows = ClipboardHistory.pageSize / Metrics.Clipboard.columns

    private var grid: some View {
        let items = history.page(session.historyPage)
        let date = now()
        let columns = Metrics.Clipboard.columns
        return VStack(spacing: Metrics.Clipboard.spacing) {
            // The newest row is last, next to the input bar.
            ForEach((0..<Self.rows).reversed(), id: \.self) { row in
                HStack(spacing: Metrics.Clipboard.spacing) {
                    ForEach(0..<columns, id: \.self) { column in
                        let index = row * columns + column
                        if index < items.count {
                            ClipButton(item: items[index], age: items[index].age(at: date)) {
                                session.pasteClip(items[index])
                            }
                        } else {
                            Color.clear.frame(maxWidth: .infinity, maxHeight: Metrics.Clipboard.clipHeight)
                        }
                    }
                    pager(row: row)
                        .frame(width: Metrics.Clipboard.pagerWidth, height: Metrics.Clipboard.clipHeight)
                }
            }
        }
    }

    @ViewBuilder
    private func pager(row: Int) -> some View {
        let page = session.historyPage
        let count = history.pageCount
        switch row {
        case _ where count == 1:
            Color.clear
        case Self.rows - 1:
            PagerButton(title: "Newer", symbol: "chevron.up", label: "Newer copied texts", isEnabled: page > 0) {
                session.newerPage()
            }
        case 0:
            PagerButton(
                title: "Older", symbol: "chevron.down", label: "Older copied texts", isEnabled: page < count - 1
            ) {
                session.olderPage()
            }
        default:
            Text("\(page + 1) of \(count)")
                .font(Typography.clipPager)
                .monospacedDigit()
                .foregroundStyle(Color(Tokens.labelSecondary))
                .accessibilityLabel("Page \(page + 1) of \(count)")
        }
    }
}

/// A copied text. A press pastes it.
private struct ClipButton: View {
    let item: ClipboardItem
    let age: String
    let paste: () -> Void

    @State private var pressed = false
    @State private var hovered = false

    var body: some View {
        let lit = pressed || hovered
        HStack(spacing: Metrics.Clipboard.clipAgeSpacing) {
            Text(item.preview)
                .font(Typography.clipText)
                .foregroundStyle(Color(Tokens.keyText))
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(age)
                .font(Typography.clipAge)
                .foregroundStyle(Color(Tokens.labelSecondary))
                .fixedSize()
        }
        .padding(.horizontal, Metrics.Clipboard.clipHorizontalPadding)
        .frame(maxWidth: .infinity, minHeight: Metrics.Clipboard.clipHeight, maxHeight: Metrics.Clipboard.clipHeight)
        .background(
            RoundedRectangle(cornerRadius: Metrics.Clipboard.clipCornerRadius, style: .continuous)
                .fill(Color(lit ? Tokens.keyActive : Tokens.key))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.Clipboard.clipCornerRadius, style: .continuous)
                .strokeBorder(
                    Color(lit ? Tokens.accent : Tokens.strokeStandard), lineWidth: Metrics.Predictions.strokeWidth)
        )
        .shadow(color: Color(Tokens.keyShadow), radius: 1, y: 1)
        .onHover { hovered = $0 }
        .pressable(label: "Paste \(item.preview), copied \(age)", onPressing: { pressed = $0 }, action: paste)
    }
}

private struct PagerButton: View {
    let title: String
    let symbol: String
    let label: String
    let isEnabled: Bool
    let action: () -> Void

    @State private var pressed = false

    var body: some View {
        HStack(spacing: Metrics.Clipboard.pagerSpacing) {
            Image(systemName: symbol).font(Typography.clipPagerIcon)
            Text(title).font(Typography.clipPager)
        }
        .foregroundStyle(Color(Tokens.labelSecondary))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            RoundedRectangle(cornerRadius: Metrics.Clipboard.clipCornerRadius, style: .continuous)
                .fill(Color(pressed ? Tokens.keyActive : Tokens.keySpecial))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.Clipboard.clipCornerRadius, style: .continuous)
                .strokeBorder(Color(Tokens.strokeSpecial), lineWidth: Metrics.Predictions.strokeWidth)
        )
        .opacity(isEnabled ? 1 : Metrics.Clipboard.disabledOpacity)
        .pressable(label: label, onPressing: { pressed = $0 }) {
            if isEnabled { action() }
        }
        .disabled(!isEnabled)
    }
}

/// The message in place of the history when it is empty or off. It has the
/// calm look of the prediction notices.
private struct ClipboardNotice: View {
    let message: String
    var action: String?
    var perform: () -> Void = {}

    var body: some View {
        HStack(spacing: Metrics.Predictions.noticeSpacing) {
            Text(message)
                .font(Typography.predictionNotice)
                .foregroundStyle(Color(Tokens.labelSecondary))
            Spacer(minLength: 0)
            if let action {
                Text(action)
                    .font(Typography.predictionNoticeAction)
                    .foregroundStyle(Color(Tokens.accent))
                    .pressable(label: action, onPressing: { _ in }, action: perform)
            }
        }
        .padding(.horizontal, Metrics.Predictions.noticeHorizontalPadding)
        .frame(maxWidth: .infinity, minHeight: Metrics.Predictions.noticeHeight)
        .background(
            RoundedRectangle(cornerRadius: Metrics.Predictions.noticeCornerRadius, style: .continuous)
                .fill(Color(Tokens.noticeCalmSurface))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.Predictions.noticeCornerRadius, style: .continuous)
                .strokeBorder(Color(Tokens.panelStroke), lineWidth: Metrics.Predictions.strokeWidth)
        )
        .accessibilityElement(children: .contain)
    }
}
