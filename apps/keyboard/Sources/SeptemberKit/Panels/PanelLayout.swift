/// The grid of a Write panel: two columns, and the rows of a keypad. A key
/// button takes one slot, and a text button takes a whole row.
public enum PanelLayout {
    public static let columns = 2
    public static let slotCount = columns * Metrics.Keypad.rows

    public static func span(of button: PanelButton) -> Int {
        button.isText ? columns : 1
    }

    /// The slots that the buttons fill.
    public static func slots(_ buttons: [PanelButton]) -> Int {
        buttons.reduce(0) { $0 + span(of: $1) }
    }

    /// The buttons that fit in the grid, in order. A button that does not fit
    /// is skipped, so a smaller button after it can still fit.
    public static func fitting(_ buttons: [PanelButton]) -> [PanelButton] {
        var used = 0
        return buttons.filter { button in
            guard used + span(of: button) <= slotCount else { return false }
            used += span(of: button)
            return true
        }
    }

    /// The rows of the grid. A text button takes a row of its own. A key
    /// button after it fills the gap that an earlier key button left.
    public static func rows(_ buttons: [PanelButton]) -> [[PanelButton]] {
        var rows: [[PanelButton]] = []
        var open: Int?
        for button in buttons {
            if button.isText {
                rows.append([button])
            } else if let index = open {
                rows[index].append(button)
                open = nil
            } else {
                rows.append([button])
                open = rows.count - 1
            }
        }
        return rows
    }
}
