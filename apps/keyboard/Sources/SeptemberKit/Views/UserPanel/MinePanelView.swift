import SwiftUI

/// Mine: the buttons of the user in the grid of `PanelLayout`, most used
/// first, on the pages of `MinePages`. A text button takes a whole row, and
/// a private text button shows a lock and its name only.
///
/// The caller gives the buttons in the order to show, from
/// `UserPanelStore.ranked(by:)`, and ranks them again only when an app comes
/// to the front, so that a button never moves while the user aims at it.
public struct MinePanelView: View {
    private let buttons: [UserButton]
    private let press: (UserButton) -> Void

    @State private var page = 0

    public init(buttons: [UserButton], press: @escaping (UserButton) -> Void) {
        self.buttons = buttons
        self.press = press
    }

    public var body: some View {
        let pages = MinePages.pages(buttons)
        let current = min(page, pages.count - 1)
        let rows = MinePages.rows(for: pages[current], page: current, of: pages.count).map { row in
            switch row {
            case .wide(let cell): KeypadRow.wide(cell)
            case .pair(let left, let right): KeypadRow.cells([left, right])
            }
        }

        KeypadGrid(rows: rows, columns: PanelLayout.columns) { cell, width in
            cellView(cell, width: width, pages: pages.count)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("My Panel")
    }

    @ViewBuilder
    private func cellView(_ cell: MineCell, width: CGFloat, pages: Int) -> some View {
        switch cell {
        case .button(let button):
            MineButtonView(button: button, width: width) { press(button) }
        case .page(let index, let count):
            MinePageButton(page: index, of: count, width: width) {
                page = MinePages.next(after: index, of: count)
            }
        case .empty:
            RoundedRectangle(cornerRadius: Metrics.Keypad.cornerRadius, style: .continuous)
                .strokeBorder(
                    Color(Tokens.strokeSpecial),
                    style: StrokeStyle(lineWidth: 1, dash: Metrics.emptySlotDash)
                )
                .frame(width: width, height: Metrics.Keypad.buttonHeight)
                .accessibilityHidden(true)
        }
    }
}

/// One button of Mine. A key button shows only its keys, and its name shows
/// on hover. A text button shows its name.
struct MineButtonView: View {
    let button: UserButton
    let width: CGFloat
    let press: () -> Void

    @State private var isPressed = false
    @State private var isHovered = false

    var body: some View {
        label
            .frame(width: width, height: Metrics.Keypad.buttonHeight)
            .mineChrome(fill: fill, stroke: stroke)
            .pressable(
                label: button.accessibilityLabel,
                trigger: .down(KeyHold(behavior: { [action = button.action] in action.holdBehavior }))
            ) { isPressed = $0 } action: {
                press()
            }
            .onHover { isHovered = $0 }
            .help(button.name)
    }

    @ViewBuilder
    private var label: some View {
        if let hint = button.action.hint {
            Text(hint)
                .font(Typography.shortcutKeys)
                .foregroundStyle(Color(Tokens.shortcutLabel))
                .lineLimit(1)
                .minimumScaleFactor(Metrics.Keypad.keysMinimumScale)
        } else if case .privateText = button.action {
            HStack(spacing: Metrics.UserPanel.lockSpacing) {
                Image(systemName: "lock.fill")
                    .font(Typography.UserPanel.lock)
                    .foregroundStyle(Color(Tokens.accent))
                name
            }
        } else {
            name
        }
    }

    private var name: some View {
        Text(button.name)
            .font(Typography.UserPanel.text)
            .foregroundStyle(Color(Tokens.keyText))
            .lineLimit(1)
            .truncationMode(.tail)
            .padding(.horizontal, Metrics.Keypad.textPadding)
    }

    private var fill: ThemeColor {
        if isHovered { return Tokens.keyActive }
        let base = button.action.isText ? Tokens.key : Tokens.keySpecial
        return isPressed ? base.pressed : base
    }

    private var stroke: ThemeColor {
        if isHovered { return Tokens.accent }
        return button.action.isText ? Tokens.strokeStandard : Tokens.strokeSpecial
    }
}

/// The last slot of a page: the page on screen, and a press for the next.
struct MinePageButton: View {
    let page: Int
    let count: Int
    let width: CGFloat
    let press: () -> Void

    @State private var isPressed = false

    init(page: Int, of count: Int, width: CGFloat, press: @escaping () -> Void) {
        self.page = page
        self.count = count
        self.width = width
        self.press = press
    }

    var body: some View {
        Text(MinePages.pageLabel(page: page, of: count))
            .font(Typography.shortcutKeys)
            .foregroundStyle(Color(Tokens.accent))
            .frame(width: width, height: Metrics.Keypad.buttonHeight)
            .mineChrome(
                fill: isPressed ? Tokens.keySpecial.pressed : Tokens.keySpecial,
                stroke: Tokens.strokeSpecial)
            .pressable(label: MinePages.pageAccessibilityLabel(page: page, of: count)) {
                isPressed = $0
            } action: {
                press()
            }
    }
}

extension View {
    fileprivate func mineChrome(fill: ThemeColor, stroke: ThemeColor) -> some View {
        background(
            RoundedRectangle(cornerRadius: Metrics.Keypad.cornerRadius, style: .continuous)
                .fill(Color(fill))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.Keypad.cornerRadius, style: .continuous)
                .strokeBorder(Color(stroke), lineWidth: 1)
        )
    }
}
