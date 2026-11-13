import Foundation

/// Moves the JSON files of the older versions of the keyboard into the
/// keyboard database, one time.
///
/// Each old file has one entry in `files(defaults:)`. A file that decodes
/// goes into the database in one transaction, and then the file is removed.
/// A file that does not decode moves to `<name>.broken.json`, and no row is
/// written. Each insert ignores a row that is already in its table, so that
/// a second import of the same file changes nothing.
@MainActor
public enum LegacyImport {
    /// The files that no version of the keyboard reads now.
    private static let staleFileNames = ["usage.json", "learned.json"]

    /// Imports each old file in `folder` into `database`, and removes the
    /// stale files. A file that is not in the folder is not an error.
    public static func run(database: KeyboardDatabase, folder: URL, defaults: UserDefaults = .standard) {
        let manager = FileManager.default
        for name in staleFileNames {
            try? manager.removeItem(at: folder.appendingPathComponent(name))
        }
        for file in files(defaults: defaults) {
            let url = folder.appendingPathComponent(file.name)
            guard let data = try? Data(contentsOf: url) else { continue }
            guard let insert = try? file.decode(data) else {
                let aside = url.deletingPathExtension().appendingPathExtension("broken.json")
                try? manager.removeItem(at: aside)
                try? manager.moveItem(at: url, to: aside)
                continue
            }
            do {
                try database.transaction { try insert(database) }
                try? manager.removeItem(at: url)
            } catch {
                // The file stays, and the next launch tries again. The error
                // never holds a value of a row.
            }
        }
    }

    private struct File {
        let name: String
        let decode: (Data) throws -> (KeyboardDatabase) throws -> Void
    }

    private static func file<Rows: Decodable>(
        _ name: String, _ type: Rows.Type, insert: @escaping (Rows, KeyboardDatabase) throws -> Void
    ) -> File {
        File(name: name) { data in
            let rows = try JSONDecoder().decode(type, from: data)
            return { database in try insert(rows, database) }
        }
    }

    private static func files(defaults: UserDefaults) -> [File] {
        [
            file("clipboard-history.json", [TextLogEntry].self) { items, database in
                for item in items {
                    try database.execute(
                        "INSERT OR IGNORE INTO clip (id, text, copied_at) VALUES (?, ?, ?)",
                        [.text(item.id.uuidString), .text(item.text), .double(item.date.timeIntervalSince1970)])
                }
            },
            file("talk-history.json", [TextLogEntry].self) { lines, database in
                for line in lines {
                    try database.execute(
                        "INSERT OR IGNORE INTO talk_line (id, text, said_at) VALUES (?, ?, ?)",
                        [.text(line.id.uuidString), .text(line.text), .double(line.date.timeIntervalSince1970)])
                }
            },
            file("my-panel-usage.json", UsageFile.self) { file, database in
                for (buttonID, count) in file.apps["my-panel"] ?? [:] {
                    try database.execute(
                        "INSERT OR IGNORE INTO button_use (button_id, weight, updated_at) VALUES (?, ?, ?)",
                        [.text(buttonID), .double(count.weight), .double(count.updated.timeIntervalSince1970)])
                }
            },
            file("my-panel.json", PanelFile.self) { file, database in
                for (position, button) in file.buttons.enumerated() {
                    try database.execute(
                        "INSERT OR IGNORE INTO user_button (id, position, name, action) VALUES (?, ?, ?, ?)",
                        [
                            .text(button.id), .int(Int64(position)), .text(button.name),
                            .text(try UserPanelStore.json(button.action)),
                        ])
                }
                defaults.set(file.makeNewTextPrivate, forKey: UserPanelStore.makeNewTextPrivateKey)
            },
        ]
    }

    /// `my-panel-usage.json` keeps the counts of My Panel under the key
    /// `my-panel`.
    private struct UsageFile: Decodable {
        struct Count: Decodable {
            var weight: Double
            var updated: Date
        }

        var apps: [String: [String: Count]]
    }

    private struct PanelFile: Decodable {
        var makeNewTextPrivate: Bool
        var buttons: [UserButton]
    }
}
