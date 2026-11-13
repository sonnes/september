import Combine
import Foundation

/// Shows the input bar, the sentence predictions, and the word row only when
/// there is text input. The bar hides after `hideDelay`, so a move of the
/// focus from one field to the next does not make it blink. It shows at once.
@MainActor
public final class InputBarVisibility: ObservableObject {
    @Published public private(set) var isVisible = false
    /// The frame of the bar in the keyboard window, with the origin at the
    /// top left. The Write window opens out of this frame.
    public var frame: CGRect = .zero
    private let scheduler: any DelayScheduler
    private let hideDelay: TimeInterval
    private var pendingHide: (any ScheduledWork)?

    public init(scheduler: any DelayScheduler = MainQueueScheduler(), hideDelay: TimeInterval = 0.3) {
        self.scheduler = scheduler
        self.hideDelay = hideDelay
    }

    /// True when the bar has something to show. In Type mode that is a
    /// focused text input, a field whose text the bar hides (`.secure`), or
    /// our own echo while the app exposes no focused element. In Talk mode
    /// and in the Write window, the bar always shows.
    nonisolated public static func wantsBar(
        mode: KeyboardMode, focusedField: FocusedField?, input: InputMirror, isWriteInFront: Bool
    ) -> Bool {
        mode == .talk || isWriteInFront || input == .secure || focusedField?.isTextInput == true
            || (focusedField == nil && !input.isEmpty)
    }

    public func update(_ wantsBar: Bool) {
        if wantsBar {
            pendingHide?.cancel()
            pendingHide = nil
            if !isVisible { isVisible = true }
        } else if isVisible, pendingHide == nil {
            pendingHide = scheduler.schedule(after: hideDelay) { [weak self] in
                self?.pendingHide = nil
                self?.isVisible = false
            }
        }
    }
}
