import Foundation

/// One Markdown file of the Write paper.
public struct WriteDocument: Sendable, Hashable, Identifiable {
    public let url: URL
    public let modified: Date

    public init(url: URL, modified: Date) {
        self.url = url
        self.modified = modified
    }

    public var id: URL { url }

    /// The file name without `.md`. A save names the file after its first heading.
    public var title: String { url.deletingPathExtension().lastPathComponent }

    /// The date under the title in the list: "Now", the time today,
    /// "Yesterday", or the day and the month.
    public static func dateLabel(
        _ date: Date,
        now: Date = Date(),
        calendar: Calendar = .current,
        locale: Locale = .current
    ) -> String {
        if abs(now.timeIntervalSince(date)) < 60 { return "Now" }
        let style = Date.FormatStyle(locale: locale, calendar: calendar, timeZone: calendar.timeZone)
        if calendar.isDate(date, inSameDayAs: now) {
            return date.formatted(style.hour().minute())
        }
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: now),
            calendar.isDate(date, inSameDayAs: yesterday)
        {
            return "Yesterday"
        }
        if calendar.isDate(date, equalTo: now, toGranularity: .year) {
            return date.formatted(style.day().month(.abbreviated))
        }
        return date.formatted(style.day().month(.abbreviated).year())
    }
}

/// The Markdown files of the Write paper, in one folder: `~/Documents/September`.
///
/// The library never logs or prints the text of a document.
public struct DocumentLibrary: Sendable {
    public let folder: URL

    public static var defaultFolder: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("September", isDirectory: true)
    }

    public init(folder: URL = DocumentLibrary.defaultFolder) {
        self.folder = folder
    }

    /// The Markdown files of the folder, newest first. A missing folder has none.
    public func documents() throws -> [WriteDocument] {
        guard FileManager.default.fileExists(atPath: folder.path) else { return [] }
        let files = try FileManager.default.contentsOfDirectory(
            at: folder, includingPropertiesForKeys: [.contentModificationDateKey],
            options: [.skipsHiddenFiles])
        return try files
            .filter { $0.pathExtension.lowercased() == "md" }
            .map { file in
                let date = try file.resourceValues(forKeys: [.contentModificationDateKey])
                    .contentModificationDate
                // The folder URL names each file, so a URL from a save or a
                // create matches the URL in the list.
                let url = folder.appendingPathComponent(file.lastPathComponent)
                return WriteDocument(url: url, modified: date ?? .distantPast)
            }
            .sorted { ($0.modified, $1.title) > ($1.modified, $0.title) }
    }

    /// Makes an empty file, "Untitled.md", or "Untitled 2.md" when that name is taken.
    public func create() throws -> WriteDocument {
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let url = freeURL(for: "Untitled")
        try Data().write(to: url, options: .withoutOverwriting)
        return WriteDocument(url: url, modified: Date())
    }

    public func read(_ document: WriteDocument) throws -> String {
        try String(contentsOf: document.url, encoding: .utf8)
    }

    /// Writes the text, and renames the file when its first heading changed.
    /// Returns the URL of the file after the save.
    public func save(_ text: String, to url: URL) throws -> URL {
        // A write of the same text would move the document to the top of
        // the list.
        let data = Data(text.utf8)
        if (try? Data(contentsOf: url)) != data {
            try data.write(to: url, options: .atomic)
        }
        guard let title = Self.title(of: text) else { return url }
        let name = url.deletingPathExtension().lastPathComponent
        if name.caseInsensitiveCompare(title) == .orderedSame || Self.isNumbered(name, as: title) {
            return url
        }
        let target = freeURL(for: title)
        try FileManager.default.moveItem(at: url, to: target)
        return target
    }

    /// The text of the first Markdown heading, made safe for a file name.
    public static func title(of text: String) -> String? {
        for line in text.split(whereSeparator: \.isNewline) {
            let hashes = line.prefix { $0 == "#" }
            guard (1...6).contains(hashes.count) else { continue }
            let rest = line.dropFirst(hashes.count)
            guard rest.first == " " || rest.first == "\t" else { continue }
            var title = rest.trimmingCharacters(in: .whitespaces)
            // A closing sequence of hashes is not part of the heading.
            while title.hasSuffix("#") { title.removeLast() }
            title = title.trimmingCharacters(in: .whitespaces)
                .replacingOccurrences(of: "/", with: "-")
                .replacingOccurrences(of: ":", with: "-")
            title = String(title.drop { $0 == "." }.prefix(maxTitleLength))
                .trimmingCharacters(in: .whitespaces)
            return title.isEmpty ? nil : title
        }
        return nil
    }

    private static let maxTitleLength = 100

    /// True for "Plans 2" as a name for the title "Plans".
    private static func isNumbered(_ name: String, as title: String) -> Bool {
        guard name.hasPrefix(title + " "), let number = Int(name.dropFirst(title.count + 1)) else {
            return false
        }
        return number >= 2
    }

    private func freeURL(for title: String) -> URL {
        var url = folder.appendingPathComponent(title).appendingPathExtension("md")
        var number = 2
        while FileManager.default.fileExists(atPath: url.path) {
            url = folder.appendingPathComponent("\(title) \(number)").appendingPathExtension("md")
            number += 1
        }
        return url
    }
}
