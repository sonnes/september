import SwiftUI

/// The QWERTY block: six rows filling the 980pt keyboard width.
public struct MainKeyboardView: View {
    @EnvironmentObject private var controller: KeyboardController

    private let width: CGFloat

    public init(width: CGFloat = Metrics.keyboardWidth) {
        self.width = width
    }

    public var body: some View {
        VStack(spacing: Metrics.rowSpacing) {
            ForEach(KeyboardLayout.rows) { row in
                rowView(row)
            }
        }
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color(Tokens.panelBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color(Tokens.panelStroke), lineWidth: 1)
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Keyboard")
    }

    @ViewBuilder
    private func rowView(_ row: KeyRow) -> some View {
        let widths = KeyboardLayout.widths(for: row, totalWidth: width)
        let tint = controller.style.tint(for: row.id)

        HStack(spacing: Metrics.rowSpacing) {
            ForEach(Array(row.keys.enumerated()), id: \.element.id) { index, key in
                KeyView(
                    key: key,
                    tint: tint,
                    isActive: isActive(key),
                    width: widths[index]
                ) {
                    controller.press(key)
                }
            }
        }
        .overlay(alignment: .leading) {
            if controller.style.drawsRowAccent {
                Rectangle()
                    .fill(Color(tint.opacity(0.5)))
                    .frame(width: 2)
                    .offset(x: -5)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(row.id.rawValue) row")
    }

    /// Latched and locked modifiers light up, so the user can see the state
    /// they are about to type in.
    private func isActive(_ key: KeyDefinition) -> Bool {
        guard case .modifier(let modifier) = key.action else { return false }
        return controller.modifiers.active.contains(modifier)
    }
}
