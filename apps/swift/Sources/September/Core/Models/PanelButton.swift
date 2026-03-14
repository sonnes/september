import Foundation
import SwiftData

// MARK: - ButtonSize

enum ButtonSize: String, Codable, Sendable {
    case small
    case medium
    case large
    case extraLarge
}

// MARK: - PanelButton
//
// A single action button within a Panel.

@Model
final class PanelButton {
    @Attribute(.unique) var id: String
    var label: String
    var icon: String
    var color: String
    var actionType: String
    var prompt: String?
    var size: ButtonSize
    var order: Int
    var panel: Panel?

    init(
        id: String = UUID().uuidString,
        label: String,
        icon: String = "star",
        color: String = "primary",
        actionType: String = "aiPrompt",
        prompt: String? = nil,
        size: ButtonSize = .medium,
        order: Int = 0
    ) {
        self.id = id
        self.label = label
        self.icon = icon
        self.color = color
        self.actionType = actionType
        self.prompt = prompt
        self.size = size
        self.order = order
    }
}
