// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "September",
    platforms: [
        .macOS(.v14)
    ],
    targets: [
        .executableTarget(
            name: "September",
            path: "Sources/September"
        )
    ]
)
