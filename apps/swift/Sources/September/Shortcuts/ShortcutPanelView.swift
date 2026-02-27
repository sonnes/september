import SwiftUI

struct ShortcutPanelView: View {
    let sections: [ShortcutSection]

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            ForEach(sections) { section in
                sectionView(section)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 6)
        .background(Color(nsColor: NSColor(white: 0.88, alpha: 0.98)))
    }

    @ViewBuilder
    private func sectionView(_ section: ShortcutSection) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(section.title)
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            let columns = [GridItem(.fixed(36), spacing: 3), GridItem(.fixed(36), spacing: 3), GridItem(.fixed(36), spacing: 3)]
            LazyVGrid(columns: columns, spacing: 3) {
                ForEach(section.shortcuts) { shortcut in
                    ShortcutButton(shortcut: shortcut) {
                        EventInjector.shared.send(
                            keyCode: shortcut.keyCode,
                            modifiers: shortcut.modifiers
                        )
                    }
                }
            }

            Spacer()
        }
    }
}
