import CoreGraphics

extension Metrics {
    /// The shortcut panels in windows of their own, from frame 1 of the
    /// keyboard predictions mock.
    public enum Detached {
        /// The gap between the keys and a panel, and between two panels.
        public static let gap: CGFloat = 24
        public static let cornerRadius: CGFloat = 14
        /// The padding of a panel card. The top holds the grip.
        public static let topPadding: CGFloat = 18
        public static let sidePadding: CGFloat = 12
        /// The keys card has less padding at the sides.
        public static let keysSidePadding: CGFloat = 8
        public static let grip = CGSize(width: 28, height: 4)
        public static let gripTop: CGFloat = 7
        public static let gripOpacity: Double = 0.35
        /// The gap between the tabs and the grid of the app panel.
        public static let tabsBottom: CGFloat = 8
        public static let tabSpacing: CGFloat = 4
        public static let tabHeight: CGFloat = 26
        public static let tabCornerRadius: CGFloat = 7
        public static let tabIcon: CGFloat = 14
        public static let tabIconSpacing: CGFloat = 5
    }

    /// The input bar row: the bar, Speak, and the mode buttons.
    public enum TopRow {
        public static let spacing: CGFloat = 16
        /// The gap between the prediction stack and the bar.
        public static let stackBottom: CGFloat = 14
        /// The gap between the bar row and the keys.
        public static let keysTop: CGFloat = 16
        public static let modeSpacing: CGFloat = 12
        /// Settings stands a little apart from the modes.
        public static let settingsGap: CGFloat = 8
        public static let modeCircle: CGFloat = 44
        public static let modeLabelSpacing: CGFloat = 5
        public static let modeIcon: CGFloat = 18
        public static let modeBorder: CGFloat = 1
        public static let modeBorderOn: CGFloat = 2
    }
}

extension Metrics.AppPanel {
    /// The height of the grid of six rows in a keypad.
    public static let gridHeight: CGFloat = buttonHeight * CGFloat(rows) + gap * CGFloat(rows - 1)
}

extension Metrics.Detached {
    /// The content of a keypad of six rows, such as Edit: the title, the gap
    /// under it, and the grid.
    public static let keypadHeight: CGFloat =
        Metrics.Panel.titleHeight + Metrics.Panel.titleSpacing + Metrics.AppPanel.gridHeight
    /// The grid under the tabs of the app panel. The tabs are taller than the
    /// title of a keypad, so this grid is shorter than the grid of a keypad.
    /// Then the app panel is as tall as the Edit keypad, as in frame 1 of
    /// the mock. Each app, Mine, and a message take this height, so the
    /// window does not change size.
    public static let tabbedGridHeight: CGFloat = keypadHeight - tabHeight - tabsBottom
    /// A button in the grid under the tabs.
    public static let tabbedButtonHeight: CGFloat =
        (tabbedGridHeight - Metrics.AppPanel.gap * CGFloat(Metrics.AppPanel.rows - 1))
        / CGFloat(Metrics.AppPanel.rows)
}
