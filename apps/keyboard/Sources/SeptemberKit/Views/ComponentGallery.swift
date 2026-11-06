import SwiftUI

/// The component library from the design system, rendered on its own so each
/// piece can be compared against the reference images.
public struct ComponentGallery: View {
    public init() {}

    private func size(_ kind: KeyKind) -> String {
        Metrics.describe(Metrics.size(for: kind))
    }

    private var samples: [(title: String, note: String, view: AnyView)] {
        let standard = KeyDefinition(id: "g-a", kind: .standard, label: "A", action: .character("a"))
        let special = KeyDefinition(
            id: "g-shift", kind: .special, label: "shift", action: .modifier(.shift)
        )
        let function = KeyDefinition(
            id: "g-esc", kind: .function, label: "esc", action: .virtual(.escape)
        )
        let dual = KeyDefinition(
            id: "g-1", kind: .dual, label: "1", secondaryLabel: "!", action: .character("1")
        )
        let copy = PanelButton(
            id: "g-copy", label: "Copy", symbol: "doc.on.doc",
            action: .shortcut(Shortcut(modifiers: .command, key: .character("c")))
        )

        return [
            (
                "Key / Standard", "Primary alphanumeric key. \(size(.standard)).",
                AnyView(KeyView(key: standard) {})
            ),
            (
                "Key / Special", "Modifier and utility keys. \(size(.special)), flexible width.",
                AnyView(KeyView(key: special) {})
            ),
            (
                "Key / Function", "Function row keys. \(size(.function)).",
                AnyView(KeyView(key: function) {})
            ),
            (
                "Key / Dual", "Two-label key with primary and secondary glyphs. \(size(.dual)).",
                AnyView(KeyView(key: dual) {})
            ),
            (
                "Shortcut / Button", "Icon plus key hint. \(Metrics.describe(Metrics.shortcutButton)).",
                AnyView(ShortcutButtonView(button: copy) {})
            ),
            (
                "Shortcut / Full", "Icon, name and key hint. \(Metrics.describe(Metrics.shortcutFull)).",
                AnyView(ShortcutFullView(button: copy) {})
            ),
        ]
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Metrics.Gallery.spacing) {
            VStack(alignment: .leading, spacing: Metrics.Gallery.headerSpacing) {
                Text("Component Library")
                    .font(Typography.galleryTitle)
                    .foregroundStyle(Color(Tokens.keyText))
                Text("Reusable building blocks for the keyboard system.")
                    .font(Typography.galleryCaption)
                    .foregroundStyle(Color(Tokens.labelSecondary))
            }

            LazyVGrid(
                columns: Array(
                    repeating: GridItem(
                        .fixed(Metrics.Gallery.columnWidth), spacing: Metrics.Gallery.columnSpacing),
                    count: Metrics.Gallery.columns),
                alignment: .leading,
                spacing: Metrics.Gallery.spacing
            ) {
                ForEach(Array(samples.enumerated()), id: \.offset) { _, sample in
                    HStack(alignment: .top, spacing: Metrics.Gallery.sampleSpacing) {
                        VStack(alignment: .leading, spacing: Metrics.Gallery.noteSpacing) {
                            Text(sample.title)
                                .font(Typography.gallerySampleTitle)
                                .foregroundStyle(Color(Tokens.keyText))
                            Text(sample.note)
                                .font(Typography.galleryNote)
                                .foregroundStyle(Color(Tokens.labelSecondary))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(width: Metrics.Gallery.noteWidth, alignment: .leading)
                        Spacer(minLength: 0)
                        sample.view
                    }
                }
            }
        }
        .padding(Metrics.Gallery.padding)
        .frame(width: Metrics.Gallery.width, alignment: .leading)
        .background(Color(Tokens.background))
    }
}
