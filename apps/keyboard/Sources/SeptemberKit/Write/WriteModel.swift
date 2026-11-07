import Foundation

/// The documents of Write: the document list, the open document, and the
/// saves of the editor text.
///
/// The model shows a document in the editor through `show`, and reads the
/// text of the editor through `editorText`. Before another document opens,
/// the model saves the open document.
@MainActor
public final class WriteModel: ObservableObject {
    @Published public private(set) var documents: [WriteDocument] = []
    @Published public private(set) var current: WriteDocument?
    /// The last error of the folder, for the paper to show. It never holds document text.
    @Published public private(set) var failure: String?
    /// The document of the last Move to Trash, until Undo or the next move.
    @Published public private(set) var trashed: WriteDocument?
    /// Where the last Move to Trash put the file.
    private var trashedFile: URL?

    /// Shows the Markdown of a document in the editor. An empty text is a new document.
    public var show: (String) -> Void = { _ in }
    /// The Markdown in the editor now.
    public var editorText: () -> String = { "" }

    public let library: DocumentLibrary

    public init(library: DocumentLibrary) {
        self.library = library
    }

    /// Lists the folder and opens the newest document, or a new one.
    public func start() {
        reload()
        if let newest = documents.first {
            open(newest)
        } else {
            newDocument()
        }
    }

    public func newDocument() {
        save()
        do {
            let document = try library.create()
            reload()
            open(document)
        } catch {
            report(error)
        }
    }

    public func select(_ url: URL) {
        guard url != current?.url, let document = documents.first(where: { $0.url == url }) else {
            return
        }
        save()
        open(document)
    }

    /// Copies a document as "Title 2". The open document saves first, so
    /// the copy has its last words.
    @discardableResult
    public func duplicate(_ url: URL) -> WriteDocument? {
        save()
        guard let document = documents.first(where: { $0.url == url }) else { return nil }
        do {
            let copy = try library.duplicate(document)
            reload()
            return documents.first { $0.url == copy.url } ?? copy
        } catch {
            report(error)
            return nil
        }
    }

    /// Moves a document to the Trash. The open document saves first. When
    /// the open document goes, no document is open until the next `select`
    /// or `newDocument`.
    public func moveToTrash(_ url: URL) {
        save()
        guard let document = documents.first(where: { $0.url == url }) else { return }
        do {
            trashedFile = try library.moveToTrash(document)
            trashed = document
            if current?.url == url { current = nil }
            reload()
        } catch {
            report(error)
        }
    }

    /// Puts the document of the last Move to Trash back in the folder.
    @discardableResult
    public func undoTrash() -> WriteDocument? {
        guard let file = trashedFile, let document = trashed else { return nil }
        trashedFile = nil
        trashed = nil
        do {
            let back = try library.restore(file, as: document.title)
            reload()
            return documents.first { $0.url == back.url } ?? back
        } catch {
            report(error)
            return nil
        }
    }

    /// Forgets the last Move to Trash, so that Undo no longer offers it.
    public func forgetTrash() {
        trashedFile = nil
        trashed = nil
    }

    /// Opens the document that a `[[` link names.
    public func openLink(title: String) {
        guard let document = documents.first(where: { $0.title == title }) else { return }
        select(document.url)
    }

    /// Saves the text of the editor to the open document. The file takes the
    /// name of its first heading.
    public func save() {
        guard let url = current?.url else { return }
        do {
            let saved = try library.save(editorText(), to: url)
            reload()
            current = documents.first { $0.url == saved } ?? WriteDocument(url: saved, modified: Date())
            failure = nil
        } catch {
            report(error)
        }
    }

    private func open(_ document: WriteDocument) {
        do {
            let text = try library.read(document)
            current = document
            show(text)
        } catch {
            report(error)
        }
    }

    private func reload() {
        do {
            documents = try library.documents()
        } catch {
            report(error)
        }
    }

    private func report(_ error: any Error) {
        failure = (error as NSError).localizedDescription
    }
}
