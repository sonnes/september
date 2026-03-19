import AppKit
import SwiftUI

// MARK: - MarkdownTextView
//
// NSViewRepresentable wrapping NSTextView for markdown editing.
//
// Features:
//   - Markdown syntax highlighting (headings, bold, italic, code, links)
//   - Focus mode dimming (sentence, paragraph, typewriter)
//   - Part-of-speech coloring (via TextAnalyzer)
//   - Style check highlighting (fillers, clichés, redundancies)
//   - JetBrains Mono 16px, line height 2×
//   - 72px left/right padding, 40px top/bottom
//
// Data flow:
//   SwiftUI @Binding text ←→ NSTextView.textStorage
//   WriterState.focusMode → dimming attributes
//   WriterState.showSyntax → part-of-speech colors
//   WriterState.styleCheck* → underline highlights

struct MarkdownTextView: NSViewRepresentable {
    @Binding var text: String
    var writerState: WriterState
    var onCursorChange: ((Int) -> Void)?

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSScrollView()
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.autohidesScrollers = true
        scrollView.drawsBackground = false

        let textView = NSTextView()
        textView.delegate = context.coordinator
        textView.isEditable = true
        textView.isSelectable = true
        textView.allowsUndo = true
        textView.isRichText = false
        textView.usesFindPanel = true
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.isAutomaticTextReplacementEnabled = false
        textView.drawsBackground = false

        // Typography: JetBrains Mono 16px
        let font = NSFont(name: "JetBrains Mono", size: 16)
            ?? NSFont.monospacedSystemFont(ofSize: 16, weight: .regular)
        textView.font = font
        textView.textColor = NSColor.labelColor

        // Line height 2× via paragraph style
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineSpacing = 16  // Extra spacing for 2× line height at 16px
        textView.defaultParagraphStyle = paragraphStyle
        textView.typingAttributes = [
            .font: font,
            .foregroundColor: NSColor.labelColor,
            .paragraphStyle: paragraphStyle,
        ]

        // Padding: 72px left/right, 40px top/bottom
        textView.textContainerInset = NSSize(width: 72, height: 40)
        textView.textContainer?.widthTracksTextView = true
        textView.textContainer?.containerSize = NSSize(
            width: 0, height: CGFloat.greatestFiniteMagnitude)

        textView.autoresizingMask = [.width]
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false

        scrollView.documentView = textView
        context.coordinator.textView = textView

        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard let textView = scrollView.documentView as? NSTextView else { return }

        // Update text if changed externally
        if textView.string != text {
            let selection = textView.selectedRange()
            textView.string = text
            textView.setSelectedRange(selection)
        }

        // Apply markdown highlighting + focus mode + syntax/style
        context.coordinator.applyHighlighting(textView: textView, state: writerState)

        // Typewriter mode: scroll current line to center
        if writerState.focusMode == .typewriter {
            context.coordinator.scrollToCenter(textView: textView)
        }
    }

    // MARK: - Coordinator

    @MainActor
    final class Coordinator: NSObject, NSTextViewDelegate {
        var parent: MarkdownTextView
        weak var textView: NSTextView?

        init(parent: MarkdownTextView) {
            self.parent = parent
        }

        func textDidChange(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }
            parent.text = textView.string
            applyHighlighting(textView: textView, state: parent.writerState)
        }

        func textViewDidChangeSelection(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }
            let cursorPosition = textView.selectedRange().location
            parent.onCursorChange?(cursorPosition)

            // Re-apply focus mode when cursor moves
            if parent.writerState.focusMode != .disabled {
                applyHighlighting(textView: textView, state: parent.writerState)
            }
        }

        // MARK: - Highlighting

        func applyHighlighting(textView: NSTextView, state: WriterState) {
            guard let textStorage = textView.textStorage else { return }
            let text = textView.string
            let fullRange = NSRange(location: 0, length: (text as NSString).length)
            guard fullRange.length > 0 else { return }

            textStorage.beginEditing()

            // Reset to base style
            let font = NSFont(name: "JetBrains Mono", size: 16)
                ?? NSFont.monospacedSystemFont(ofSize: 16, weight: .regular)
            let paragraphStyle = NSMutableParagraphStyle()
            paragraphStyle.lineSpacing = 16

            textStorage.addAttributes([
                .font: font,
                .foregroundColor: NSColor.labelColor,
                .paragraphStyle: paragraphStyle,
                .underlineStyle: 0,
                .backgroundColor: NSColor.clear,
            ], range: fullRange)

            // Markdown syntax highlighting
            applyMarkdownHighlighting(textStorage: textStorage, text: text)

            // Focus mode dimming
            if state.focusMode != .disabled {
                applyFocusMode(
                    textStorage: textStorage, text: text,
                    mode: state.focusMode, cursorPosition: textView.selectedRange().location)
            }

            // Part-of-speech coloring
            if state.showSyntax {
                applySyntaxColoring(textStorage: textStorage, text: text)
            }

            // Style check highlights
            if state.styleCheckEnabled {
                applyStyleCheck(textStorage: textStorage, text: text, state: state)
            }

            textStorage.endEditing()
        }

        // MARK: Markdown Highlighting

        private func applyMarkdownHighlighting(textStorage: NSTextStorage, text: String) {
            let nsText = text as NSString

            // Headings: lines starting with # (1-6)
            let headingPattern = "^(#{1,6})\\s+(.+)$"
            if let regex = try? NSRegularExpression(pattern: headingPattern, options: .anchorsMatchLines) {
                for match in regex.matches(in: text, range: NSRange(location: 0, length: nsText.length)) {
                    let hashRange = match.range(at: 1)
                    let level = hashRange.length
                    let lineRange = match.range
                    let size: CGFloat = max(16, 28 - CGFloat(level) * 2)
                    let headingFont = NSFont(name: "JetBrains Mono", size: size)?.bold()
                        ?? NSFont.monospacedSystemFont(ofSize: size, weight: .bold)
                    textStorage.addAttribute(.font, value: headingFont, range: lineRange)
                    // Dim the hash marks
                    textStorage.addAttribute(
                        .foregroundColor, value: NSColor.tertiaryLabelColor, range: hashRange)
                }
            }

            // Bold: **text** or __text__
            applyInlinePattern(
                "\\*\\*(.+?)\\*\\*|__(.+?)__", textStorage: textStorage, text: text,
                attribute: .font,
                value: (NSFont(name: "JetBrains Mono", size: 16)?.bold()
                    ?? NSFont.monospacedSystemFont(ofSize: 16, weight: .bold)))

            // Italic: *text* or _text_ (but not ** or __)
            applyInlinePattern(
                "(?<!\\*)\\*(?!\\*)(.+?)(?<!\\*)\\*(?!\\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)",
                textStorage: textStorage, text: text,
                attribute: .obliqueness,
                value: NSNumber(value: 0.2))

            // Inline code: `text`
            let codePattern = "`([^`]+)`"
            if let regex = try? NSRegularExpression(pattern: codePattern) {
                for match in regex.matches(
                    in: text, range: NSRange(location: 0, length: nsText.length))
                {
                    textStorage.addAttribute(
                        .backgroundColor,
                        value: NSColor.quaternaryLabelColor,
                        range: match.range)
                    textStorage.addAttribute(
                        .foregroundColor,
                        value: NSColor.systemPink,
                        range: match.range)
                }
            }

            // Block quotes: lines starting with >
            let quotePattern = "^>\\s?(.*)$"
            if let regex = try? NSRegularExpression(pattern: quotePattern, options: .anchorsMatchLines) {
                for match in regex.matches(
                    in: text, range: NSRange(location: 0, length: nsText.length))
                {
                    textStorage.addAttribute(
                        .foregroundColor,
                        value: NSColor.secondaryLabelColor,
                        range: match.range)
                }
            }

            // Links: [text](url)
            let linkPattern = "\\[([^\\]]+)\\]\\(([^)]+)\\)"
            if let regex = try? NSRegularExpression(pattern: linkPattern) {
                for match in regex.matches(
                    in: text, range: NSRange(location: 0, length: nsText.length))
                {
                    let textRange = match.range(at: 1)
                    textStorage.addAttribute(
                        .foregroundColor, value: NSColor.systemBlue, range: textRange)
                    textStorage.addAttribute(
                        .underlineStyle,
                        value: NSUnderlineStyle.single.rawValue,
                        range: textRange)
                }
            }

            // Checkbox: - [ ] or - [x]
            let checkboxPattern = "^- \\[([ x])\\]"
            if let regex = try? NSRegularExpression(
                pattern: checkboxPattern, options: .anchorsMatchLines)
            {
                for match in regex.matches(
                    in: text, range: NSRange(location: 0, length: nsText.length))
                {
                    textStorage.addAttribute(
                        .foregroundColor,
                        value: NSColor.systemGreen,
                        range: match.range)
                }
            }
        }

        private func applyInlinePattern(
            _ pattern: String, textStorage: NSTextStorage, text: String,
            attribute: NSAttributedString.Key, value: Any
        ) {
            guard let regex = try? NSRegularExpression(pattern: pattern) else { return }
            let nsText = text as NSString
            for match in regex.matches(
                in: text, range: NSRange(location: 0, length: nsText.length))
            {
                textStorage.addAttribute(attribute, value: value, range: match.range)
            }
        }

        // MARK: Focus Mode

        private func applyFocusMode(
            textStorage: NSTextStorage, text: String,
            mode: FocusMode, cursorPosition: Int
        ) {
            let nsText = text as NSString
            let fullRange = NSRange(location: 0, length: nsText.length)
            let dimColor = NSColor(calibratedWhite: 0.78, alpha: 1.0)  // #C8C8C8

            // Dim everything first
            textStorage.addAttribute(.foregroundColor, value: dimColor, range: fullRange)

            // Find the active range based on mode
            let activeRange: NSRange
            switch mode {
            case .disabled:
                return
            case .sentence:
                activeRange = sentenceRange(in: text, at: cursorPosition)
            case .paragraph:
                activeRange = paragraphRange(in: text, at: cursorPosition)
            case .typewriter:
                activeRange = lineRange(in: text, at: cursorPosition)
            }

            // Restore active text to full color
            if activeRange.length > 0 && NSMaxRange(activeRange) <= nsText.length {
                textStorage.addAttribute(
                    .foregroundColor, value: NSColor.labelColor, range: activeRange)
            }
        }

        private func sentenceRange(in text: String, at position: Int) -> NSRange {
            guard !text.isEmpty, position <= (text as NSString).length else {
                return NSRange(location: 0, length: 0)
            }
            let nsText = text as NSString
            let clampedPos = min(position, nsText.length - 1)

            // Find sentence boundaries using linguistic tagger
            var sentenceStart = 0
            var sentenceEnd = nsText.length

            nsText.enumerateSubstrings(
                in: NSRange(location: 0, length: nsText.length),
                options: [.bySentences, .substringNotRequired]
            ) { _, range, _, stop in
                if NSLocationInRange(clampedPos, range) {
                    sentenceStart = range.location
                    sentenceEnd = NSMaxRange(range)
                    stop.pointee = true
                }
            }

            return NSRange(location: sentenceStart, length: sentenceEnd - sentenceStart)
        }

        private func paragraphRange(in text: String, at position: Int) -> NSRange {
            let nsText = text as NSString
            guard nsText.length > 0 else { return NSRange(location: 0, length: 0) }
            let clampedPos = min(position, nsText.length)
            return nsText.paragraphRange(for: NSRange(location: clampedPos, length: 0))
        }

        private func lineRange(in text: String, at position: Int) -> NSRange {
            let nsText = text as NSString
            guard nsText.length > 0 else { return NSRange(location: 0, length: 0) }
            let clampedPos = min(position, nsText.length)
            return nsText.lineRange(for: NSRange(location: clampedPos, length: 0))
        }

        // MARK: Syntax Coloring

        private static let syntaxColors: [TextAnalyzer.SpeechCategory: NSColor] = [
            .adjective: .systemBlue,
            .noun: .systemPink,
            .adverb: .systemGreen,
            .verb: .systemOrange,
            .conjunction: .systemPurple,
        ]

        private func applySyntaxColoring(textStorage: NSTextStorage, text: String) {
            let tags = TextAnalyzer.tagPartsOfSpeech(in: text)
            for tag in tags {
                if let color = Self.syntaxColors[tag.category] {
                    textStorage.addAttribute(.foregroundColor, value: color, range: tag.range)
                }
            }
        }

        // MARK: Style Check

        private func applyStyleCheck(
            textStorage: NSTextStorage, text: String, state: WriterState
        ) {
            let underlineColor = NSColor.systemYellow

            if state.styleCheckFillers {
                for range in TextAnalyzer.findFillers(in: text) {
                    textStorage.addAttributes([
                        .underlineStyle: NSUnderlineStyle.thick.rawValue,
                        .underlineColor: underlineColor,
                    ], range: range)
                }
            }

            if state.styleCheckCliches {
                for range in TextAnalyzer.findCliches(in: text) {
                    textStorage.addAttributes([
                        .underlineStyle: NSUnderlineStyle.thick.rawValue,
                        .underlineColor: NSColor.systemOrange,
                    ], range: range)
                }
            }

            if state.styleCheckRedundancies {
                for range in TextAnalyzer.findRedundancies(in: text) {
                    textStorage.addAttributes([
                        .underlineStyle: NSUnderlineStyle.thick.rawValue,
                        .underlineColor: NSColor.systemRed,
                    ], range: range)
                }
            }
        }

        // MARK: Typewriter Scroll

        func scrollToCenter(textView: NSTextView) {
            guard let layoutManager = textView.layoutManager,
                let textContainer = textView.textContainer
            else { return }

            let glyphRange = layoutManager.glyphRange(
                forCharacterRange: textView.selectedRange(), actualCharacterRange: nil)
            let rect = layoutManager.boundingRect(
                forGlyphRange: glyphRange, in: textContainer)

            let visibleHeight = textView.enclosingScrollView?.contentView.bounds.height ?? 0
            let targetY = rect.midY - visibleHeight / 2
            textView.enclosingScrollView?.contentView.scroll(
                to: NSPoint(x: 0, y: max(0, targetY)))
        }
    }
}

// MARK: - NSFont Extension

private extension NSFont {
    func bold() -> NSFont {
        NSFontManager.shared.convert(self, toHaveTrait: .boldFontMask)
    }
}
