import Foundation
import SeptemberKit

@MainActor
func debugTests() async {
    await traceTests()
    recordTests()
    debugModelTests()
}

private let cu = InputMirror.mirrored(text: "I would like a cu", caret: 17, selectionLength: 0)

@MainActor
private func engine(_ predictor: FakePredictor) -> PredictionEngine {
    PredictionEngine(predictor: predictor, completer: FakeCompleter(), delay: .zero, defaults: freshDefaults())
}

@MainActor
private func traceTests() async {
    await asyncTest("the trace holds the prompt, each answer, and the sentences that fit") {
        let predictor = FakePredictor { _ in ["Coffee is fine.", "I would like a cup of tea."] }
        let engine = engine(predictor)
        engine.userTypes(cu, said: ["Hello"])
        await engine.settle()
        let context = PredictionContext(input: cu, mode: .type, said: ["Hello"])!
        expectEqual(engine.context, context)
        expectEqual(engine.trace?.context, context)
        expectEqual(engine.trace?.prompt, SuggestionPrompt(context: context))
        expectEqual(engine.trace?.answers, ["Coffee is fine.", "I would like a cup of tea."])
        expectEqual(engine.trace?.sentences, ["I would like a cup of tea."])
        expectEqual(engine.trace?.dropped, ["Coffee is fine."])
        expect(engine.trace?.duration != nil, "an answered request has a duration")
    }

    await asyncTest("a request that waits for the model has a trace with no answers yet") {
        let predictor = FakePredictor(holds: { _ in true }, answer: { _ in ["I would like a cup."] })
        let engine = engine(predictor)
        engine.userTypes(cu)
        await predictor.waitUntilHeld(1)
        expectEqual(engine.trace?.answers, [])
        expect(engine.trace?.duration == nil)
        await predictor.release()
        await engine.settle()
        expectEqual(engine.trace?.answers, ["I would like a cup."])
    }

    await asyncTest("private text clears the context and the trace") {
        let engine = engine(FakePredictor { _ in ["I would like a cup."] })
        engine.userTypes(cu)
        await engine.settle()
        expect(engine.trace != nil)
        engine.update(input: cu, mode: .type, said: [], isPrivate: true)
        expect(engine.context == nil)
        expect(engine.trace == nil)
    }

    await asyncTest("a password field clears the context and the trace") {
        let engine = engine(FakePredictor { _ in ["I would like a cup."] })
        engine.userTypes(cu)
        await engine.settle()
        engine.update(input: .secure, mode: .type, said: [])
        expect(engine.context == nil)
        expect(engine.trace == nil)
    }
}

@MainActor
private func recordTests() {
    func filled() throws -> KeyboardDatabase {
        let database = memoryDatabase()
        try database.execute(
            "INSERT INTO sentence (text, key, uses, first_at, last_at) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)",
            [
                .text("Old one."), .text("old one."), .int(3), .double(1), .double(10),
                .text("New one."), .text("new one."), .int(1), .double(2), .double(20),
            ])
        try database.execute(
            "INSERT INTO user_button (id, position, name, action) VALUES (?, ?, ?, ?), (?, ?, ?, ?)",
            [
                .text("b"), .int(1), .text("Second"), .text("{}"),
                .text("a"), .int(0), .text("First"), .text("{}"),
            ])
        return database
    }

    test("the record browser lists each table of the schema with its count of rows") {
        let browser = RecordBrowser(database: try filled())
        let tables = browser.tables()
        expectEqual(tables.map(\.name), ["sentence", "talk_line", "clip", "button_use", "user_button", "shortcut_use"])
        expectEqual(tables.first { $0.name == "sentence" }?.count, 2)
        expectEqual(tables.first { $0.name == "clip" }?.count, 0)
    }

    test("the rows of a table with a time come newest first") {
        let rows = RecordBrowser(database: try filled()).rows(in: "sentence")
        expectEqual(rows.map(\.title), ["New one.", "Old one."])
        expectEqual(rows.first?.cells.map(\.column), ["id", "text", "key", "uses", "first_at", "last_at"])
    }

    test("the rows of a table with positions come in position order") {
        let rows = RecordBrowser(database: try filled()).rows(in: "user_button")
        expectEqual(rows.map(\.title), ["First", "Second"])
    }

    test("the record browser gives no rows for a name that is not a table") {
        let browser = RecordBrowser(database: try filled())
        expect(browser.rows(in: "sentence; DROP TABLE sentence").isEmpty)
        expectEqual(browser.tables().first?.count, 2)
    }

    test("a time cell shows its age, and another cell shows its value") {
        let now = Date(timeIntervalSince1970: 100_000)
        expectEqual(RecordCell(column: "last_at", value: .double(100_000 - 120)).formatted(at: now), "2 min")
        expectEqual(RecordCell(column: "last_at", value: .double(100_000 - 2 * 86_400)).formatted(at: now), "2 d")
        expectEqual(RecordCell(column: "uses", value: .int(3)).formatted(at: now), "3")
        expectEqual(RecordCell(column: "weight", value: .double(1.5)).formatted(at: now), "1.50")
    }

    test("the record browser keeps to the limit") {
        expectEqual(RecordBrowser(database: try filled()).rows(in: "sentence", limit: 1).count, 1)
    }
}

@MainActor
private func debugModelTests() {
    test("the debug panel shows the rows of the table that the user picks") {
        let database = memoryDatabase()
        try database.execute(
            "INSERT INTO clip (id, text, copied_at) VALUES (?, ?, ?)", [.text("1"), .text("Copied."), .double(1)])
        let model = DebugPanelModel(records: RecordBrowser(database: database))
        model.reloadRecords()
        expectEqual(model.table, "sentence", "the first table is picked at first")
        expect(model.rows.isEmpty)
        model.pick(table: "clip")
        expectEqual(model.rows.map(\.title), ["Copied."])
    }

    test("a reload of the records reads the new rows of the picked table") {
        let database = memoryDatabase()
        let model = DebugPanelModel(records: RecordBrowser(database: database))
        model.pick(table: "clip")
        try database.execute(
            "INSERT INTO clip (id, text, copied_at) VALUES (?, ?, ?)", [.text("1"), .text("Copied."), .double(1)])
        model.reloadRecords()
        expectEqual(model.rows.count, 1)
        expectEqual(model.tables.first { $0.name == "clip" }?.count, 1)
    }
}
