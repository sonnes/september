/// One slot of the Mine grid.
public enum MineCell: Sendable, Hashable {
    case button(UserButton)
    /// The page button: the page on screen and the number of pages.
    case page(Int, of: Int)
    case empty
}

/// One row of the Mine grid: a text button across both columns, or two cells.
public enum MineRow: Sendable, Hashable {
    case wide(MineCell)
    case pair(MineCell, MineCell)
}

/// How Mine puts the buttons on pages. A page is the grid of `PanelLayout`.
/// When the buttons fill more than one page, each page holds one slot less
/// of buttons and a page button.
public enum MinePages {
    /// The buttons of each page, in the order given.
    public static func pages(_ buttons: [UserButton]) -> [[UserButton]] {
        let total = buttons.reduce(0) { $0 + PanelLayout.span(of: $1.action) }
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
    public static func rows(for buttons: [UserButton], page: Int, of count: Int) -> [MineRow] {
        func isWide(_ cell: MineCell) -> Bool {
            if case .button(let button) = cell { return button.action.isText }
            return false
        }
        let cells = buttons.map(MineCell.button) + (count > 1 ? [.page(page, of: count)] : [])
        var rows = PanelLayout.rows(cells, isWide: isWide)
        rows += Array(repeating: [], count: max(Metrics.Keypad.rows - rows.count, 0))

        return rows.map { cells in
            if cells.count == 1, isWide(cells[0]) { return .wide(cells[0]) }
            return .pair(cells.first ?? .empty, cells.count > 1 ? cells[1] : .empty)
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
