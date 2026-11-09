import Foundation
import SQLite3

/// A value in a row of the database, or a value for a `?` in a statement.
public enum DatabaseValue: Equatable, Sendable {
    case int(Int64)
    case double(Double)
    case text(String)
    case null

    public var int: Int64? {
        if case .int(let value) = self { return value }
        return nil
    }

    public var double: Double? {
        switch self {
        case .double(let value): value
        case .int(let value): Double(value)
        default: nil
        }
    }

    public var text: String? {
        if case .text(let value) = self { return value }
        return nil
    }
}

extension DatabaseValue: CustomStringConvertible, CustomDebugStringConvertible {
    /// A text value shows only its length, so a log or a test failure never
    /// prints the text of the user.
    public var description: String {
        switch self {
        case .int(let value): "int(\(value))"
        case .double(let value): "double(\(value))"
        case .text(let value): "text(\(value.count) characters)"
        case .null: "null"
        }
    }

    public var debugDescription: String { description }
}

/// An error of SQLite. It holds the result code and the message of SQLite.
/// The message names the statement step, never a value.
public struct DatabaseError: Error, CustomStringConvertible {
    public let code: Int32
    public let message: String

    public var description: String { "SQLite error \(code): \(message)" }
}

/// The SQLite database of the keyboard, `keyboard.sqlite`.
///
/// The database holds the records that the keyboard keeps or learns. See
/// `docs/concepts/keyboard-storage.md`. `PRAGMA user_version` holds the
/// schema version, and `migrations` moves an older file to the newest
/// version.
///
/// The class is not `Sendable`. The stores that own it run on the main actor.
public final class KeyboardDatabase {
    /// The schema steps. Step `n` moves the version from `n` to `n + 1`. Add
    /// a new step at the end, and never change an old one.
    public static let migrations: [String] = [
        """
        CREATE TABLE sentence (
          id        INTEGER PRIMARY KEY,
          text      TEXT    NOT NULL,
          key       TEXT    NOT NULL UNIQUE,
          uses      INTEGER NOT NULL DEFAULT 1,
          first_at  REAL    NOT NULL,
          last_at   REAL    NOT NULL
        );
        CREATE INDEX sentence_last_at ON sentence(last_at);
        """,
        """
        CREATE TABLE talk_line (
          id       TEXT PRIMARY KEY,
          text     TEXT NOT NULL,
          said_at  REAL NOT NULL
        );
        CREATE INDEX talk_line_said_at ON talk_line(said_at);
        """,
        """
        CREATE TABLE clip (
          id         TEXT PRIMARY KEY,
          text       TEXT NOT NULL UNIQUE,
          copied_at  REAL NOT NULL
        );
        CREATE INDEX clip_copied_at ON clip(copied_at);
        """,
    ]

    /// `~/Library/Application Support/September Keyboard/keyboard.sqlite`.
    public static var defaultURL: URL {
        URL.applicationSupportDirectory
            .appendingPathComponent("September Keyboard", isDirectory: true)
            .appendingPathComponent("keyboard.sqlite")
    }

    private let handle: OpaquePointer

    /// Opens the database at `path` and moves it to the newest schema
    /// version. `":memory:"` opens a database that is not saved.
    public init(path: String) throws {
        var handle: OpaquePointer?
        let flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_NOMUTEX
        let code = sqlite3_open_v2(path, &handle, flags, nil)
        guard code == SQLITE_OK, let handle else {
            let error = DatabaseError(code: code, message: handle.map { String(cString: sqlite3_errmsg($0)) } ?? "open")
            sqlite3_close(handle)
            throw error
        }
        self.handle = handle
        try execute("PRAGMA foreign_keys = ON")
        if path != ":memory:" { _ = try query("PRAGMA journal_mode = WAL") }
        try migrate()
    }

    deinit {
        sqlite3_close_v2(handle)
    }

    /// Opens the database file at `url`, readable only by the user. If the
    /// file does not open, it moves to `<name>.broken.sqlite`, and a new
    /// file opens. If no file opens, the database stays in memory.
    public static func open(at url: URL) -> KeyboardDatabase {
        let files = FileManager.default
        try? files.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        if let database = try? openFile(url) { return database }

        let aside = url.deletingPathExtension().appendingPathExtension("broken.sqlite")
        try? files.removeItem(at: aside)
        try? files.moveItem(at: url, to: aside)
        for suffix in ["-wal", "-shm"] {
            try? files.removeItem(at: URL(fileURLWithPath: url.path + suffix))
        }
        if let database = try? openFile(url) { return database }
        // The memory database has no file to break.
        return try! KeyboardDatabase(path: ":memory:")
    }

    /// SQLite gives the `-wal` and `-shm` files the mode of the database
    /// file. The database file is therefore 0600 before it opens. A file
    /// from an older build can have 0644 files, so each file gets 0600.
    private static func openFile(_ url: URL) throws -> KeyboardDatabase {
        let files = FileManager.default
        let userOnly: [FileAttributeKey: Any] = [.posixPermissions: 0o600]
        if files.fileExists(atPath: url.path) {
            try files.setAttributes(userOnly, ofItemAtPath: url.path)
        } else {
            files.createFile(atPath: url.path, contents: nil, attributes: userOnly)
        }
        let database = try KeyboardDatabase(path: url.path)
        for suffix in ["-wal", "-shm"] where files.fileExists(atPath: url.path + suffix) {
            try files.setAttributes(userOnly, ofItemAtPath: url.path + suffix)
        }
        return database
    }

    /// The schema version of the file.
    public var version: Int {
        Int((try? query("PRAGMA user_version"))?.first?.first?.int ?? 0)
    }

    /// Runs one statement that gives no rows.
    public func execute(_ sql: String, _ values: [DatabaseValue] = []) throws {
        _ = try query(sql, values)
    }

    /// Runs one statement and gives its rows.
    public func query(_ sql: String, _ values: [DatabaseValue] = []) throws -> [[DatabaseValue]] {
        var statement: OpaquePointer?
        try check(sqlite3_prepare_v2(handle, sql, -1, &statement, nil))
        defer { sqlite3_finalize(statement) }
        for (offset, value) in values.enumerated() {
            try bind(value, at: Int32(offset + 1), in: statement)
        }
        var rows: [[DatabaseValue]] = []
        while true {
            let code = sqlite3_step(statement)
            if code == SQLITE_DONE { return rows }
            guard code == SQLITE_ROW else { throw error(code) }
            rows.append((0..<sqlite3_column_count(statement)).map { column(Int32($0), of: statement) })
        }
    }

    /// Runs `body` in one transaction. If `body` throws, no change stays.
    public func transaction(_ body: () throws -> Void) throws {
        try execute("BEGIN IMMEDIATE")
        do {
            try body()
            try execute("COMMIT")
        } catch {
            try? execute("ROLLBACK")
            throw error
        }
    }

    /// Moves the rows of an old JSON store into the database, one time.
    ///
    /// `insert` writes the decoded rows in one transaction. After the commit,
    /// the file is removed. A file that does not decode moves to
    /// `<name>.broken.json`, and no row is written. With no file, nothing
    /// happens. `insert` must ignore a row that is already in its table, so
    /// that a second import of the same file changes nothing.
    public func importJSON<Row: Decodable>(
        _ type: [Row].Type, from url: URL, insert: ([Row]) throws -> Void
    ) {
        let files = FileManager.default
        guard let data = try? Data(contentsOf: url) else { return }
        guard let rows = try? JSONDecoder().decode(type, from: data) else {
            let aside = url.deletingPathExtension().appendingPathExtension("broken.json")
            try? files.removeItem(at: aside)
            try? files.moveItem(at: url, to: aside)
            return
        }
        do {
            try transaction { try insert(rows) }
            try? files.removeItem(at: url)
        } catch {
            // The file stays, and the next launch tries again. The error
            // never holds a value of a row.
        }
    }

    // MARK: - Private

    private func migrate() throws {
        let current = version
        guard current < Self.migrations.count else { return }
        for step in current..<Self.migrations.count {
            try transaction {
                try check(sqlite3_exec(handle, Self.migrations[step], nil, nil, nil))
                try execute("PRAGMA user_version = \(step + 1)")
            }
        }
    }

    private func bind(_ value: DatabaseValue, at index: Int32, in statement: OpaquePointer?) throws {
        let code: Int32
        switch value {
        case .int(let value): code = sqlite3_bind_int64(statement, index, value)
        case .double(let value): code = sqlite3_bind_double(statement, index, value)
        case .text(let value): code = sqlite3_bind_text(statement, index, value, -1, Self.transient)
        case .null: code = sqlite3_bind_null(statement, index)
        }
        try check(code)
    }

    private func column(_ index: Int32, of statement: OpaquePointer?) -> DatabaseValue {
        switch sqlite3_column_type(statement, index) {
        case SQLITE_INTEGER: .int(sqlite3_column_int64(statement, index))
        case SQLITE_FLOAT: .double(sqlite3_column_double(statement, index))
        case SQLITE_TEXT: .text(String(cString: sqlite3_column_text(statement, index)))
        default: .null
        }
    }

    private func check(_ code: Int32) throws {
        guard code == SQLITE_OK else { throw error(code) }
    }

    private func error(_ code: Int32) -> DatabaseError {
        DatabaseError(code: code, message: String(cString: sqlite3_errstr(code)))
    }

    /// Tells SQLite to copy a bound text before the call returns.
    private static let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
}
