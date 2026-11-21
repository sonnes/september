import AppKit
import WebKit

/// The page that shows the editor of Write. `EditorWebPage` is the real page.
/// The tests use a fake page.
@MainActor
public protocol EditorPage: AnyObject {
    /// The view that the paper shows and gives the focus.
    var view: NSView { get }
    /// A message of the page, other than `ready`.
    var onMessage: ((EditorMessage) -> Void)? { get set }
    /// The page loaded again after its web process stopped. The editor
    /// shows the open document again.
    var onReload: (() -> Void)? { get set }
    func send(_ call: EditorCall)
}

/// The web view with the Markdown editor of Piper, `Resources/Editor/editor.html`.
///
/// The page loads once. Calls wait in a queue until the page sends `ready`.
/// See `EditorCall` and `EditorMessage` for the bridge.
@MainActor
public final class EditorWebPage: NSObject, EditorPage, WKScriptMessageHandlerWithReply, WKNavigationDelegate {
    public let webView: EditorWebView
    public var view: NSView { webView }
    public var onMessage: ((EditorMessage) -> Void)?
    public var onReload: (() -> Void)?

    private let page: URL?
    private var ready = false
    private var queue: [String] = []

    public override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.userContentController.addUserScript(
            WKUserScript(
                source: EditorCall.pageScript(
                    bottom: Double(Metrics.WriteEditor.paperMargin), css: WriteEditorStyle.css),
                injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        webView = EditorWebView(frame: .zero, configuration: configuration)
        page = Bundle.module.url(forResource: "editor", withExtension: "html", subdirectory: "Editor")
        super.init()
        configuration.userContentController.addScriptMessageHandler(
            WeakMessageHandler(self), contentWorld: .page, name: "editor")
        webView.navigationDelegate = self
        // The paper draws the sheet. The page is clear.
        webView.setValue(false, forKey: "drawsBackground")
        webView.setAccessibilityLabel("Document")
        load()
    }

    private func load() {
        guard let page else { return }
        webView.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
    }

    public func send(_ call: EditorCall) {
        if ready {
            webView.evaluateJavaScript(call.script)
        } else {
            queue.append(call.script)
        }
    }

    /// True when the page answered `ready`, for the snapshots.
    public var isReady: Bool { ready }

    // MARK: Messages

    /// The page waits for an answer to each message. The keyboard answers
    /// every message with nothing, including the ones for features of Piper
    /// that it does not use.
    public func userContentController(
        _ controller: WKUserContentController,
        didReceive message: WKScriptMessage
    ) async -> (Any?, String?) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url == page else {
            return (nil, nil)
        }
        let decoded = EditorMessage(body: message.body)
        if decoded == .ready {
            ready = true
            let pending = queue
            queue = []
            for script in pending { _ = try? await webView.evaluateJavaScript(script) }
        } else {
            onMessage?(decoded)
        }
        return (nil, nil)
    }

    // MARK: Navigation

    /// A crash of the web content process leaves a blank view. The page loads
    /// again, and the editor shows the open document again.
    public func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        ready = false
        queue = []
        load()
        onReload?()
    }

    /// The page is local. Links reach the keyboard as `link` messages.
    public func webView(
        _ webView: WKWebView,
        decidePolicyFor action: WKNavigationAction
    ) async -> WKNavigationActionPolicy {
        guard let url = action.request.url, action.targetFrame?.isMainFrame == true else {
            return .cancel
        }
        return url == page ? .allow : .cancel
    }
}

/// The web view of the editor page.
///
/// Keyboard has no Edit menu, so the menu key equivalents of the text
/// commands do not reach the page. The view answers them itself. The editor
/// handles its own shortcuts, such as Undo, Bold, and Link, in the page.
public final class EditorWebView: WKWebView {
    private static let commands: [String: Selector] = [
        "x": #selector(NSText.cut(_:)),
        "c": #selector(NSText.copy(_:)),
        "v": #selector(NSText.paste(_:)),
        "a": #selector(NSText.selectAll(_:)),
    ]

    override public func performKeyEquivalent(with event: NSEvent) -> Bool {
        let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
        if flags == .command, window?.firstResponder === self,
            let key = event.charactersIgnoringModifiers?.lowercased(),
            let command = Self.commands[key],
            NSApp.sendAction(command, to: self, from: self)
        {
            return true
        }
        return super.performKeyEquivalent(with: event)
    }
}

/// The user content controller keeps its handlers. This keeps the page free to go.
private final class WeakMessageHandler: NSObject, WKScriptMessageHandlerWithReply {
    weak var target: EditorWebPage?

    init(_ target: EditorWebPage) { self.target = target }

    @MainActor
    func userContentController(
        _ controller: WKUserContentController,
        didReceive message: WKScriptMessage
    ) async -> (Any?, String?) {
        await target?.userContentController(controller, didReceive: message) ?? (nil, nil)
    }
}
