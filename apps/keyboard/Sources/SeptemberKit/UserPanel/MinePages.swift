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

/// How Mine puts the buttons on pages. A page is a grid of two columns and
/// six rows. A text button takes two columns. When the buttons fill more than
/// one page, each page holds 11 slots of buttons and a page button.
public enum MinePages {
    public static let columns = 2
    public static let slots = 12

    /// The buttons of each page, in the order given.
    public static func pages(_ buttons: [UserButton]) -> [[UserButton]] {
        let total = buttons.reduce(0) { $0 + width(of: $1) }
        if total <= slots { return [buttons] }

        var pages: [[UserButton]] = []
        var current: [UserButton] = []
        var used = 0
        for button in buttons {
            if used + width(of: button) > slots - 1 {
                pages.append(current)
                current = []
                used = 0
            }
            current.append(button)
            used += width(of: button)
        }
        if !current.isEmpty { pages.append(current) }
        return pages
    }

    /// The rows of one page. A single button fills the first free slot, so
    /// that a text button leaves no gap. The page button comes last when
    /// there is more than one page. Empty slots fill the grid.
    public static func rows(for buttons: [UserButton], page: Int, of count: Int) -> [MineRow] {
        var rows: [[MineCell]] = []
        var openRow: Int?

        func place(_ cell: MineCell, wide: Bool) {
            if wide {
                rows.append([cell])
            } else if let index = openRow {
                rows[index].append(cell)
                openRow = nil
            } else {
                rows.append([cell])
                openRow = rows.count - 1
            }
        }

        for button in buttons { place(.button(button), wide: button.isWide) }
        if count > 1 { place(.page(page, of: count), wide: false) }
        while rows.count < slots / columns { rows.append([]) }

        return rows.enumerated().map { index, cells in
            if cells.count == 1, index != openRow { return .wide(cells[0]) }
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

    private static func width(of button: UserButton) -> Int { button.isWide ? 2 : 1 }
}
