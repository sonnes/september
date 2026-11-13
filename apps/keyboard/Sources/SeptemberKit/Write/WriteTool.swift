/// A button of the tools rail at the left of the Write paper.
public enum WriteTool: CaseIterable, Sendable {
    case newDocument
    case documents
    case share
    case close

    /// The text under the button.
    public var title: String {
        switch self {
        case .newDocument: "New"
        case .documents: "Documents"
        case .share: "Share"
        case .close: "Close"
        }
    }

    /// The name that VoiceOver, Voice Control, and Switch Control use.
    public var label: String {
        switch self {
        case .newDocument: "New document"
        case .documents: "Documents"
        case .share: "Share document"
        case .close: "Close paper"
        }
    }

    public var symbol: String {
        switch self {
        case .newDocument: "square.and.pencil"
        case .documents: "rectangle.stack"
        case .share: "square.and.arrow.up"
        case .close: "xmark"
        }
    }
}
