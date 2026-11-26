import SwiftUI

/// The QWERTY block: the rows of `KeyboardLayout` across the keyboard width,
/// under an optional header such as the word completions.
public struct MainKeyboardView<Header: View>: View {
    @EnvironmentObject private var controller: KeyboardController

    private let header: Header

    public init(@ViewBuilder header: () -> Header) {
        self.header = header()
    }

    private var width: CGFloat { Metrics.keyboardWidth }
    private var spacing: CGFloat { Metrics.rowSpacing }

    public var body: some View {
        VStack(spacing: spacing) {
            header
                .frame(width: width)
            ForEach(KeyboardLayout.rows(keySize: controller.keySize)) { row in
                rowView(row)
            }
        }
        .padding(Metrics.Keyboard.padding)
        .panelSurface(cornerRadius: Metrics.keyboardCornerRadius)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Keyboard")
    }

    @ViewBuilder
    private func rowView(_ row: KeyRow) -> some View {
        let widths = KeyboardLayout.widths(for: row, totalWidth: width, spacing: spacing)
        let tint = controller.style.tint(for: row.id)

        HStack(spacing: spacing) {
            ForEach(Array(row.keys.enumerated()), id: \.element.id) { index, key in
                KeyView(
                    key: key,
                    tint: tint,
                    face: key.face(under: controller.modifiers),
                    width: widths[index],
                    hold: KeyHold(
                        behavior: { controller.holdBehavior(for: key) },
                        again: { controller.repeatPress(key) },
                        choices: { controller.showAccents($0) })
                ) {
                    controller.press(key)
                }
            }
        }
        .overlay(alignment: .leading) {
            if controller.style.drawsRowAccent {
                Rectangle()
                    .fill(Color(tint.opacity(Metrics.Keyboard.rowAccentOpacity)))
                    .frame(width: Metrics.Keyboard.rowAccentWidth)
                    .offset(x: Metrics.Keyboard.rowAccentOffset)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(row.id.rawValue) row")
    }
}

extension MainKeyboardView where Header == EmptyView {
    public init() {
        self.init { EmptyView() }
    }
}
