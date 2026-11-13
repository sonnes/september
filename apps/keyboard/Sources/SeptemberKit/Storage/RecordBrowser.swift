import Foundation

/// A table of `keyboard.sqlite` and its count of rows.
public struct RecordTable: Equatable, Sendable, Identifiable {
    public let name: String
    public let count: Int
    public var id: String { name }
}

/// One value of a row, with the name of its column.
public struct RecordCell: Equatable, Sendable {
    public let column: String
    public let value: DatabaseValue

    public init(column: String, value: DatabaseValue) {
        self.column = column
        self.value = value
    }

    /// The value as the panel shows it. A time column (`*_at`) holds seconds
    /// since 1970 and shows its age: "now", "2 min", "1 h", "3 d".
    public func formatted(at now: Date) -> String {
        guard column.hasSuffix("_at"), let seconds = value.double else { return RecordRow.format(value) }
        let minutes = Int(now.timeIntervalSince1970 - seconds) / 60
        if minutes < 1 { return "now" }
        if minutes < 60 { return "\(minutes) min" }
        if minutes < 24 * 60 { return "\(minutes / 60) h" }
        return "\(minutes / (24 * 60)) d"
    }
}

/// One row of a table, with its cells in the order of the columns.
public struct RecordRow: Equatable, Sendable, Identifiable {
    /// The place of the row in the list.
    public let id: Int
    public let cells: [RecordCell]

    /// The columns that name a row, best first.
    private static let titleColumns = ["text", "name"]

    /// The value that names the row: the text or the name, or else the
    /// first value.
    public var title: String {
        let cell =
            Self.titleColumns.lazy.compactMap { name in self.cells.first { $0.column == name } }.first
            ?? cells.first
        return cell.map { Self.format($0.value) } ?? ""
    }

    /// The cells other than the title.
    public var details: [RecordCell] {
        let title = Self.titleColumns.first { name in cells.contains { $0.column == name } }
        return title == nil ? Array(cells.dropFirst()) : cells.filter { $0.column != title }
    }

    /// A value as the panel shows it. A time is seconds since 1970.
    public static func format(_ value: DatabaseValue) -> String {
        switch value {
        case .int(let value): String(value)
        case .double(let value): value.rounded() == value ? String(Int64(value)) : String(format: "%.2f", value)
        case .text(let value): value
        case .null: "null"
        }
    }
}

/// Reads the tables of `keyboard.sqlite` for the Debug panel. It changes
/// nothing.
///
/// The rows of a table with a time column (`*_at`) come newest first, by the
/// last time column. The rows of a table with a `position` column come in
/// position order.
@MainActor
public struct RecordBrowser {
    private let database: KeyboardDatabase

    public init(database: KeyboardDatabase) {
        self.database = database
    }

    /// The tables of the schema, in the order that the migrations made them.
    public func tables() -> [RecordTable] {
        tableNames().map { name in
            let count = (try? database.query("SELECT COUNT(*) FROM \"\(name)\""))?.first?.first?.int ?? 0
            return RecordTable(name: name, count: Int(count))
        }
    }

    /// The first `limit` rows of `table`. A name that is not a table gives
    /// no rows.
    public func rows(in table: String, limit: Int = 100) -> [RecordRow] {
        guard tableNames().contains(table) else { return [] }
        let columns = (try? database.query("SELECT name FROM pragma_table_info(?)", [.text(table)]))?
            .compactMap { $0.first?.text } ?? []
        let order: String =
            if let time = columns.last(where: { $0.hasSuffix("_at") }) {
                " ORDER BY \"\(time)\" DESC"
            } else if columns.contains("position") {
                " ORDER BY position"
            } else {
                ""
            }
        let sql = "SELECT * FROM \"\(table)\"\(order) LIMIT ?"
        let rows = (try? database.query(sql, [.int(Int64(limit))])) ?? []
        return rows.enumerated().map { index, values in
            RecordRow(
                id: index,
                cells: zip(columns, values).map { RecordCell(column: $0, value: $1) })
        }
    }

    private func tableNames() -> [String] {
        let sql = "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid"
        return (try? database.query(sql))?.compactMap { $0.first?.text } ?? []
    }
}
