import Foundation

/// The desk of Write: the documents as cards, the Find query, and the
/// selected card.
///
/// The first card is always New Document. The documents follow, newest
/// first. Find keeps the documents whose title has the query, in any case
/// and with or without accents.
public struct WriteDesk: Equatable, Sendable {
    public static let cardLines = 6

    public enum Item: Equatable, Sendable {
        case newDocument
        case document(WriteDocument)
    }

    /// All the documents, newest first.
    public var documents: [WriteDocument] {
        didSet { keepSelection(from: oldValue) }
    }
    /// The text of the Find field.
    public var query = "" {
        didSet {
            guard query != oldValue else { return }
            selection = items.count > 1 ? 1 : 0
        }
    }
    /// The index of the selected card in `items`.
    public private(set) var selection = 0

    public init(documents: [WriteDocument], current: URL?) {
        self.documents = documents
        if let current { select(current) }
        if selection == 0, documents.count > 0 { selection = 1 }
    }

    /// New Document, then the documents that match the query.
    public var items: [Item] {
        [.newDocument] + matches.map(Item.document)
    }

    public var selected: Item { items[selection] }

    /// "6 documents", or "2 of 6" while Find has a query.
    public var count: String {
        if query.isEmpty {
            return documents.count == 1 ? "1 document" : "\(documents.count) documents"
        }
        return "\(matches.count) of \(documents.count)"
    }

    /// Moves the selection by `offset` cards. It stops at the first and the
    /// last card.
    public mutating func move(by offset: Int) {
        selection = min(max(selection + offset, 0), items.count - 1)
    }

    public mutating func select(index: Int) {
        selection = min(max(index, 0), items.count - 1)
    }

    /// Selects the card of the document at `url`, if it is on the desk.
    public mutating func select(_ url: URL) {
        if let index = items.firstIndex(where: { $0.url == url }) { selection = index }
    }

    private var matches: [WriteDocument] {
        let query = query.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return documents }
        return documents.filter {
            $0.title.range(of: query, options: [.caseInsensitive, .diacriticInsensitive]) != nil
        }
    }

    /// Keeps the same document selected. When it is gone, the next card
    /// takes its place.
    private mutating func keepSelection(from old: [WriteDocument]) {
        let before = Self(documents: old, query: query, selection: selection)
        if let url = before.selected.url, items.contains(where: { $0.url == url }) {
            select(url)
        } else {
            select(index: selection)
        }
    }

    private init(documents: [WriteDocument], query: String, selection: Int) {
        self.documents = documents
        self.query = query
        self.selection = selection
    }
}

extension WriteDesk.Item {
    /// The URL of the document of the card. New Document has none.
    public var url: URL? {
        if case .document(let document) = self { return document.url }
        return nil
    }
}
