import Foundation

/// The app, the window, and the text near the focused field, for the
/// sentence predictions of Type mode.
///
/// The text is private. Its descriptions show only the count of lines, so a
/// log or a test failure never prints it.
public struct ScreenContext: Equatable, Sendable {
    /// The app that the text comes from. It is not sent to the model.
    public var bundleID: String?
    public var appName: String?
    /// The name of the chat or the title of the window.
    public var title: String?
    /// The label or the placeholder of the focused field.
    public var field: String?
    /// The text near the field, oldest first.
    public var lines: [String]

    public init(
        bundleID: String? = nil, appName: String?, title: String?, field: String?, lines: [String]
    ) {
        self.bundleID = bundleID
        self.appName = appName
        self.title = title
        self.field = field
        self.lines = lines
    }
}

extension ScreenContext: CustomStringConvertible, CustomDebugStringConvertible {
    public var description: String { "ScreenContext(\(lines.count) lines)" }
    public var debugDescription: String { description }
}

/// A text attribute of an accessibility element.
public enum ContextAttribute: String, Codable, Sendable, Hashable {
    case value
    case description
    case title
    case placeholder
}

/// An element of the accessibility tree of another app, as the context step
/// reads it. The app reads the real tree, and the tests use a made-up one.
public protocol ContextNode {
    var role: String? { get }
    var subrole: String? { get }
    /// The `AXIdentifier` that the developer of the app gave the element.
    var identifier: String? { get }
    var children: [Self] { get }
    func text(_ attribute: ContextAttribute) -> String?
    func isSame(as other: Self) -> Bool
}
