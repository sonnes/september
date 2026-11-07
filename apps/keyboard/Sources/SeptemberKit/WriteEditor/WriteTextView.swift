import AppKit

/// The native Markdown editor of the Write paper.
///
/// The text has no Markdown marks. Each paragraph is one block, and the
/// block kind and the inline marks are attributes. Typing the Markdown marks
/// makes the block or the mark, as in the Piper editor: `# ` makes a heading,
/// `- ` a list, `[ ] ` a to-do item, `**bold**` bold text, and so on.
///
/// The keyboard types into the editor with key events. The app has no Edit
/// menu, so the editor answers the Command shortcuts itself.
@MainActor
public final class WriteTextView: NSTextView, NSTextStorageDelegate, NSTextLayoutManagerDelegate {
    /// Called after each change of the text.
    public var onTextChange: (() -> Void)?
    /// Called with the paragraph at the caret after each change of the text
    /// or the selection.
    public var onCaretChange: ((EditorCaret) -> Void)?
    /// Called when the user opens a link with Command-click.
    public var onOpenLink: ((WriteLink) -> Void)?
    /// Called after the text or the selection changed and the overlay moved.
    /// The paper uses it to grow and to scroll.
    public var onLayoutChange: (() -> Void)?
    /// When true, the editor does not scroll to the caret by itself. The
    /// paper scrolls the text instead.
    public var paperScrolls = false

    private let contentStorage: NSTextContentStorage
    private let ownUndo = UndoManager()
    private var restyling = false
    /// The box of the empty last paragraph, which has no character to hold it.
    private var trailingBox: WriteBlockBox?
    lazy var overlay = WriteOverlay(textView: self)
    /// True when the last change came from a key, not from the pointer.
    var lastInputWasKey = false

    override public init(frame: NSRect) {
        let layoutManager = NSTextLayoutManager()
        let container = NSTextContainer(size: CGSize(width: frame.width, height: .greatestFiniteMagnitude))
        container.widthTracksTextView = true
        container.lineFragmentPadding = 0
        layoutManager.textContainer = container
        contentStorage = NSTextContentStorage()
        contentStorage.addTextLayoutManager(layoutManager)
        contentStorage.primaryTextLayoutManager = layoutManager
        super.init(frame: frame, textContainer: container)
        layoutManager.delegate = self
        textStorage?.delegate = self

        isRichText = true
        allowsUndo = true
        usesFontPanel = false
        importsGraphics = false
        isAutomaticQuoteSubstitutionEnabled = false
        isAutomaticDashSubstitutionEnabled = false
        isAutomaticTextReplacementEnabled = false
        isAutomaticLinkDetectionEnabled = false
        isAutomaticDataDetectionEnabled = false
        smartInsertDeleteEnabled = false
        drawsBackground = false
        isVerticallyResizable = true
        isHorizontallyResizable = false
        autoresizingMask = [.width]
        insertionPointColor = .clear
        selectedTextAttributes = [.backgroundColor: NSColor(Tokens.writeSelection)]
        linkTextAttributes = [:]
        setAccessibilityLabel("Document")
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override public var undoManager: UndoManager? { ownUndo }

    // MARK: - Document

    /// Shows a Markdown document. Undo starts again, and the caret goes to
    /// the end of the document.
    public func load(_ markdown: String) {
        let blocks = markdown.isEmpty ? [] : WriteMarkdown.parse(markdown).blocks
        trailingBox = nil
        let text = WriteText.attributed(blocks)
        restyling = true
        textStorage?.setAttributedString(text)
        restyling = false
        restyleAll()
        ownUndo.removeAllActions()
        setSelectedRange(NSRange(location: (string as NSString).length, length: 0))
        didChange()
    }

    /// Shows an empty document that starts with a heading.
    public func loadNewDocument() {
        load("")
        setKind(.heading(1), paragraphAt: 0)
        ownUndo.removeAllActions()
    }

    /// Selects the text of the first heading, so that the next key press
    /// renames the document. A document with no heading gets the caret at
    /// its start.
    public func selectTitle() {
        let text = string as NSString
        var location = 0
        while location < text.length {
            let paragraph = text.paragraphRange(for: NSRange(location: location, length: 0))
            let box = textStorage?.attribute(.writeBlock, at: paragraph.location, effectiveRange: nil) as? WriteBlockBox
            if case .heading = box?.kind {
                var range = paragraph
                while range.length > 0, CharacterSet.newlines.contains(
                    UnicodeScalar(text.character(at: NSMaxRange(range) - 1)) ?? " ")
                {
                    range.length -= 1
                }
                setSelectedRange(range)
                return
            }
            location = NSMaxRange(paragraph)
        }
        setSelectedRange(NSRange(location: 0, length: 0))
    }

    /// The Markdown of the document. Blocks that the user did not edit keep
    /// their source.
    public var markdown: String {
        guard let textStorage else { return "" }
        let blocks = WriteText.blocks(textStorage, trailing: trailingBox)
        if blocks.count == 1, blocks[0].kind == .paragraph, blocks[0].runs.isEmpty, blocks[0].source == nil {
            return ""
        }
        return WriteMarkdown.serialize(blocks)
    }

    /// The paragraph at the caret, for the input bar and the predictions of
    /// the keyboard. The offsets are UTF-16 units.
    public var caret: EditorCaret {
        let ns = string as NSString
        let selection = selectedRange()
        let paragraph = WriteText.paragraph(at: min(selection.location, ns.length), in: ns)
        let text = ns.substring(with: paragraph).replacingOccurrences(of: "\u{2028}", with: "\n")
        return EditorCaret(
            text: text, caret: selection.location - paragraph.location, length: selection.length,
            documentIsEmpty: string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    }

    /// The selection and the document, for Speak. The selection has no
    /// Markdown marks.
    public var speech: EditorSpeech {
        let selection = (string as NSString).substring(with: selectedRange())
            .replacingOccurrences(of: "\u{2028}", with: "\n")
        return EditorSpeech(selection: selection, markdown: markdown)
    }

    /// The height of the text with its insets.
    public var contentHeight: CGFloat {
        guard let layoutManager = textLayoutManager else { return 0 }
        layoutManager.ensureLayout(for: layoutManager.documentRange)
        return ceil(layoutManager.usageBoundsForTextContainer.height + textContainerInset.height * 2)
    }

    // MARK: - Typing

    override public func insertText(_ string: Any, replacementRange: NSRange) {
        lastInputWasKey = true
        super.insertText(string, replacementRange: replacementRange)
        applyInputRules()
    }

    override public func insertNewline(_ sender: Any?) {
        if let event = NSApp.currentEvent, event.type == .keyDown, event.modifierFlags.contains(.shift) {
            insertLineBreak(sender)
            return
        }
        lastInputWasKey = true
        deleteSelection()
        let ns = string as NSString
        let location = selectedRange().location
        let paragraph = WriteText.paragraph(at: location, in: ns)
        let kind = kind(ofParagraph: paragraph)
        let text = ns.substring(with: paragraph)
        let atEnd = location == NSMaxRange(paragraph)

        switch kind {
        case .code, .quote:
            if text.isEmpty {
                setKind(.paragraph, paragraphAt: location)
            } else if atEnd, text.hasSuffix(kind == .quote ? "\u{2028}" : "\u{2028}\u{2028}") {
                let count = kind == .quote ? 1 : 2
                replace(NSRange(location: location - count, length: count), with: "")
                split(at: location - count, newKind: .paragraph)
            } else {
                insertLineBreak(sender)
            }
        case .bullet, .ordered, .task:
            if text.isEmpty {
                let depth = kind.listDepth ?? 0
                setKind(depth > 0 ? kind.withDepth(depth - 1) : .paragraph, paragraphAt: location)
            } else {
                var next = kind
                if case .task(_, let depth) = kind { next = .task(checked: false, depth: depth) }
                split(at: location, newKind: next)
            }
        case .heading:
            if text.isEmpty {
                setKind(.paragraph, paragraphAt: location)
            } else {
                split(at: location, newKind: atEnd ? .paragraph : kind)
            }
        default:
            split(at: location, newKind: .paragraph)
        }
    }

    override public func insertLineBreak(_ sender: Any?) {
        insertText("\u{2028}", replacementRange: NSRange(location: NSNotFound, length: 0))
    }

    override public func deleteBackward(_ sender: Any?) {
        lastInputWasKey = true
        let selection = selectedRange()
        guard selection.length == 0 else { return super.deleteBackward(sender) }
        let ns = string as NSString
        let paragraph = WriteText.paragraph(at: selection.location, in: ns)
        guard selection.location == paragraph.location else { return super.deleteBackward(sender) }
        let kind = kind(ofParagraph: paragraph)
        switch kind {
        case .bullet, .ordered, .task:
            let depth = kind.listDepth ?? 0
            setKind(depth > 0 ? kind.withDepth(depth - 1) : .paragraph, paragraphAt: selection.location)
        case .heading, .quote:
            setKind(.paragraph, paragraphAt: selection.location)
        case .code where paragraph.length == 0:
            setKind(.paragraph, paragraphAt: selection.location)
        default:
            super.deleteBackward(sender)
        }
    }

    override public func insertTab(_ sender: Any?) {
        lastInputWasKey = true
        let location = selectedRange().location
        let kind = kind(ofParagraph: WriteText.paragraph(at: location, in: string as NSString))
        if let depth = kind.listDepth {
            let previous = previousParagraphKind(at: location)?.listDepth
            guard let previous, depth <= previous else { return }
            setKind(kind.withDepth(depth + 1), paragraphAt: location)
        } else if case .code(let language) = kind {
            let two = ["css", "html", "js", "json", "jsx", "md", "ts", "tsx"].contains(language)
            insertText(two ? "  " : "    ", replacementRange: NSRange(location: NSNotFound, length: 0))
        }
    }

    override public func insertBacktab(_ sender: Any?) {
        lastInputWasKey = true
        let location = selectedRange().location
        let kind = kind(ofParagraph: WriteText.paragraph(at: location, in: string as NSString))
        if let depth = kind.listDepth, depth > 0 {
            setKind(kind.withDepth(depth - 1), paragraphAt: location)
        }
    }

    /// Esc ends the marks at the caret, so the next text is plain.
    override public func cancelOperation(_ sender: Any?) {
        var attributes = typingAttributes
        attributes.removeValue(forKey: .writeMarks)
        attributes.removeValue(forKey: .writeLink)
        if let box = attributes[.writeBlock] as? WriteBlockBox {
            typingAttributes = WriteStyle.typingAttributes(box, marks: [], link: nil)
        } else {
            typingAttributes = attributes
        }
    }

    override public func paste(_ sender: Any?) {
        pasteAsPlainText(sender)
    }

    override public func pasteAsPlainText(_ sender: Any?) {
        guard var text = NSPasteboard.general.string(forType: .string) else { return }
        text = text.replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
            .replacingOccurrences(of: "\u{2029}", with: "\n")
        insertText(text, replacementRange: NSRange(location: NSNotFound, length: 0))
    }

    override public func scrollRangeToVisible(_ range: NSRange) {
        guard !paperScrolls else { return }
        super.scrollRangeToVisible(range)
    }

    // MARK: - Shortcuts

    override public func performKeyEquivalent(with event: NSEvent) -> Bool {
        guard window?.firstResponder === self, event.type == .keyDown else {
            return super.performKeyEquivalent(with: event)
        }
        let flags = event.modifierFlags.intersection([.command, .shift, .option, .control])
        let key = event.characters(byApplyingModifiers: [])?.lowercased() ?? ""
        switch (flags, key) {
        case ([.command], "x"): cut(nil)
        case ([.command], "c"): copy(nil)
        case ([.command], "v"): paste(nil)
        case ([.command], "a"): selectAll(nil)
        case ([.command], "z"): ownUndo.undo()
        case ([.command, .shift], "z"), ([.command], "y"): ownUndo.redo()
        case ([.command], "b"): toggle(.bold)
        case ([.command], "i"): toggle(.italic)
        case ([.command], "e"): toggle(.code)
        case ([.command, .shift], "x"), ([.command, .shift], "s"): toggle(.strike)
        case ([.command, .shift], "b"): toggleKind(.quote)
        case ([.command, .shift], "7"): toggleKind(.ordered(number: 1, depth: 0))
        case ([.command, .shift], "8"): toggleKind(.bullet(depth: 0))
        case ([.command, .shift], "9"): toggleKind(.task(checked: false, depth: 0))
        case ([.command, .option], let digit) where Int(digit).map { (1...6).contains($0) } == true:
            toggleKind(.heading(Int(digit)!))
        default:
            return super.performKeyEquivalent(with: event)
        }
        return true
    }

    /// Adds a mark to the selection, or takes it away when every character
    /// has it. With no selection, the mark applies to the next text.
    public func toggle(_ mark: WriteMarks) {
        guard let textStorage else { return }
        let range = selectedRange()
        if range.length == 0 {
            var marks = WriteMarks(rawValue: (typingAttributes[.writeMarks] as? NSNumber)?.intValue ?? 0)
            marks.formSymmetricDifference(mark)
            let box = currentBox()
            let link = (typingAttributes[.writeLink] as? WriteLinkBox)?.link
            typingAttributes = WriteStyle.typingAttributes(box, marks: marks, link: link)
            return
        }
        var hasAll = true
        textStorage.enumerateAttribute(.writeMarks, in: range) { value, _, stop in
            let marks = WriteMarks(rawValue: (value as? NSNumber)?.intValue ?? 0)
            if !marks.contains(mark) {
                hasAll = false
                stop.pointee = true
            }
        }
        editAttributes(in: range) {
            textStorage.enumerateAttribute(.writeMarks, in: range) { value, run, _ in
                var marks = WriteMarks(rawValue: (value as? NSNumber)?.intValue ?? 0)
                if hasAll { marks.remove(mark) } else { marks.insert(mark) }
                if marks.isEmpty {
                    textStorage.removeAttribute(.writeMarks, range: run)
                } else {
                    textStorage.addAttribute(.writeMarks, value: NSNumber(value: marks.rawValue), range: run)
                }
            }
        }
    }

    /// Checks or unchecks the to-do item at `location`.
    public func toggleTask(at location: Int) {
        let paragraph = WriteText.paragraph(at: location, in: string as NSString)
        guard case .task(let checked, let depth) = kind(ofParagraph: paragraph) else { return }
        setKind(.task(checked: !checked, depth: depth), paragraphAt: location)
        overlay.animateTask(at: paragraph.location, checked: !checked)
    }

    private func toggleKind(_ kind: WriteBlockKind) {
        let location = selectedRange().location
        let current = self.kind(ofParagraph: WriteText.paragraph(at: location, in: string as NSString))
        let same: Bool
        switch (current, kind) {
        case (.bullet, .bullet), (.ordered, .ordered), (.task, .task): same = true
        default: same = current == kind
        }
        setKind(same ? .paragraph : kind, paragraphAt: location)
    }

    // MARK: - Pointer

    override public func mouseDown(with event: NSEvent) {
        lastInputWasKey = false
        let point = convert(event.locationInWindow, from: nil)
        if let location = overlay.task(at: point) {
            toggleTask(at: location)
            return
        }
        if event.modifierFlags.contains(.command) {
            let index = characterIndexForInsertion(at: point)
            if index < (string as NSString).length,
                let box = textStorage?.attribute(.writeLink, at: index, effectiveRange: nil) as? WriteLinkBox
            {
                onOpenLink?(box.link)
                return
            }
        }
        super.mouseDown(with: event)
    }

    // MARK: - Selection and changes

    override public func setSelectedRanges(
        _ ranges: [NSValue], affinity: NSSelectionAffinity, stillSelecting: Bool
    ) {
        super.setSelectedRanges(ranges, affinity: affinity, stillSelecting: stillSelecting)
        guard !stillSelecting else { return }
        fixTypingAttributes()
        onCaretChange?(caret)
        overlay.update()
        onLayoutChange?()
    }

    override public func didChangeText() {
        super.didChangeText()
        didChange()
    }

    private func didChange() {
        let ns = string as NSString
        if let last = WriteText.paragraphs(ns).last, last.length > 0 { trailingBox = nil }
        onTextChange?()
        onCaretChange?(caret)
        overlay.update()
        onLayoutChange?()
    }

    /// Text typed at the caret takes the block of the paragraph at the caret,
    /// not of the line break before it.
    private func fixTypingAttributes() {
        let box = currentBox()
        let location = selectedRange().location
        let ns = string as NSString
        let paragraph = WriteText.paragraph(at: min(location, ns.length), in: ns)
        var marks = WriteMarks(rawValue: (typingAttributes[.writeMarks] as? NSNumber)?.intValue ?? 0)
        var link = (typingAttributes[.writeLink] as? WriteLinkBox)?.link
        if location == paragraph.location {
            marks = paragraph.length > 0 ? WriteText.marks(at: location, in: textStorage!) : []
            link = nil
        }
        typingAttributes = WriteStyle.typingAttributes(box, marks: marks, link: link)
    }

    /// The box of the paragraph at the caret.
    private func currentBox() -> WriteBlockBox {
        let ns = string as NSString
        let paragraph = WriteText.paragraph(at: min(selectedRange().location, ns.length), in: ns)
        if paragraph.location >= ns.length, let trailingBox { return trailingBox }
        return textStorage.flatMap { WriteText.box(of: paragraph, in: $0) } ?? trailingBox
            ?? WriteBlockBox(kind: .paragraph)
    }

    func kind(ofParagraph paragraph: NSRange) -> WriteBlockKind {
        let ns = string as NSString
        if paragraph.location >= ns.length { return trailingBox?.kind ?? .paragraph }
        return textStorage.flatMap { WriteText.box(of: paragraph, in: $0)?.kind } ?? .paragraph
    }

    private func previousParagraphKind(at location: Int) -> WriteBlockKind? {
        let ns = string as NSString
        let paragraph = WriteText.paragraph(at: location, in: ns)
        guard paragraph.location > 0 else { return nil }
        return kind(ofParagraph: WriteText.paragraph(at: paragraph.location - 1, in: ns))
    }

    // MARK: - Edits

    /// Sets the kind of the paragraph at `location`, as one step of undo.
    func setKind(_ kind: WriteBlockKind, paragraphAt location: Int) {
        guard let textStorage else { return }
        let ns = string as NSString
        let paragraph = WriteText.paragraph(at: min(location, ns.length), in: ns)
        let box = (WriteText.box(of: paragraph, in: textStorage) ?? trailingBox ?? WriteBlockBox(kind: .paragraph))
            .with(kind: kind)
        let withBreak = NSRange(
            location: paragraph.location,
            length: min(paragraph.length + 1, ns.length - paragraph.location))
        if withBreak.length == 0 {
            trailingBox = box
        } else {
            editAttributes(in: withBreak) {
                textStorage.addAttribute(.writeBlock, value: box, range: withBreak)
            }
            if paragraph.length == 0, NSMaxRange(paragraph) >= ns.length { trailingBox = box }
        }
        fixTypingAttributes()
        didChange()
    }

    /// Splits the paragraph at `location`. The text after the caret goes to
    /// a new paragraph of `newKind`, and the caret goes to its start.
    private func split(at location: Int, newKind: WriteBlockKind) {
        guard let textStorage else { return }
        let ns = string as NSString
        let paragraph = WriteText.paragraph(at: location, in: ns)
        let box = WriteText.box(of: paragraph, in: textStorage) ?? trailingBox ?? WriteBlockBox(kind: .paragraph)
        let newBox = box.with(kind: newKind)
        let tail = NSRange(location: location, length: NSMaxRange(paragraph) - location)
        let replacement = NSMutableAttributedString(string: "\n", attributes: [.writeBlock: box])
        let rest = NSMutableAttributedString(attributedString: textStorage.attributedSubstring(from: tail))
        if rest.length > 0 { rest.addAttribute(.writeBlock, value: newBox, range: NSRange(location: 0, length: rest.length)) }
        replacement.append(rest)
        // The line break of the paragraph moves to the new paragraph.
        let hasBreak = NSMaxRange(paragraph) < ns.length
        let target = NSRange(location: location, length: tail.length + (hasBreak ? 1 : 0))
        if hasBreak { replacement.append(NSAttributedString(string: "\n", attributes: [.writeBlock: newBox])) }
        breakUndoCoalescing()
        guard shouldChangeText(in: target, replacementString: replacement.string) else { return }
        textStorage.replaceCharacters(in: target, with: replacement)
        if !hasBreak, rest.length == 0 { trailingBox = newBox }
        setSelectedRange(NSRange(location: location + 1, length: 0))
        didChangeText()
        if !hasBreak, rest.length == 0 { trailingBox = newBox }
        fixTypingAttributes()
    }

    private func replace(_ range: NSRange, with text: String) {
        guard let textStorage, shouldChangeText(in: range, replacementString: text) else { return }
        textStorage.replaceCharacters(in: range, with: NSAttributedString(string: text, attributes: typingAttributes))
        didChangeText()
    }

    private func editAttributes(in range: NSRange, _ change: () -> Void) {
        breakUndoCoalescing()
        guard shouldChangeText(in: range, replacementString: nil) else { return }
        textStorage?.beginEditing()
        change()
        textStorage?.endEditing()
        didChangeText()
    }

    private func deleteSelection() {
        let selection = selectedRange()
        guard selection.length > 0 else { return }
        insertText("", replacementRange: selection)
    }

    // MARK: - Input rules

    private func applyInputRules() {
        guard let textStorage else { return }
        let ns = string as NSString
        let location = selectedRange().location
        guard selectedRange().length == 0 else { return }
        let paragraph = WriteText.paragraph(at: location, in: ns)
        let prefixRange = NSRange(location: paragraph.location, length: location - paragraph.location)
        let prefix = ns.substring(with: prefixRange)
        let kind = kind(ofParagraph: paragraph)
        if let (newKind, remove) = WriteInputRules.block(prefix: prefix, kind: kind, isWholeParagraph: location == NSMaxRange(paragraph)) {
            breakUndoCoalescing()
            replace(NSRange(location: paragraph.location, length: remove), with: "")
            setKind(newKind, paragraphAt: paragraph.location)
            if newKind == .rule {
                split(at: paragraph.location, newKind: .paragraph)
            }
            return
        }
        guard !kind.isLiteral else { return }
        let marks = WriteText.marks(at: max(location - 1, 0), in: textStorage)
        guard !marks.contains(.code) || prefix.hasSuffix("`") else { return }
        guard let rule = WriteInputRules.inline(prefix: prefix) else { return }
        let match = NSRange(location: paragraph.location + rule.match.location, length: rule.match.length)
        let inner = NSRange(location: paragraph.location + rule.inner.location, length: rule.inner.length)
        let replacement = NSMutableAttributedString(attributedString: textStorage.attributedSubstring(from: inner))
        let all = NSRange(location: 0, length: replacement.length)
        switch rule.result {
        case .mark(let mark):
            replacement.enumerateAttribute(.writeMarks, in: all) { value, run, _ in
                var current = WriteMarks(rawValue: (value as? NSNumber)?.intValue ?? 0)
                current.insert(mark)
                replacement.addAttribute(.writeMarks, value: NSNumber(value: current.rawValue), range: run)
            }
        case .link(let link):
            replacement.addAttribute(.writeLink, value: WriteLinkBox(link), range: all)
        case .wiki(let target, let shown):
            replacement.replaceCharacters(in: all, with: shown)
            replacement.addAttributes(
                [.writeLink: WriteLinkBox(.wiki(target: target)), .writeBlock: currentBox()],
                range: NSRange(location: 0, length: replacement.length))
        }
        breakUndoCoalescing()
        guard shouldChangeText(in: match, replacementString: replacement.string) else { return }
        textStorage.replaceCharacters(in: match, with: replacement)
        setSelectedRange(NSRange(location: match.location + replacement.length, length: 0))
        didChangeText()
        // The text after the mark is plain, as in the Piper editor.
        typingAttributes = WriteStyle.typingAttributes(currentBox(), marks: [], link: nil)
    }

    // MARK: - Style

    /// The text storage of a text view edits on the main thread.
    nonisolated public func textStorage(
        _ textStorage: NSTextStorage, willProcessEditing editedMask: NSTextStorageEditActions,
        range editedRange: NSRange, changeInLength delta: Int
    ) {
        MainActor.assumeIsolated {
            guard !restyling else { return }
            restyle(around: editedRange)
        }
    }

    private func restyleAll() {
        guard let textStorage else { return }
        restyle(around: NSRange(location: 0, length: textStorage.length))
    }

    /// Gives every paragraph that `range` touches one block box and the look
    /// of its block, and numbers the numbered lists again.
    private func restyle(around range: NSRange) {
        guard let textStorage else { return }
        restyling = true
        defer { restyling = false }
        let ns = textStorage.string as NSString
        let paragraphs = WriteText.paragraphs(ns)
        var counters: [Int?] = []
        for (index, paragraph) in paragraphs.enumerated() {
            let withBreak = NSRange(location: paragraph.location, length: min(paragraph.length + 1, ns.length - paragraph.location))
            let box = withBreak.length > 0 ? WriteText.box(of: paragraph, in: textStorage) : nil
            let kind = box?.kind ?? .paragraph
            // The number of a numbered item counts on from the item before it.
            if let depth = kind.listDepth {
                while counters.count <= depth { counters.append(nil) }
                counters = Array(counters.prefix(depth + 1))
                if case .ordered(let number, _) = kind {
                    let value = counters[depth].map { $0 + 1 } ?? number
                    counters[depth] = value
                    if withBreak.length > 0,
                        (textStorage.attribute(.writeOrdinal, at: withBreak.location, effectiveRange: nil) as? NSNumber)?.intValue != value
                    {
                        textStorage.addAttribute(.writeOrdinal, value: NSNumber(value: value), range: withBreak)
                    }
                } else {
                    counters[depth] = nil
                }
            } else {
                counters = []
            }
            let touches =
                NSIntersectionRange(withBreak, range).length > 0 || NSLocationInRange(range.location, withBreak)
                || withBreak.location == NSMaxRange(range) || NSMaxRange(withBreak) == range.location
            guard touches, withBreak.length > 0 else { continue }
            if let box { textStorage.addAttribute(.writeBlock, value: box, range: withBreak) }
            let next = index + 1 < paragraphs.count ? WriteText.box(of: paragraphs[index + 1], in: textStorage)?.kind : nil
            WriteStyle.apply(to: textStorage, paragraph: withBreak, kind: kind, next: next, isFirst: index == 0)
        }
    }

    // MARK: - Layout

    nonisolated public func textLayoutManager(
        _ textLayoutManager: NSTextLayoutManager, textLayoutFragmentFor location: any NSTextLocation,
        in textElement: NSTextElement
    ) -> NSTextLayoutFragment {
        WriteLayoutFragment(textElement: textElement, range: textElement.elementRange)
    }

    override public func setFrameSize(_ newSize: NSSize) {
        super.setFrameSize(newSize)
        overlay.update()
    }

    override public func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        overlay.update()
    }

    override public func becomeFirstResponder() -> Bool {
        let accepted = super.becomeFirstResponder()
        overlay.update()
        return accepted
    }

    override public func resignFirstResponder() -> Bool {
        let accepted = super.resignFirstResponder()
        overlay.update()
        return accepted
    }

    /// The frame of the caret in the coordinates of the view, or nil when no
    /// layout exists.
    func caretFrame() -> CGRect? {
        guard let layoutManager = textLayoutManager, let content = layoutManager.textContentManager else { return nil }
        let location = selectedRange().location
        guard let textLocation = content.location(content.documentRange.location, offsetBy: location) else { return nil }
        var frame: CGRect?
        layoutManager.enumerateTextSegments(
            in: NSTextRange(location: textLocation), type: .standard, options: [.rangeNotRequired]
        ) { _, segment, _, _ in
            frame = segment
            return false
        }
        guard var rect = frame else { return nil }
        rect.origin.x += textContainerOrigin.x
        rect.origin.y += textContainerOrigin.y
        let font = (typingAttributes[.font] as? NSFont) ?? WriteStyle.font(.paragraph, marks: [])
        let glyphs = font.ascender - font.descender
        let height = min(glyphs * Metrics.WriteEditor.caretHeightScale, rect.height)
        let width = height * Metrics.WriteEditor.caretWidthScale + Metrics.WriteEditor.caretWidthBase
        return CGRect(x: rect.minX - width / 2, y: rect.midY - height / 2, width: width, height: height)
    }
}
