/// One filled slot of the Mine grid. An empty slot is `nil`.
public enum MineCell: Sendable, Hashable {
    case button(UserButton)
    /// The page button: the page on screen and the number of pages.
    case page(Int, of: Int)
}

/// How Mine puts the buttons on pages. A page is the grid of `PanelLayout`.
/// When the buttons fill more than one page, each page holds one slot less
/// of buttons and a page button.
public enum MinePages {
    /// The buttons of each page, in the order given.
    public static func pages(_ buttons: [UserButton]) -> [[UserButton]] {
        let total = PanelLayout.slots(buttons.map(\.action))
        if total <= PanelLayout.slotCount { return [buttons] }

        var pages: [[UserButton]] = []
        var current: [UserButton] = []
        var used = 0
        for button in buttons {
            let span = PanelLayout.span(of: button.action)
            if used + span > PanelLayout.slotCount - 1 {
                pages.append(current)
                current = []
                used = 0
            }
            current.append(button)
            used += span
        }
        if !current.isEmpty { pages.append(current) }
        return pages
    }

    /// The rows of one page, placed by `PanelLayout`. The page button comes
    /// last when there is more than one page. Empty slots fill the grid.
    public static func rows(for buttons: [UserButton], page: Int, of count: Int) -> [KeypadRow<MineCell?>] {
        let cells = buttons.map(MineCell.button) + (count > 1 ? [.page(page, of: count)] : [])
        return PanelLayout.grid(cells) { cell in
            if case .button(let button) = cell { return button.action }
            return nil
        }
    }

    public static func pageLabel(page: Int, of count: Int) -> String {
        "\(page + 1)/\(count) ›"
    }

    public static func pageAccessibilityLabel(page: Int, of count: Int) -> String {
        "Next page. Page \(page + 1) of \(count)"
    }

    /// The page after this one. The last page goes back to the first.
    public static func next(after page: Int, of count: Int) -> Int {
        count > 0 ? (page + 1) % count : 0
    }
}
