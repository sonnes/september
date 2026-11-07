import CoreGraphics
import Foundation

/// One text attribute of an element that the context probe read.
public struct ProbeText: Equatable, Sendable {
    /// `title`, `description`, `value`, `placeholder`, or `help`.
    public let attribute: String
    public let text: String

    public init(attribute: String, text: String) {
        self.attribute = attribute
        self.text = text
    }
}

/// One element around the focused field, as the context probe read it.
public struct ProbeElement: Equatable, Sendable {
    public let role: String
    public let subrole: String?
    /// The `AXIdentifier` that the developer of the app gave the element.
    public let identifier: String?
    /// The frame on the screen, with the origin at the top left.
    public let frame: CGRect?
    public let texts: [ProbeText]
    public let isFocused: Bool
    /// True for the focused element and each element above it.
    public let onFocusPath: Bool
    public let children: [ProbeElement]

    public init(
        role: String, subrole: String? = nil, identifier: String? = nil, frame: CGRect? = nil,
        texts: [ProbeText] = [], isFocused: Bool = false, onFocusPath: Bool = false,
        children: [ProbeElement] = []
    ) {
        self.role = role
        self.subrole = subrole
        self.identifier = identifier
        self.frame = frame
        self.texts = texts
        self.isFocused = isFocused
        self.onFocusPath = onFocusPath
        self.children = children
    }
}

/// Prints the elements around the focused field with the shape of their text
/// and none of its words, so the output can be shared.
///
/// A capitalized word becomes `W`, any other word `w`, and a run of digits
/// `9`. Marks stay. A line break becomes `⏎`.
public enum ContextShape {
    /// The longest shape before the cut.
    static let shapeLimit = 60
    static let lineLimit = 400

    public static func shape(of text: String) -> String {
        var shape = ""
        var previous: Character?
        var pendingSpace = ""
        for character in text {
            if character.isWhitespace {
                if character.isNewline { pendingSpace = " ⏎ " } else if pendingSpace.isEmpty { pendingSpace = " " }
                previous = nil
                continue
            }
            if !shape.isEmpty { shape += pendingSpace }
            pendingSpace = ""
            if character.isLetter {
                if previous?.isLetter != true { shape.append(character.isUppercase ? "W" : "w") }
            } else if character.isNumber {
                if previous?.isNumber != true { shape.append("9") }
            } else {
                shape.append(character)
            }
            previous = character
        }
        guard shape.count > shapeLimit else { return shape }
        let words = text.split(whereSeparator: \.isWhitespace).count
        return shape.prefix(shapeLimit * 2 / 3) + "… (\(words) words)"
    }

    /// One line for each element that has text or leads to the field, indented
    /// by depth. `dy` is the distance from the top of the field: less than
    /// zero is above it.
    public static func lines(for root: ProbeElement, field: CGRect?) -> [String] {
        var lines: [String] = []
        append(root, depth: 0, field: field, to: &lines)
        guard lines.count > lineLimit else { return lines }
        return Array(lines.prefix(lineLimit)) + ["… \(lines.count - lineLimit) more lines"]
    }

    private static func append(_ element: ProbeElement, depth: Int, field: CGRect?, to lines: inout [String]) {
        guard shows(element) else { return }
        lines.append(String(repeating: "  ", count: depth) + line(for: element, field: field))
        for child in element.children {
            append(child, depth: depth + 1, field: field, to: &lines)
        }
    }

    private static func shows(_ element: ProbeElement) -> Bool {
        element.isFocused || element.onFocusPath || !element.texts.isEmpty || element.children.contains(where: shows)
    }

    private static func line(for element: ProbeElement, field: CGRect?) -> String {
        var name = element.role
        if let subrole = element.subrole { name += "/\(subrole)" }
        if let identifier = element.identifier { name += " #\(identifier)" }
        var parts = [name]
        if let frame = element.frame, let field {
            parts.append("dy \(Int(frame.minY - field.minY))")
        }
        for text in element.texts {
            parts.append("\(text.attribute) \"\(shape(of: text.text))\" (\(text.text.count) ch)")
        }
        if element.isFocused { parts.append("<- focused") }
        return parts.joined(separator: "  ")
    }
}
