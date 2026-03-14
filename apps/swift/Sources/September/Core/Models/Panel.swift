import Foundation
import SwiftData

// MARK: - Panel
//
// A collection of shortcut buttons linked to a specific app.
// When that app is focused, this panel auto-appears.

@Model
final class Panel {
    @Attribute(.unique) var id: String
    var name: String
    var appIdentifier: String?
    @Relationship(deleteRule: .cascade, inverse: \PanelButton.panel)
    var buttons: [PanelButton]
    var createdAt: Date
    var updatedAt: Date

    init(
        id: String = UUID().uuidString,
        name: String,
        appIdentifier: String? = nil,
        buttons: [PanelButton] = []
    ) {
        self.id = id
        self.name = name
        self.appIdentifier = appIdentifier
        self.buttons = buttons
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}
