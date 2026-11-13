import AppKit
import SeptemberKit

@MainActor
final class SystemPasteboard: ClipboardAccess {
    private let pasteboard = NSPasteboard.general

    var changeCount: Int { pasteboard.changeCount }

    var types: [String] { pasteboard.types?.map(\.rawValue) ?? [] }

    func string() -> String? { pasteboard.string(forType: .string) }

    func write(_ text: String) {
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
    }
}
