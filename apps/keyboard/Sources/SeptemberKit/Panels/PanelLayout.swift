/// A row of a grid: one cell across the grid, or cells one column wide each.
public enum KeypadRow<Cell> {
    case wide(Cell)
    case cells([Cell])

    /// The cells in rows of `columns` cells.
    public static func rows(_ cells: [Cell], columns: Int) -> [KeypadRow] {
        let columns = max(columns, 1)
        return stride(from: 0, to: cells.count, by: columns).map {
            .cells(Array(cells[$0..<min($0 + columns, cells.count)]))
        }
    }
}

/// The grid of a Write panel and of Mine: `columns` columns and `rowCount`
/// rows. A key button takes one slot, and a text button takes a whole row.
public enum PanelLayout {
    public static let columns = 2
    public static let rowCount = 6
    public static let slotCount = columns * rowCount

    public static func span(of action: PanelAction) -> Int {
        action.isText ? columns : 1
    }

    /// The slots that the buttons fill.
    public static func slots(_ buttons: [PanelButton]) -> Int {
        buttons.reduce(0) { $0 + span(of: $1.action) }
    }

    /// The buttons that fit in the grid, in order. A button that does not fit
    /// is skipped, so a smaller button after it can still fit.
    public static func fitting(_ buttons: [PanelButton]) -> [PanelButton] {
        var used = 0
        return buttons.filter { button in
            guard used + span(of: button.action) <= slotCount else { return false }
            used += span(of: button.action)
            return true
        }
    }

    /// The rows of the items. A wide item takes a row of its own. A single
    /// item fills the gap that an earlier single item left.
    private static func rows<Item>(_ items: [Item], isWide: (Item) -> Bool) -> [[Item]] {
        var rows: [[Item]] = []
        var open: Int?
        for item in items {
            if isWide(item) {
                rows.append([item])
            } else if let index = open {
                rows[index].append(item)
                open = nil
            } else {
                rows.append([item])
                open = rows.count - 1
            }
        }
        return rows
    }

    /// The full grid of the items: the rows of `rows(_:isWide:)`, then empty
    /// rows up to `rowCount`. A `nil` cell is an empty slot, so the grid
    /// keeps its height when it holds few items.
    public static func grid<Item>(_ items: [Item], isWide: (Item) -> Bool) -> [KeypadRow<Item?>] {
        let filled: [KeypadRow<Item?>] = rows(items, isWide: isWide).map { row in
            if row.count == 1, isWide(row[0]) { return .wide(row[0]) }
            return .cells(row.map(Optional.some) + Array(repeating: nil, count: columns - row.count))
        }
        let empty = KeypadRow<Item?>.cells(Array(repeating: nil, count: columns))
        return filled + Array(repeating: empty, count: max(rowCount - filled.count, 0))
    }
}
