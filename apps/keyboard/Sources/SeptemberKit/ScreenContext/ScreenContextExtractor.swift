import Foundation

/// Reads the text near the focused field from the accessibility tree.
///
/// With a `ContextRule`, it reads the messages of the conversation container
/// of the app, and the title of the chat. With no rule, it reads the static
/// text that comes before the field in reading order, nearest first. The
/// general rule skips navigation landmarks, such as a sidebar, and the text
/// of other fields.
///
/// Both rules keep the newest text that fits `characterBudget`, and they
/// stop at `elementLimit` elements or when `isExpired` is true.
public enum ScreenContextExtractor {
    /// The most characters of text near the field.
    public static let characterBudget = 1500
    /// The most characters of one line.
    public static let lineLimit = 300
    /// The most elements that one read visits.
    public static let elementLimit = 2000

    /// - Parameter path: the focused field first, then each element above it,
    ///   up to the window.
    public static func extract<Node: ContextNode>(
        path: [Node], rule: ContextRule?, appName: String?, bundleID: String? = nil,
        isExpired: @escaping () -> Bool = { false }
    ) -> ScreenContext {
        var walk = Walk<Node>(isExpired: isExpired)
        guard let field = path.first, let window = path.last else {
            return ScreenContext(bundleID: bundleID, appName: appName, title: nil, field: nil, lines: [])
        }
        let label = [ContextAttribute.description, .placeholder, .title].lazy
            .compactMap { field.text($0).map(clean) }
            .first { !$0.isEmpty }

        let title: String?
        let lines: [String]
        if let rule {
            title = rule.title.flatMap { walk.first($0.match, in: window)?.text($0.attribute) }.map(clean)
            lines = walk.first(rule.conversation, in: window).map { walk.messages(rule.message, in: $0) } ?? []
        } else {
            title = window.text(.title).map(clean)
            lines = walk.textBefore(path)
        }
        return ScreenContext(
            bundleID: bundleID, appName: appName, title: title?.isEmpty == false ? title : nil,
            field: label, lines: lines)
    }

    /// The text on one line, with no marks of text direction, and cut at
    /// `lineLimit`.
    public static func clean(_ text: String) -> String {
        let marks: Set<Unicode.Scalar> = [
            "\u{200E}", "\u{200F}", "\u{202A}", "\u{202B}", "\u{202C}", "\u{202D}", "\u{202E}",
            "\u{2066}", "\u{2067}", "\u{2068}", "\u{2069}",
        ]
        let scalars = text.unicodeScalars.filter { !marks.contains($0) }
        let flat = String(String.UnicodeScalarView(scalars))
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
        guard flat.count > lineLimit else { return flat }
        return flat.prefix(lineLimit) + "…"
    }

    /// The roles whose text the general rule does not read: other fields,
    /// which can hold drafts, and the menus.
    static let skippedRoles: Set<String> = [
        "AXTextField", "AXTextArea", "AXComboBox", "AXSearchField", "AXMenuBar", "AXMenu",
    ]
    static let skippedSubroles: Set<String> = ["AXLandmarkNavigation", "AXSecureTextField"]

    private struct Walk<Node: ContextNode> {
        let isExpired: () -> Bool
        var visited = 0

        /// False when the read must stop.
        mutating func step() -> Bool {
            visited += 1
            return visited <= ScreenContextExtractor.elementLimit && !isExpired()
        }

        /// The first element that matches, in reading order.
        mutating func first(_ match: ElementMatch, in node: Node) -> Node? {
            guard step() else { return nil }
            if match.matches(node) { return node }
            for child in node.children {
                if let found = first(match, in: child) { return found }
            }
            return nil
        }

        /// The text of each message in `container`, oldest first, that fits
        /// the budget.
        mutating func messages(_ message: TextMatch, in container: Node) -> [String] {
            var found: [String] = []
            collect(message, in: container, into: &found)
            var lines: [String] = []
            var used = 0
            for line in found.reversed() {
                guard used + line.count <= ScreenContextExtractor.characterBudget else { break }
                lines.append(line)
                used += line.count
            }
            return lines.reversed()
        }

        private mutating func collect(_ message: TextMatch, in node: Node, into found: inout [String]) {
            guard step() else { return }
            if message.match.matches(node) {
                if let text = node.text(message.attribute).map(ScreenContextExtractor.clean), !text.isEmpty {
                    found.append(text)
                }
                return
            }
            for child in node.children { collect(message, in: child, into: &found) }
        }

        /// The static text before the field in reading order, oldest first,
        /// that fits the budget.
        mutating func textBefore(_ path: [Node]) -> [String] {
            var lines: [String] = []
            var used = 0
            ancestors: for index in path.indices.dropFirst() {
                let children = path[index].children
                guard let position = children.firstIndex(where: { $0.isSame(as: path[index - 1]) }) else {
                    continue
                }
                for sibling in children[..<position].reversed() {
                    guard backward(sibling, lines: &lines, used: &used) else { break ancestors }
                }
            }
            return lines.reversed()
        }

        /// Reads `node` from its end to its start. False when the read must
        /// stop.
        private mutating func backward(_ node: Node, lines: inout [String], used: inout Int) -> Bool {
            guard step() else { return false }
            if let role = node.role, ScreenContextExtractor.skippedRoles.contains(role) { return true }
            if let subrole = node.subrole, ScreenContextExtractor.skippedSubroles.contains(subrole) { return true }
            for child in node.children.reversed() {
                guard backward(child, lines: &lines, used: &used) else { return false }
            }
            guard node.role == "AXStaticText",
                let text = node.text(.value).map(ScreenContextExtractor.clean), !text.isEmpty,
                lines.last != text
            else { return true }
            guard used + text.count <= ScreenContextExtractor.characterBudget else { return false }
            lines.append(text)
            used += text.count
            return true
        }
    }
}
