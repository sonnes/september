/// How often the user presses each button of My Panel. `UsageStore` gives
/// these counts.
@MainActor
public protocol ButtonUsage {
    func uses(of buttonID: String) -> Int
}

/// No presses yet: My Panel keeps the order of the settings.
public struct NoButtonUsage: ButtonUsage {
    public init() {}

    public func uses(of buttonID: String) -> Int { 0 }
}
