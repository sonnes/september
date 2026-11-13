import SwiftUI

/// The component library from the design system, rendered on its own so each
/// piece can be compared against the reference images.
public struct ComponentGallery: View {
    public init() {}

    private func size(_ kind: KeyKind) -> String {
        describe(Metrics.size(for: kind))
    }

    private var samples: [(title: String, note: String, view: AnyView)] {
        let standard = KeyDefinition(id: "g-a", kind: .standard, label: "A", action: .character("a"))
        let special = KeyDefinition(
            id: "g-shift", kind: .special, label: "⇧", action: .modifier(.shift)
        )
        let function = KeyDefinition(
            id: "g-esc", kind: .function, label: "esc", action: .virtual(.escape)
        )
        let dual = KeyDefinition(
            id: "g-1", kind: .dual, label: "1", secondaryLabel: "!", action: .character("1")
        )
        let copy = PanelButton(
            id: "g-copy", label: "Copy", symbol: nil,
            action: .shortcut(Shortcut(modifiers: .command, key: .character("c")))
        )
        let phrase = PanelButton(
            id: "g-phrase", label: "Be right back", symbol: nil, action: .text("Be right back")
        )
        let buttonSize = CGSize(
            width: Metrics.Keypad.buttonWidth, height: Metrics.Keypad.buttonHeight)

        return [
            (
                "Key / Standard", "Primary alphanumeric key. \(size(.standard)).",
                AnyView(KeyView(key: standard, face: standard.face(under: ModifierState())) {})
            ),
            (
                "Key / Special", "Modifier and utility keys. \(size(.special)), flexible width.",
                AnyView(KeyView(key: special, face: special.face(under: ModifierState())) {})
            ),
            (
                "Key / Function", "Function row keys. \(size(.function)).",
                AnyView(KeyView(key: function, face: function.face(under: ModifierState())) {})
            ),
            (
                "Key / Dual", "Two-label key with primary and secondary glyphs. \(size(.dual)).",
                AnyView(KeyView(key: dual, face: dual.face(under: ModifierState())) {})
            ),
            (
                "Shortcut / Keys", "Keys only; the name shows on hover. \(describe(buttonSize)).",
                AnyView(ShortcutButtonView(button: copy) {})
            ),
            (
                "Shortcut / Text", "The text it types, across two columns.",
                AnyView(ShortcutButtonView(button: phrase, width: Metrics.Keypad.width) {})
            ),
        ]
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Gallery.spacing) {
            VStack(alignment: .leading, spacing: Gallery.headerSpacing) {
                Text("Component Library")
                    .font(Gallery.title)
                    .foregroundStyle(Color(Tokens.keyText))
                Text("Reusable building blocks for the keyboard system.")
                    .font(Gallery.caption)
                    .foregroundStyle(Color(Tokens.labelSecondary))
            }

            LazyVGrid(
                columns: Array(
                    repeating: GridItem(
                        .fixed(Gallery.columnWidth), spacing: Gallery.columnSpacing),
                    count: Gallery.columns),
                alignment: .leading,
                spacing: Gallery.spacing
            ) {
                ForEach(Array(samples.enumerated()), id: \.offset) { _, sample in
                    HStack(alignment: .top, spacing: Gallery.sampleSpacing) {
                        VStack(alignment: .leading, spacing: Gallery.noteSpacing) {
                            Text(sample.title)
                                .font(Gallery.sampleTitle)
                                .foregroundStyle(Color(Tokens.keyText))
                            Text(sample.note)
                                .font(Gallery.note)
                                .foregroundStyle(Color(Tokens.labelSecondary))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(width: Gallery.noteWidth, alignment: .leading)
                        Spacer(minLength: 0)
                        sample.view
                    }
                }
            }
        }
        .padding(Gallery.padding)
        .frame(width: Gallery.width, alignment: .leading)
        .background(Color(Tokens.background))
    }
}

/// The sizes and fonts of the component library page.
private enum Gallery {
    static let width: CGFloat = 1120
    static let padding: CGFloat = 40
    static let spacing: CGFloat = 28
    static let headerSpacing: CGFloat = 6
    static let columns = 3
    static let columnWidth: CGFloat = 300
    static let columnSpacing: CGFloat = 24
    static let sampleSpacing: CGFloat = 16
    static let noteSpacing: CGFloat = 4
    static let noteWidth: CGFloat = 150

    static let title = Font.system(size: 24, weight: .semibold, design: .monospaced)
    static let caption = Font.system(size: 12)
    static let sampleTitle = Font.system(size: 12, weight: .medium, design: .monospaced)
    static let note = Font.system(size: 10)
}

/// "48×48", as the component library writes a size.
private func describe(_ size: CGSize) -> String {
    "\(Int(size.width))×\(Int(size.height))"
}
