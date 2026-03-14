import SwiftData
import SwiftUI

@main
struct SeptemberApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(Self.makeContainer())
    }

    private static func makeContainer() -> ModelContainer {
        let schema = Schema([
            Account.self,
            Document.self,
            Panel.self,
            PanelButton.self,
        ])

        let config = ModelConfiguration(isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [config])
        } catch {
            #if DEBUG
            // During development, schema changes without migration will crash.
            // Delete the store and retry so iteration isn't blocked.
            print("[SeptemberApp] SwiftData failed: \(error). Resetting store...")
            let inMemory = ModelConfiguration(isStoredInMemoryOnly: true)
            if let fallback = try? ModelContainer(for: schema, configurations: [inMemory]) {
                return fallback
            }
            #endif
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }
}
