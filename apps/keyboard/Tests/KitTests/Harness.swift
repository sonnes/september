import Foundation

/// A minimal test harness. The tests run as a plain executable
/// (`swift run KitTests`), with no XCTest and no swift-testing.
enum Run {
    nonisolated(unsafe) static var passed = 0
    nonisolated(unsafe) static var failures: [String] = []
    nonisolated(unsafe) static var current = ""
    static let defaultsFolder = FileManager.default.temporaryDirectory
        .appendingPathComponent("kit-defaults-\(UUID().uuidString)", isDirectory: true)
}

/// Runs one test. A test fails when it throws, when an `expect` fails, or
/// when its body ran no `expect`.
func test(_ name: String, _ body: () throws -> Void) {
    let checks = begin(name)
    do {
        try body()
    } catch {
        Run.failures.append("\(name) — threw \(error)")
    }
    end(name, checks: checks)
}

/// Runs one async test with the same rules as `test`.
@MainActor
func asyncTest(_ name: String, _ body: () async throws -> Void) async {
    let checks = begin(name)
    do {
        try await body()
    } catch {
        Run.failures.append("\(name) — threw \(error)")
    }
    end(name, checks: checks)
}

private func begin(_ name: String) -> Int {
    Run.current = name
    Watchdog.shared.started(name)
    return Run.passed + Run.failures.count
}

private func end(_ name: String, checks: Int) {
    Watchdog.shared.ended()
    if Run.passed + Run.failures.count == checks {
        Run.failures.append("\(name) — ran no expect")
    }
}

func expect(_ condition: Bool, _ message: @autoclosure () -> String = "", line: UInt = #line) {
    if condition {
        Run.passed += 1
    } else {
        Run.failures.append("\(Run.current) (line \(line)) \(message())")
    }
}

func expectEqual<V: Equatable>(
    _ actual: V,
    _ expected: V,
    _ message: @autoclosure () -> String = "",
    line: UInt = #line
) {
    expect(actual == expected, "expected \(expected), got \(actual) \(message())", line: line)
}

func summarize() -> Never {
    try? FileManager.default.removeItem(at: Run.defaultsFolder)
    if Run.failures.isEmpty {
        print("✓ \(Run.passed) checks passed")
        exit(0)
    }
    print("✗ \(Run.failures.count) failures, \(Run.passed) passed\n")
    for failure in Run.failures { print("  • \(failure)") }
    exit(1)
}

/// Returns an empty defaults domain. A suite name that is an absolute path
/// keeps the domain in that file, not in `~/Library/Preferences`, and
/// `summarize` removes the folder of these files when the run ends.
func freshDefaults() -> UserDefaults {
    let file = Run.defaultsFolder.appendingPathComponent("\(UUID().uuidString).plist")
    return UserDefaults(suiteName: file.path)!
}

/// Stops the run when one test runs longer than `limit`. The fakes wait
/// with no deadline, so a test that hangs waits forever without it. The
/// watchdog prints the name of the test and exits with status 1.
final class Watchdog: @unchecked Sendable {
    static let limit: TimeInterval = 10
    static let shared = Watchdog()

    // The lock guards `name` and `start`: the tests set them on the main
    // thread, and the timer reads them on a background queue.
    private let lock = NSLock()
    private var name: String?
    private var start = Date()
    private let timer = DispatchSource.makeTimerSource(queue: .global())

    private init() {
        timer.schedule(deadline: .now() + 1, repeating: 1)
        timer.setEventHandler { [unowned self] in check() }
        timer.resume()
    }

    func started(_ test: String) {
        lock.withLock {
            name = test
            start = Date()
        }
    }

    func ended() {
        lock.withLock { name = nil }
    }

    private func check() {
        let hung = lock.withLock { () -> String? in
            guard let name, Date().timeIntervalSince(start) > Self.limit else { return nil }
            return name
        }
        guard let hung else { return }
        print("✗ \(hung) — ran longer than \(Int(Self.limit)) s")
        exit(1)
    }
}
