import SwiftUI

/// Persistent banner shown when Accessibility permission is not granted.
/// Tapping opens System Settings. Dismisses reactively when permission is granted.
struct AccessibilityBanner: View {
    let accessibilityManager: AccessibilityManager

    var body: some View {
        if !accessibilityManager.isGranted {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.yellow)
                    .font(.system(size: 14))

                Text("Grant Accessibility permission to type into other apps")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white)

                Spacer()

                Button("Open Settings") {
                    NSWorkspace.shared.open(
                        URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
                    )
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.orange.opacity(0.2))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .padding(.horizontal, 8)
        }
    }
}
