import AppKit
import QuartzCore

/// A command of the desk, from a key, a card, or an action button.
public enum WriteDeskCommand: Equatable, Sendable {
    /// Opens the selected card.
    case open
    case newDocument
    /// Opens the selected document with its heading selected.
    case rename
    case duplicate
    /// Shows the file of the selected card in Finder.
    case reveal
    case trash
    /// Undo of the last Move to Trash.
    case undo
    /// Goes back to the paper.
    case back
    /// Closes Write.
    case close
}

/// The desk of Write: the documents as paper cards in a row above the
/// keyboard, a Find field, the actions of the selected card, and Undo of
/// Move to Trash.
///
/// The cards rise out of the input bar when the desk opens, 30 ms apart, and
/// go back down into it when the desk closes. With Reduce Motion on, the
/// cards appear and go with no motion.
///
/// The Find field takes the typing. The left and the right arrows move
/// between the cards, Return opens the selected card, and Esc goes back to
/// the paper. The desk sends each command to `onCommand`.
@MainActor
public final class WriteDeskController: NSObject, NSWindowDelegate, NSTextFieldDelegate {
    typealias Motion = Metrics.WriteMotion
    typealias Sizes = Metrics.WriteDesk

    public let window: WriteDeskWindow
    /// The documents, the query, and the selected card.
    public private(set) var desk = WriteDesk(documents: [], current: nil)
    /// The title of the document of the last Move to Trash, while Undo shows.
    public private(set) var undoTitle: String?
    public private(set) var isOpen = false

    public var onCommand: ((WriteDeskCommand) -> Void)?
    /// Called with the Find query after each change.
    public var onQueryChange: ((String) -> Void)?
    /// Called when the time for Undo ends.
    public var onUndoEnd: (() -> Void)?
    /// Called with `true` when the desk becomes the key window, and with
    /// `false` when it stops being the key window.
    public var onKeyChanged: ((Bool) -> Void)?
    /// The lines of a document for its card.
    public var preview: (WriteDocument) -> [String] = { _ in [] }
    /// Brings the desk to the front with the focus.
    public var bringToFront: (NSWindow) -> Void = { window in
        NSApp.activate()
        window.makeKeyAndOrderFront(nil)
    }

    private let root = DeskRootView()
    private let findBox = DeskPillView(fill: Tokens.writePaper)
    private let find = NSTextField()
    private let count = NSTextField(labelWithString: "")
    private let actions = NSStackView()
    private let notice = DeskPillView(fill: Tokens.writeNoticeFill)
    private let noticeText = NSTextField(labelWithString: "")
    private var cards: [CardKey: WriteCardView] = [:]
    private var area: CGRect = .zero
    private var centre: CGFloat = 0
    private var undoTimer: Timer?
    private var hideTimer: Timer?

    override public init() {
        window = WriteDeskWindow(contentRect: .zero, styleMask: [.borderless], backing: .buffered, defer: true)
        super.init()
        window.isReleasedWhenClosed = false
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.delegate = self
        window.contentView = root
        window.onKey = { [weak self] command in self?.onCommand?(command) }
        window.onFind = { [weak self] in self?.focusFind() }
        setUpFind()
        setUpActions()
        setUpNotice()
    }

    private var reduceMotion: Bool { NSWorkspace.shared.accessibilityDisplayShouldReduceMotion }

    // MARK: - Open and close

    /// Opens the desk with its cards rising out of the input bar.
    ///
    /// - Parameters:
    ///   - area: the space above the keyboard, on the screen.
    ///   - centre: the middle of the input bar.
    public func show(documents: [WriteDocument], current: URL?, area: CGRect, centre: CGFloat) {
        hideTimer?.invalidate()
        hideTimer = nil
        desk = WriteDesk(documents: documents, current: current)
        self.area = area
        self.centre = centre
        isOpen = true
        find.stringValue = ""
        cards.values.forEach { $0.removeFromSuperview() }
        cards = [:]
        window.setFrame(area, display: false)
        relayout(animated: false)
        riseCards()
        bringToFront(window)
        window.makeFirstResponder(find)
        onQueryChange?(desk.query)
    }

    /// Closes the desk. The cards go back down into the bar. The card of
    /// `opening` goes at once, because the paper grows out of it.
    public func hide(opening: URL? = nil, newDocument: Bool = false) {
        guard isOpen else { return }
        isOpen = false
        hideUndo()
        let key: CardKey? = newDocument ? .newDocument : opening.map(CardKey.document)
        if let key { cards[key]?.isHidden = true }
        guard !reduceMotion else {
            window.orderOut(nil)
            return
        }
        let order = cards.values.sorted { $0.frame.minX < $1.frame.minX }
        for (index, card) in order.enumerated() where !card.isHidden {
            card.animateAway(delay: Double(index) * Motion.cardStagger)
        }
        let duration = Motion.deskCards + Double(order.count) * Motion.cardStagger
        hideTimer = Timer.scheduledTimer(withTimeInterval: duration, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, !self.isOpen else { return }
                self.window.orderOut(nil)
            }
        }
    }

    /// The frame of the card of a document on the screen, or of New
    /// Document for nil. Nil when the card is not in view.
    public func cardFrame(of url: URL?) -> CGRect? {
        let key = url.map(CardKey.document) ?? .newDocument
        guard let card = cards[key], card.superview != nil else { return nil }
        return window.convertToScreen(card.frame)
    }

    // MARK: - Changes

    /// Shows the documents after a change of the folder. The selection stays
    /// on the same document, or goes to `select`.
    public func update(documents: [WriteDocument], select url: URL? = nil) {
        desk.documents = documents
        if let url { desk.select(url) }
        relayout(animated: true)
    }

    public func move(by offset: Int) {
        desk.move(by: offset)
        relayout(animated: true)
    }

    public func setQuery(_ query: String) {
        if find.stringValue != query { find.stringValue = query }
        desk.query = query
        relayout(animated: true)
        onQueryChange?(query)
    }

    /// Shows Undo for the document of a Move to Trash, for 8 seconds.
    public func showUndo(title: String) {
        undoTitle = title
        noticeText.stringValue = "Moved “\(title)” to the Trash"
        notice.isHidden = false
        undoTimer?.invalidate()
        undoTimer = Timer.scheduledTimer(withTimeInterval: Motion.undoTime, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.hideUndo()
                self?.onUndoEnd?()
            }
        }
    }

    public func hideUndo() {
        undoTitle = nil
        notice.isHidden = true
        undoTimer?.invalidate()
        undoTimer = nil
    }

    // MARK: - Layout

    private func relayout(animated: Bool) {
        let items = desk.items
        let layout = WriteDeskLayout(area: area, centre: centre, count: items.count, selection: desk.selection)
        let origin = area.origin
        let local = { (rect: CGRect) in rect.offsetBy(dx: -origin.x, dy: -origin.y) }

        var shown: Set<CardKey> = []
        for (offset, index) in layout.visible.enumerated() {
            let item = items[index]
            let key = CardKey(item)
            shown.insert(key)
            let isSelected = index == desk.selection
            var frame = local(layout.cards[offset])
            if isSelected { frame.origin.y += Sizes.selectedLift }
            let card = cards[key] ?? makeCard(for: item, key: key, frame: frame)
            card.isSelected = isSelected
            card.onPress = { [weak self] in self?.pressed(index: index) }
            if animated, !reduceMotion, card.frame != frame {
                NSAnimationContext.runAnimationGroup { context in
                    context.duration = Motion.cardMove
                    context.timingFunction = Motion.snappyTiming
                    card.animator().frame = frame
                }
            } else {
                card.frame = frame
            }
        }
        for (key, card) in cards where !shown.contains(key) {
            card.removeFromSuperview()
            cards[key] = nil
        }

        findBox.frame = local(layout.find)
        notice.frame = local(layout.notice)
        count.stringValue = desk.count
        let canAct = desk.selected.url != nil
        actions.isHidden = !canAct
        let size = actions.fittingSize
        let row = local(layout.actions)
        let x = min(max(layout.centre - origin.x - size.width / 2, row.minX), row.maxX - size.width)
        actions.frame = CGRect(x: x, y: row.minY, width: size.width, height: row.height)
        root.setAccessibilityLabel("Documents, \(desk.count)")
    }

    private func makeCard(for item: WriteDesk.Item, key: CardKey, frame: CGRect) -> WriteCardView {
        let card: WriteCardView
        switch item {
        case .newDocument:
            card = WriteCardView(newDocument: ())
        case .document(let document):
            card = WriteCardView(
                title: document.title, lines: preview(document),
                date: WriteDocument.dateLabel(document.modified))
        }
        card.frame = frame
        root.addSubview(card, positioned: .below, relativeTo: findBox)
        cards[key] = card
        return card
    }

    private func riseCards() {
        guard !reduceMotion else { return }
        let order = cards.values.sorted { $0.frame.minX < $1.frame.minX }
        for (index, card) in order.enumerated() {
            card.animateRise(delay: Double(index) * Motion.cardStagger)
        }
    }

    private func pressed(index: Int) {
        if index == desk.selection {
            onCommand?(.open)
        } else {
            desk.select(index: index)
            relayout(animated: true)
        }
    }

    private func focusFind() {
        window.makeFirstResponder(find)
        find.currentEditor()?.selectAll(nil)
    }

    // MARK: - Views

    private func setUpFind() {
        find.isBezeled = false
        find.drawsBackground = false
        find.focusRingType = .none
        find.font = Typography.writeFind
        find.textColor = NSColor(Tokens.writeText)
        find.placeholderString = "Find a document"
        find.delegate = self
        find.setAccessibilityLabel("Find a document")
        find.translatesAutoresizingMaskIntoConstraints = false
        count.font = Typography.writeFindCount
        count.textColor = NSColor(Tokens.writeMuted)
        count.translatesAutoresizingMaskIntoConstraints = false
        count.setContentCompressionResistancePriority(.required, for: .horizontal)
        findBox.addSubview(find)
        findBox.addSubview(count)
        let padding = Sizes.findPadding
        NSLayoutConstraint.activate([
            find.leadingAnchor.constraint(equalTo: findBox.leadingAnchor, constant: padding),
            find.centerYAnchor.constraint(equalTo: findBox.centerYAnchor),
            count.leadingAnchor.constraint(equalTo: find.trailingAnchor, constant: padding / 2),
            count.trailingAnchor.constraint(equalTo: findBox.trailingAnchor, constant: -padding),
            count.centerYAnchor.constraint(equalTo: findBox.centerYAnchor),
        ])
        root.addSubview(findBox)
    }

    private func setUpActions() {
        let buttons: [(String, WriteDeskCommand, DeskActionButton.Style)] = [
            ("Open", .open, .primary), ("Rename", .rename, .plain), ("Duplicate", .duplicate, .plain),
            ("Show in Finder", .reveal, .plain), ("Move to Trash", .trash, .danger),
        ]
        for (title, command, style) in buttons {
            let button = DeskActionButton(title: title, style: style) { [weak self] in
                self?.onCommand?(command)
            }
            actions.addArrangedSubview(button)
        }
        actions.orientation = .horizontal
        actions.spacing = Sizes.actionGap
        root.addSubview(actions)
    }

    private func setUpNotice() {
        noticeText.font = Typography.writeDeskAction
        noticeText.textColor = NSColor(Tokens.writeNoticeText)
        noticeText.lineBreakMode = .byTruncatingMiddle
        noticeText.translatesAutoresizingMaskIntoConstraints = false
        let undo = DeskActionButton(title: "Undo", style: .primary) { [weak self] in
            self?.onCommand?(.undo)
        }
        undo.translatesAutoresizingMaskIntoConstraints = false
        notice.addSubview(noticeText)
        notice.addSubview(undo)
        let padding = Sizes.findPadding
        NSLayoutConstraint.activate([
            noticeText.leadingAnchor.constraint(equalTo: notice.leadingAnchor, constant: padding),
            noticeText.centerYAnchor.constraint(equalTo: notice.centerYAnchor),
            undo.leadingAnchor.constraint(greaterThanOrEqualTo: noticeText.trailingAnchor, constant: padding / 2),
            undo.trailingAnchor.constraint(equalTo: notice.trailingAnchor, constant: -Sizes.actionGap),
            undo.centerYAnchor.constraint(equalTo: notice.centerYAnchor),
        ])
        notice.isHidden = true
        root.addSubview(notice)
    }

    // MARK: - NSTextFieldDelegate

    public func controlTextDidChange(_ notification: Notification) {
        setQuery(find.stringValue)
    }

    public func control(_ control: NSControl, textView: NSTextView, doCommandBy selector: Selector) -> Bool {
        switch selector {
        case #selector(NSResponder.moveLeft(_:)):
            move(by: -1)
        case #selector(NSResponder.moveRight(_:)):
            move(by: 1)
        case #selector(NSResponder.insertNewline(_:)):
            onCommand?(.open)
        case #selector(NSResponder.cancelOperation(_:)):
            onCommand?(.back)
        case #selector(NSResponder.moveUp(_:)), #selector(NSResponder.moveDown(_:)):
            break
        default:
            return false
        }
        return true
    }

    // MARK: - NSWindowDelegate

    public func windowDidBecomeKey(_ notification: Notification) {
        onKeyChanged?(true)
    }

    public func windowDidResignKey(_ notification: Notification) {
        onKeyChanged?(false)
    }
}

/// The name of a card, so that a card keeps its view while the row changes.
private enum CardKey: Hashable {
    case newDocument
    case document(URL)

    init(_ item: WriteDesk.Item) {
        switch item {
        case .newDocument: self = .newDocument
        case .document(let document): self = .document(document.url)
        }
    }
}

/// The window of the desk. It has no frame and no fill, so it says that it
/// can become the key window. It answers the shortcuts of the desk itself,
/// because the app has no menu bar.
public final class WriteDeskWindow: NSWindow {
    var onKey: ((WriteDeskCommand) -> Void)?
    var onFind: (() -> Void)?

    override public var canBecomeKey: Bool { true }
    override public var canBecomeMain: Bool { true }

    override public func performKeyEquivalent(with event: NSEvent) -> Bool {
        let flags = event.modifierFlags.intersection([.command, .option, .shift, .control])
        let key = event.charactersIgnoringModifiers?.lowercased()
        let command: WriteDeskCommand?
        switch (flags, key) {
        case (.command, "n"): command = .newDocument
        case (.command, "r"): command = .rename
        case (.command, "d"): command = .duplicate
        case ([.command, .option], "r"): command = .reveal
        case (.command, "z"): command = .undo
        case (.command, "o"): command = .back
        case (.command, "w"): command = .close
        case (.command, "f"):
            onFind?()
            return true
        default:
            command = event.keyCode == VirtualKey.delete.rawValue && flags == .command ? .trash : nil
        }
        guard let command else { return super.performKeyEquivalent(with: event) }
        onKey?(command)
        return true
    }
}

/// The content of the desk. It is clear, so that the screen shows through
/// between the cards.
private final class DeskRootView: NSView {
    override init(frame: NSRect) {
        super.init(frame: frame)
        setAccessibilityRole(.group)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
}

/// A pill with a fill and the shadow of the cards: the Find field and the
/// Undo notice.
private final class DeskPillView: NSView {
    private let fill: ThemeColor

    init(fill: ThemeColor) {
        self.fill = fill
        super.init(frame: .zero)
        wantsLayer = true
        layer?.cornerCurve = .continuous
        layer?.shadowOpacity = 1
        layer?.shadowRadius = Metrics.WriteDesk.spacing / 2
        layer?.shadowOffset = CGSize(width: 0, height: -Metrics.WriteDesk.selectionRing)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = NSColor(fill).cgColor
        layer?.shadowColor = NSColor(Tokens.writeCardShadow).cgColor
        layer?.cornerRadius = bounds.height / 2
    }

    override func layout() {
        super.layout()
        needsDisplay = true
    }
}

/// An action of the selected card, as a pill button.
final class DeskActionButton: NSButton {
    enum Style { case primary, plain, danger }

    private let style: Style
    private let handler: () -> Void

    init(title: String, style: Style, action handler: @escaping () -> Void) {
        self.style = style
        self.handler = handler
        super.init(frame: .zero)
        self.title = title
        isBordered = false
        wantsLayer = true
        font = Typography.writeDeskAction
        target = self
        action = #selector(press)
        let text: ThemeColor =
            switch style {
            case .primary: Tokens.writeOnAccent
            case .plain: Tokens.writeText
            case .danger: Tokens.writeDanger
            }
        // A dynamic colour follows light and dark when the title draws.
        attributedTitle = NSAttributedString(
            string: title, attributes: [.font: Typography.writeDeskAction, .foregroundColor: NSColor(text)])
        layer?.cornerCurve = .continuous
        layer?.shadowOpacity = 1
        layer?.shadowRadius = Metrics.WriteDesk.actionGap / 2
        layer?.shadowOffset = CGSize(width: 0, height: -Metrics.WriteDesk.selectionRing / 2)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override var intrinsicContentSize: NSSize {
        let text = (title as NSString).size(withAttributes: [.font: Typography.writeDeskAction])
        return NSSize(
            width: ceil(text.width) + 2 * Metrics.WriteDesk.actionPadding, height: Metrics.WriteDesk.actionHeight)
    }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        let fill = style == .primary ? Tokens.writeAccent : Tokens.writePaper
        layer?.backgroundColor = NSColor(fill).cgColor
        layer?.shadowColor = NSColor(Tokens.writeCardShadow).cgColor
        layer?.cornerRadius = bounds.height / 2
    }

    @objc private func press() { handler() }
}
