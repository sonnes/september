import Foundation

/// Matches an element by its identifier, its role, and its subrole. Each
/// part that is set must be equal. At least one part must be set.
public struct ElementMatch: Equatable, Sendable, Decodable {
    public let identifier: String?
    public let role: String?
    public let subrole: String?

    public init(identifier: String? = nil, role: String? = nil, subrole: String? = nil) {
        self.identifier = identifier
        self.role = role
        self.subrole = subrole
    }

    private enum CodingKeys: String, CodingKey { case identifier, role, subrole }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        identifier = try container.decodeIfPresent(String.self, forKey: .identifier)
        role = try container.decodeIfPresent(String.self, forKey: .role)
        subrole = try container.decodeIfPresent(String.self, forKey: .subrole)
        guard identifier != nil || role != nil || subrole != nil else {
            throw DecodingError.dataCorrupted(
                .init(codingPath: decoder.codingPath, debugDescription: "A match needs an identifier, a role, or a subrole"))
        }
    }

    public func matches<Node: ContextNode>(_ node: Node) -> Bool {
        if let identifier, node.identifier != identifier { return false }
        if let role, node.role != role { return false }
        if let subrole, node.subrole != subrole { return false }
        return true
    }
}

/// The elements that `match` finds, and the attribute that holds their text.
public struct TextMatch: Equatable, Sendable, Decodable {
    public let match: ElementMatch
    public let attribute: ContextAttribute

    public init(match: ElementMatch, attribute: ContextAttribute) {
        self.match = match
        self.attribute = attribute
    }
}

/// How the context step reads one app: the container of the conversation,
/// each message in it, and the title of the chat.
///
/// Each rule is a file, `Resources/Context/<bundle id>.json`. An app with no
/// file gets the general rule of `ScreenContextExtractor`.
public struct ContextRule: Equatable, Sendable, Decodable {
    /// The name of the app.
    public let name: String
    public let title: TextMatch?
    public let conversation: ElementMatch
    public let message: TextMatch

    public init(name: String, title: TextMatch?, conversation: ElementMatch, message: TextMatch) {
        self.name = name
        self.title = title
        self.conversation = conversation
        self.message = message
    }
}

/// The rules of the apps, by bundle ID.
public struct ContextRules: Sendable {
    public let rules: [String: ContextRule]

    public init(rules: [String: ContextRule]) {
        self.rules = rules
    }

    public func rule(for bundleID: String?) -> ContextRule? {
        bundleID.flatMap { rules[$0] }
    }

    /// Loads each file in `Resources/Context`. Throws when a file does not
    /// decode.
    public static func bundled() throws -> ContextRules {
        guard let folder = Bundle.module.url(forResource: "Context", withExtension: nil) else {
            return ContextRules(rules: [:])
        }
        var rules: [String: ContextRule] = [:]
        for file in try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
        where file.pathExtension == "json" {
            rules[file.deletingPathExtension().lastPathComponent] =
                try JSONDecoder().decode(ContextRule.self, from: Data(contentsOf: file))
        }
        return ContextRules(rules: rules)
    }
}
