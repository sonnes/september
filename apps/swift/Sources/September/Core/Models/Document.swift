import Foundation
import SwiftData

// MARK: - Document
//
// Plain text document for the Write mode.
// Mirrors: packages/documents/types/index.ts → DocumentSchema

@Model
final class Document {
    @Attribute(.unique) var id: String
    var name: String?
    var content: String
    var createdAt: Date
    var updatedAt: Date

    init(
        id: String = UUID().uuidString,
        name: String? = nil,
        content: String = ""
    ) {
        self.id = id
        self.name = name
        self.content = content
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}
