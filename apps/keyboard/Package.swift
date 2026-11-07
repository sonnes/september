// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "Keyboard",
    platforms: [
        .macOS(.v14)
    ],
    targets: [
        .target(
            name: "SeptemberKit",
            resources: [.copy("Resources/Panels"), .copy("Resources/Accents"), .copy("Resources/Context")]
        ),
        .executableTarget(
            name: "Keyboard",
            dependencies: ["SeptemberKit"],
            resources: [.copy("Resources/Editor")]
        ),
        // The native Write editor on its own: `make lab`.
        .executableTarget(
            name: "WriteLab",
            dependencies: ["SeptemberKit"]
        ),
        // Tests run as a plain executable: `swift run KitTests`.
        .executableTarget(
            name: "KitTests",
            dependencies: ["SeptemberKit"],
            path: "Tests/KitTests"
        ),
    ]
)
