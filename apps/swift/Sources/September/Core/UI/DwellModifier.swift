import SwiftUI

/// View modifier for dwell-to-activate (hover + wait = tap).
/// Used by accessible keyboard keys for Switch Control and head tracking users.
/// Configurable via @AppStorage for enable/disable and duration.
struct DwellModifier: ViewModifier {
    let cornerRadius: CGFloat
    @Binding var isHovered: Bool
    let action: () -> Void

    @AppStorage("dwellEnabled") private var dwellEnabled: Bool = true
    @AppStorage("dwellDuration") private var dwellDuration: Double = 0.6
    @State private var dwellProgress: CGFloat = 0
    @State private var dwellTask: Task<Void, Never>?

    func body(content: Content) -> some View {
        content
            .overlay(dwellEnabled ? progressOverlay : nil)
            .onHover { hovering in
                isHovered = hovering
                guard dwellEnabled else { return }
                if hovering {
                    startDwell()
                } else {
                    cancelDwell()
                }
            }
    }

    private var progressOverlay: some View {
        GeometryReader { geo in
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(Color.accentColor.opacity(0.25))
                .frame(width: geo.size.width * dwellProgress)
                .animation(.linear(duration: 0.03), value: dwellProgress)
                .opacity(dwellProgress > 0 ? 1 : 0)
        }
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
    }

    private func startDwell() {
        dwellProgress = 0
        dwellTask = Task { @MainActor in
            let steps = 30
            let interval = dwellDuration / Double(steps)
            for i in 1...steps {
                try? await Task.sleep(for: .milliseconds(Int(interval * 1000)))
                if Task.isCancelled { return }
                dwellProgress = CGFloat(i) / CGFloat(steps)
            }
            action()
            dwellProgress = 0
        }
    }

    private func cancelDwell() {
        dwellTask?.cancel()
        dwellTask = nil
        withAnimation(.easeOut(duration: 0.15)) {
            dwellProgress = 0
        }
    }
}

extension View {
    func dwell(cornerRadius: CGFloat = 6, isHovered: Binding<Bool>, action: @escaping () -> Void) -> some View {
        modifier(DwellModifier(cornerRadius: cornerRadius, isHovered: isHovered, action: action))
    }
}
