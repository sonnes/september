import AppKit
import SeptemberKit
import WebKit

/// The web view with the Markdown editor of Piper, `Resources/Editor/editor.html`.
///
/// The page loads once. Calls wait in a queue until the page sends `ready`.
/// See `EditorCall` and `EditorMessage` for the bridge.
@MainActor
final class EditorWebPage: NSObject, WKScriptMessageHandlerWithReply, WKNavigationDelegate {
    let webView: EditorWebView
    /// A message of the page, other than `ready`.
    var onMessage: ((EditorMessage) -> Void)?
    /// Runs after the page loaded again, so the open document shows again.
    var onReload: (() -> Void)?

    private let page: URL?
    private var ready = false
    private var queue: [String] = []
    private var theme: EditorTheme?

    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        webView = EditorWebView(frame: .zero, configuration: configuration)
        page = Bundle.module.url(forResource: "editor", withExtension: "html", subdirectory: "Editor")
        super.init()
        configuration.userContentController.addScriptMessageHandler(
            WeakMessageHandler(self), contentWorld: .page, name: "editor")
        webView.navigationDelegate = self
        webView.setAccessibilityLabel("Document")
        load()
    }

    private func load() {
        guard let page else { return }
        webView.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
    }

    func send(_ call: EditorCall) {
        if case .theme(let theme) = call { self.theme = theme }
        if ready {
            webView.evaluateJavaScript(call.script)
        } else {
            queue.append(call.script)
        }
    }

    /// The text in the editor now. It can be newer than the last `change` message.
    func flush() async -> String? {
        guard ready else { return nil }
        return try? await webView.evaluateJavaScript(EditorCall.flushScript) as? String
    }

    /// The paragraph at the caret, or nil when the editor has no selection.
    func caret() async -> EditorCaret? {
        guard ready,
            let json = try? await webView.evaluateJavaScript(
                "JSON.stringify(\(EditorCall.caretScript))") as? String
        else { return nil }
        return try? JSONDecoder().decode(EditorCaret.self, from: Data(json.utf8))
    }

    // MARK: Messages

    /// The page waits for an answer to each message. The keyboard answers
    /// every message with nothing, including the ones for features of Piper
    /// that it does not use.
    func userContentController(
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
    /// again, and the open document shows again when the page is ready.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        ready = false
        queue = []
        load()
        if let theme { send(.theme(theme)) }
        onReload?()
    }

    /// The page is local. Links reach the keyboard as `link` messages.
    func webView(
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
final class EditorWebView: WKWebView {
    private static let commands: [String: Selector] = [
        "x": #selector(NSText.cut(_:)),
        "c": #selector(NSText.copy(_:)),
        "v": #selector(NSText.paste(_:)),
        "a": #selector(NSText.selectAll(_:)),
    ]

    override func performKeyEquivalent(with event: NSEvent) -> Bool {
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
