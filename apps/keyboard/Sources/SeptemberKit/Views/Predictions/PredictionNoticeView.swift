import AppKit
import SwiftUI

/// The message in place of the predictions, from frame 8 of the mock. The
/// Apple Intelligence notice uses the warning surface. The notices for a
/// password field and for private text are calm.
public struct PredictionNoticeView: View {
    private let notice: PredictionNotice
    private let onOpenSystemSettings: () -> Void

    public init(notice: PredictionNotice, onOpenSystemSettings: @escaping () -> Void) {
        self.notice = notice
        self.onOpenSystemSettings = onOpenSystemSettings
    }

    /// Opens the Apple Intelligence & Siri page of System Settings. The
    /// keyboard does not become active.
    nonisolated public static func openSystemSettings() {
        NSWorkspace.shared.open(PredictionAvailability.systemSettingsURL)
    }

    public var body: some View {
        HStack(spacing: Metrics.Predictions.noticeSpacing) {
            if notice.isWarning {
                Image(systemName: "sparkle")
                    .font(Typography.predictionNoticeIcon)
                    .foregroundStyle(Color(Tokens.warning))
                    .accessibilityHidden(true)
            }
            Text(notice.message)
                .font(Typography.predictionNotice)
                .foregroundStyle(Color(notice.isWarning ? Tokens.keyText : Tokens.labelSecondary))
            Spacer(minLength: 0)
            if notice.opensSystemSettings {
                Text("Open System Settings")
                    .font(Typography.predictionNoticeAction)
                    .foregroundStyle(Color(Tokens.accent))
                    .pressable(label: "Open System Settings", onPressing: { _ in }, action: onOpenSystemSettings)
            }
        }
        .padding(.horizontal, Metrics.Predictions.noticeHorizontalPadding)
        .frame(maxWidth: .infinity, minHeight: Metrics.Predictions.noticeHeight)
        .background(
            RoundedRectangle(cornerRadius: Metrics.Predictions.noticeCornerRadius, style: .continuous)
                .fill(Color(notice.isWarning ? Tokens.warningSurface : Tokens.noticeCalmSurface))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.Predictions.noticeCornerRadius, style: .continuous)
                .strokeBorder(
                    Color(notice.isWarning ? Tokens.warningSurface : Tokens.panelStroke),
                    lineWidth: Metrics.Predictions.strokeWidth)
        )
        .accessibilityElement(children: .contain)
    }
}
