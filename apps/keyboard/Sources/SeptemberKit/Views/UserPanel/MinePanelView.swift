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
        let rows = MinePages.rows(for: pages[current], page: current, of: pages.count)

        KeypadGrid(rows: rows, columns: PanelLayout.columns) { cell, width in
            cellView(cell, width: width)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("My Panel")
    }

    @ViewBuilder
    private func cellView(_ cell: MineCell?, width: CGFloat) -> some View {
        switch cell {
        case .button(let button):
            ShortcutButtonView(
                button: PanelButton(id: button.id, label: button.name, symbol: nil, action: button.action),
                width: width
            ) { press(button) }
        case .page(let index, let count):
            MinePageButton(page: index, of: count, width: width) {
                page = MinePages.next(after: index, of: count)
            }
        case nil:
            EmptySlotView(width: width)
        }
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
        let shape = RoundedRectangle(cornerRadius: Metrics.Keypad.cornerRadius, style: .continuous)
        Text(MinePages.pageLabel(page: page, of: count))
            .font(Typography.shortcutKeys)
            .foregroundStyle(Color(Tokens.accent))
            .frame(width: width, height: Metrics.Keypad.buttonHeight)
            .background(shape.fill(Color(isPressed ? Tokens.keySpecial.pressed : Tokens.keySpecial)))
            .overlay(shape.strokeBorder(Color(Tokens.strokeSpecial), lineWidth: 1))
            .pressable(label: MinePages.pageAccessibilityLabel(page: page, of: count)) {
                isPressed = $0
            } action: {
                press()
            }
    }
}
