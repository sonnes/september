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
            resources: [.copy("Resources/Panels")]
        ),
        .executableTarget(
            name: "Keyboard",
            dependencies: ["SeptemberKit"]
        ),
        .testTarget(
            name: "KitTests",
            dependencies: ["SeptemberKit"],
            path: "Tests/KitTests"
        ),
    ]
)
