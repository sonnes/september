import AppKit
import SwiftUI

extension Typography {
    public static let predictionTile = Font.system(size: 17)
    public static let predictionLeadIn = Font.system(size: 15)
    public static let predictionNotice = Font.system(size: 14)
    public static let predictionNoticeAction = Font.system(size: 14, weight: .medium)
    public static let predictionNoticeIcon = Font.system(size: 18)
    public static let wordCompletion = Font.system(size: Metrics.Predictions.wordFontSize)
    public static let wordCompletionBest = Font.system(size: Metrics.Predictions.wordFontSize, weight: .semibold)

    /// The width of `word` in the font of the word row.
    public static func wordWidth(_ word: String, isBest: Bool) -> CGFloat {
        let font = NSFont.systemFont(ofSize: Metrics.Predictions.wordFontSize, weight: isBest ? .semibold : .regular)
        return NSAttributedString(string: word, attributes: [.font: font]).size().width
    }
}
