import Foundation

extension Tokens {
    /// The surface of a calm notice in the prediction stack: the panel
    /// colour, as in the mock.
    public static let noticeCalmSurface = panelBackground.opacity(0.88)

    /// A row of the history column: the green of `positive`, from the
    /// one-app mock.
    public static let historyRowFill = positive.opacity(0.10)
    public static let historyRowStroke = positive.opacity(0.45)
    public static let historyRowIcon = positive
    /// A row of the model column: the indigo of `rowBottom`.
    public static let modelRowFill = rowBottom.opacity(0.08)
    public static let modelRowStroke = rowBottom.opacity(0.40)
    public static let modelRowIcon = rowBottom
}
