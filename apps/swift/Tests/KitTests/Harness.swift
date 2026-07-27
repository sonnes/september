import Foundation

/// Minimal test harness. Xcode is not installed on the dev machine, so neither
/// swift-testing nor XCTest is available to SwiftPM; this keeps the red/green
/// loop in the terminal. Swap for swift-testing once Xcode is present.
enum Run {
    nonisolated(unsafe) static var passed = 0
    nonisolated(unsafe) static var failures: [String] = []
    nonisolated(unsafe) static var current = ""
}

func test(_ name: String, _ body: () throws -> Void) {
    Run.current = name
    do {
        try body()
    } catch {
        Run.failures.append("\(name) — threw \(error)")
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
    if Run.failures.isEmpty {
        print("✓ \(Run.passed) checks passed")
        exit(0)
    }
    print("✗ \(Run.failures.count) failures, \(Run.passed) passed\n")
    for failure in Run.failures { print("  • \(failure)") }
    exit(1)
}
