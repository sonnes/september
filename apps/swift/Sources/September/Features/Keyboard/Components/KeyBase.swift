import SwiftUI

/// Shared key view handling button interaction, visual states, shadow, stroke,
/// glow, dwell, and accessibility. All key types route through this view
/// with different KeyAppearance configs and label content.
struct KeyBase<Label: View>: View {
    let appearance: KeyAppearance
    let accessibilityText: String
    let onPress: () -> Void
    @ViewBuilder let label: () -> Label

    @State private var isHovered = false
    @State private var isPressed = false

    var body: some View {
        ZStack {
            // Fill
            RoundedRectangle(cornerRadius: DesignColors.kbCornerRadius)
                .fill(fillColor)

            // Glow
            if appearance.glowOpacity > 0 {
                RoundedRectangle(cornerRadius: DesignColors.kbCornerRadius)
                    .fill(Color.white.opacity(appearance.glowOpacity))
                    .blur(radius: appearance.glowRadius)
            }

            // Stroke
            RoundedRectangle(cornerRadius: DesignColors.kbCornerRadius)
                .strokeBorder(appearance.strokeColor, lineWidth: 1)

            // Label content
            label()
        }
        .frame(width: appearance.width, height: appearance.height)
        .shadow(
            color: DesignColors.keyStandardShadow,
            radius: appearance.shadowRadius,
            y: appearance.shadowY
        )
        .onTapGesture {
            isPressed = true
            onPress()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                isPressed = false
            }
        }
        .dwell(cornerRadius: DesignColors.kbCornerRadius, isHovered: $isHovered, action: onPress)
        .accessibilityLabel(accessibilityText)
    }

    private var fillColor: Color {
        if isPressed {
            return appearance.fillColor.opacity(0.6)
        } else if isHovered {
            return appearance.fillColor.opacity(0.8)
        }
        return appearance.fillColor
    }
}
