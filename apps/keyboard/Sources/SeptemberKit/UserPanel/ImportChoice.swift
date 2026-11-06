import Combine

/// What the user picks in the import window: the panels to import, and
/// whether text goes to the Keychain. Text is private by default, because
/// the Accessibility Keyboard keeps it in a plain file.
@MainActor
public final class ImportChoice: ObservableObject {
    public let panels: [ImportedPanel]
    @Published public private(set) var chosen: Set<String>
    @Published public var textAsPrivate = true

    public init(panels: [ImportedPanel]) {
        self.panels = panels
        chosen = Set(panels.map(\.id))
    }

    public func isChosen(_ id: String) -> Bool { chosen.contains(id) }

    public func toggle(_ id: String) {
        if chosen.remove(id) == nil { chosen.insert(id) }
    }

    public var chosenButtons: [NewButton] {
        panels.filter { chosen.contains($0.id) }.flatMap(\.buttons)
    }

    public var buttonCount: Int { chosenButtons.count }

    public var textCount: Int {
        panels.filter { chosen.contains($0.id) }.reduce(0) { $0 + $1.textCount }
    }
}
