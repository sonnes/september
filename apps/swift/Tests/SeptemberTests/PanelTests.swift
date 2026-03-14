import Foundation
import SwiftData
import Testing

@testable import September

@Suite("Panel Model")
struct PanelTests {

    private func makeContainer() throws -> ModelContainer {
        let schema = Schema([Account.self, Document.self, Panel.self, PanelButton.self])
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        return try ModelContainer(for: schema, configurations: [config])
    }

    @Test("Create panel with buttons")
    func createWithButtons() throws {
        let container = try makeContainer()
        let context = ModelContext(container)

        let panel = Panel(name: "VS Code", appIdentifier: "com.microsoft.VSCode")
        let button1 = PanelButton(label: "Save", icon: "square.and.arrow.down", order: 0)
        let button2 = PanelButton(label: "Build", icon: "hammer", order: 1)

        panel.buttons = [button1, button2]
        context.insert(panel)
        try context.save()

        let fetched = try context.fetch(FetchDescriptor<Panel>())
        #expect(fetched.count == 1)
        #expect(fetched[0].name == "VS Code")
        #expect(fetched[0].buttons.count == 2)
    }

    @Test("Cascade delete removes buttons")
    func cascadeDelete() throws {
        let container = try makeContainer()
        let context = ModelContext(container)

        let panel = Panel(name: "Test Panel")
        let button = PanelButton(label: "Action", order: 0)
        panel.buttons = [button]
        context.insert(panel)
        try context.save()

        // Verify button exists
        let buttonsBefore = try context.fetch(FetchDescriptor<PanelButton>())
        #expect(buttonsBefore.count == 1)

        // Delete panel
        context.delete(panel)
        try context.save()

        // Buttons should be cascaded
        let panelsAfter = try context.fetch(FetchDescriptor<Panel>())
        let buttonsAfter = try context.fetch(FetchDescriptor<PanelButton>())
        #expect(panelsAfter.isEmpty)
        #expect(buttonsAfter.isEmpty)
    }

    @Test("PanelButton properties persist")
    func buttonProperties() throws {
        let container = try makeContainer()
        let context = ModelContext(container)

        let panel = Panel(name: "Custom")
        let button = PanelButton(
            label: "Generate",
            icon: "sparkles",
            color: "primary",
            actionType: "aiPrompt",
            prompt: "Summarize the selected text",
            size: .large,
            order: 0
        )
        panel.buttons = [button]
        context.insert(panel)
        try context.save()

        let fetched = try context.fetch(FetchDescriptor<PanelButton>())
        #expect(fetched[0].label == "Generate")
        #expect(fetched[0].icon == "sparkles")
        #expect(fetched[0].actionType == "aiPrompt")
        #expect(fetched[0].prompt == "Summarize the selected text")
        #expect(fetched[0].size == .large)
    }
}
