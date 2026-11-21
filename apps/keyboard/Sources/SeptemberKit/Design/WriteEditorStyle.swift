import Foundation

/// The look of the editor page on the Write paper, as CSS that the keyboard
/// adds to the page.
///
/// The colours come from `Tokens` in both appearances, and the sizes from
/// `Metrics.WriteEditor`. The body is the serif of the page, with sans-serif
/// headings, in a text column of `textWidth`. The rules also hide the parts
/// of Piper and Hubble.md that Write does not use: the byline, the selection
/// bar, the margin cards, the properties of the front matter, and the status
/// bar with the word count.
public enum WriteEditorStyle {
    typealias Size = Metrics.WriteEditor

    public static var css: String {
        """
        @media (prefers-color-scheme: light) { :root, :root.dark { \(colors(dark: false)) } }
        @media (prefers-color-scheme: dark) { :root, :root.dark { \(colors(dark: true)) } }

        html, body, #root, [data-hubble-editor], [data-hubble-editor] .editorViewport,
        [data-hubble-editor] .pm-task-checkbox-box { background: transparent; }
        .piper-header, .piper-selbar, .piper-card-slot, .editorPropertiesPanel,
        [data-hubble-editor] > .editorViewport ~ :last-child { display: none !important; }

        ::selection { background: var(--write-selection); }

        [data-hubble-editor] .editorViewport {
          --editor-content-max-inline-size: \(px(Size.textWidth + 2 * Size.sideMargin));
          --editor-content-padding-inline: \(px(Size.sideMargin));
        }
        [data-hubble-editor] .ProseMirror {
          padding-block-start: \(px(Size.paperMargin));
          color: var(--write-text);
          font-size: \(px(Size.textSize));
          line-height: \(Size.lineHeight);
          caret-color: var(--write-accent);
          text-rendering: optimizeLegibility;
          font-kerning: normal;
          hanging-punctuation: first;
          -webkit-font-smoothing: antialiased;
        }
        [data-hubble-editor] .ProseMirror p { margin-block: 0 \(em(Size.blockGap)); }

        [data-hubble-editor] .ProseMirror :is(h1, h2, h3, h4, h5, h6) {
          font-family: var(--piper-sans);
          font-weight: 650;
          color: var(--write-text);
          letter-spacing: -0.01em;
          margin-block: \(em(Size.headingSpaceBefore)) \(em(Size.blockGap / 2));
        }
        [data-hubble-editor] .ProseMirror > :is(h1, h2, h3, h4, h5, h6):first-child { margin-block-start: 0; }
        [data-hubble-editor] .ProseMirror h1 {
          font-size: \(em(Size.headingScale[0])); line-height: 1.15; letter-spacing: -0.022em; font-weight: 700;
        }
        [data-hubble-editor] .ProseMirror h2 { font-size: \(em(Size.headingScale[1])); line-height: 1.25; }
        [data-hubble-editor] .ProseMirror h3 { font-size: \(em(Size.headingScale[2])); line-height: 1.3; }
        [data-hubble-editor] .ProseMirror :is(h4, h5, h6) {
          font-size: \(em(Size.headingScale[3])); line-height: 1.4; color: var(--write-muted);
        }

        [data-hubble-editor] .ProseMirror :is(ul, ol) { margin-block: 0 \(em(Size.blockGap)); }
        [data-hubble-editor] .ProseMirror { --editor-list-gap: \(em(Size.listGap)); }
        [data-hubble-editor] .ProseMirror li p { margin: 0; }
        [data-hubble-editor] .ProseMirror li::marker { color: var(--write-muted); }
        [data-hubble-editor] .ProseMirror li[data-checked="true"] > div { color: var(--write-muted); }

        [data-hubble-editor] .ProseMirror blockquote {
          margin-block: 0 \(em(Size.blockGap));
          padding-inline-start: \(px(Size.quoteIndent));
          border-inline-start: \(px(Size.quoteBarWidth)) solid var(--write-rule);
          color: var(--write-muted);
          font-style: italic;
        }

        [data-hubble-editor] .ProseMirror :is(a, span[data-link="true"]) {
          color: var(--write-accent);
          text-decoration-thickness: 1px;
          text-underline-offset: 0.18em;
        }
        [data-hubble-editor] .ProseMirror :not(pre) > code {
          font-size: \(em(Size.codeScale));
          background: var(--write-tint);
          border-radius: \(px(Size.codeCornerRadius / 2));
          padding: 0.1em 0.3em;
        }
        [data-hubble-editor] .ProseMirror pre {
          font-size: \(em(Size.codeScale));
          background: var(--write-tint);
          border-radius: \(px(Size.codeCornerRadius));
          margin-block: 0 \(em(Size.blockGap));
        }
        [data-hubble-editor] .ProseMirror hr {
          border: 0;
          border-block-start: \(px(Size.ruleThickness)) solid var(--write-rule);
          margin-block: \(em(Size.headingSpaceBefore));
        }
        """
    }

    /// The tokens of one appearance, and the variables of Piper and Hubble.md
    /// that take them.
    private static func colors(dark: Bool) -> String {
        let pairs: [(String, ThemeColor)] = [
            ("--write-text", Tokens.keyText),
            ("--write-muted", Tokens.labelSecondary),
            ("--write-accent", Tokens.accent),
            ("--write-selection", Tokens.selection),
            ("--write-rule", Tokens.strokeStandard),
            ("--write-tint", Tokens.writeCodeTint),
        ]
        let own = pairs.map { "\($0.0): \(css($0.1.resolved(dark: dark)));" }
        let page = [
            "--foreground: var(--write-text);",
            "--muted-foreground: var(--write-muted);",
            "--piper-accent: var(--write-accent);",
            "--brand: var(--write-accent);",
            "--primary: var(--write-accent);",
            "--ring: var(--write-accent);",
            "--selected: var(--write-selection);",
            "--border: var(--write-rule);",
            "--piper-code: var(--write-tint);",
        ]
        return (own + page).joined(separator: " ")
    }

    private static func css(_ color: RGBA) -> String {
        func channel(_ value: Double) -> Int { Int((value * 255).rounded()) }
        return "rgb(\(channel(color.red)) \(channel(color.green)) \(channel(color.blue)) / \(color.alpha))"
    }

    private static func px(_ value: CGFloat) -> String { "\(Double(value))px" }
    private static func em(_ value: CGFloat) -> String { "\(Double(value))em" }
}
