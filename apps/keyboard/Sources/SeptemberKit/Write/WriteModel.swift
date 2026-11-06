import Foundation

/// The state of the Write window: the document list, the open document, and
/// the saves of the editor text.
///
/// Each open of a document gets its own path in the page. The page sends the
/// last edit of a document after the next document opens, so a `change`
/// finds its file through that path, even after a rename.
@MainActor
public final class WriteModel: ObservableObject {
    @Published public private(set) var documents: [WriteDocument] = []
    @Published public private(set) var current: WriteDocument?
    /// The last error of the folder, for the window to show. It never holds document text.
    @Published public private(set) var failure: String?

    /// Sends a call to the editor page.
    public var send: (EditorCall) -> Void = { _ in }

    public let library: DocumentLibrary
    private var files: [String: URL] = [:]
    private var currentPath: String?
    private var opens = 0

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
        open(document)
    }

    /// Opens the document that a `[[` link names.
    public func openLink(title: String) {
        guard let document = documents.first(where: { $0.title == title }) else { return }
        select(document.url)
    }

    /// Saves the text of an open. The page sends it 120 ms after the last edit.
    public func editorChanged(path: String, text: String) {
        guard let url = files[path] else { return }
        do {
            let saved = try library.save(text, to: url)
            files[path] = saved
            reload()
            if path == currentPath {
                current = documents.first { $0.url == saved } ?? WriteDocument(url: saved, modified: Date())
                send(.header("Saved", nil))
            }
            failure = nil
        } catch {
            if path == currentPath { send(.header("Not saved", nil)) }
            report(error)
        }
    }

    /// Saves the text that `window.piper.flush()` returned, before a close or a quit.
    public func flushed(_ text: String) {
        guard let currentPath else { return }
        editorChanged(path: currentPath, text: text)
    }

    /// Shows the open document again, after the page loaded again.
    public func reopen() {
        guard let current else { return }
        open(current)
    }

    private func open(_ document: WriteDocument) {
        do {
            let text = try library.read(document)
            opens += 1
            let path = "write-\(opens)"
            files[path] = document.url
            currentPath = path
            current = document
            let targets = documents.map {
                EditorOpenRequest.WikiTarget(path: $0.url.lastPathComponent, target: $0.title, title: $0.title)
            }
            send(.open(EditorOpenRequest(
                path: path, text: text, header: WriteDocument.dateLabel(document.modified),
                wikiTargets: targets)))
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
