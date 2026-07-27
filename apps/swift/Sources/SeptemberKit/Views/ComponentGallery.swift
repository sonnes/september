import SwiftUI

/// The component library from the design system, rendered on its own so each
/// piece can be compared against the reference images.
public struct ComponentGallery: View {
    @EnvironmentObject private var controller: KeyboardController

    public init() {}

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
                "Key / Standard", "Primary alphanumeric key. 48×48.",
                AnyView(KeyView(key: standard) {})
            ),
            (
                "Key / Special", "Modifier and utility keys. 60×48, flexible width.",
                AnyView(KeyView(key: special) {})
            ),
            (
                "Key / Function", "Function row keys. 60×32.",
                AnyView(KeyView(key: function) {})
            ),
            (
                "Key / Dual", "Two-label key with primary and secondary glyphs. 48×48.",
                AnyView(KeyView(key: dual) {})
            ),
            (
                "Shortcut / Button", "Icon plus key hint. 120×40.",
                AnyView(ShortcutButtonView(button: copy) {})
            ),
            (
                "Shortcut / Full", "Icon, name and key hint. 160×36.",
                AnyView(ShortcutFullView(button: copy) {})
            ),
        ]
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Component Library")
                    .font(.system(size: 24, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color(Tokens.keyText))
                Text("Reusable building blocks for the keyboard system.")
                    .font(.system(size: 12))
                    .foregroundStyle(Color(Tokens.labelSecondary))
            }

            LazyVGrid(
                columns: Array(repeating: GridItem(.fixed(300), spacing: 24), count: 3),
                alignment: .leading,
                spacing: 28
            ) {
                ForEach(Array(samples.enumerated()), id: \.offset) { _, sample in
                    HStack(alignment: .top, spacing: 16) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(sample.title)
                                .font(.system(size: 12, weight: .medium, design: .monospaced))
                                .foregroundStyle(Color(Tokens.keyText))
                            Text(sample.note)
                                .font(.system(size: 10))
                                .foregroundStyle(Color(Tokens.labelSecondary))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(width: 150, alignment: .leading)
                        Spacer(minLength: 0)
                        sample.view
                    }
                }
            }
        }
        .padding(40)
        .frame(width: 1120, alignment: .leading)
        .background(Color(Tokens.background))
    }
}
