// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "SeptemberMac",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "SeptemberMac",
            targets: ["SeptemberMac"]
        ),
        .executable(
            name: "SeptemberMacApp",
            targets: ["SeptemberMacApp"]
        )
    ],
    targets: [
        .target(
            name: "SeptemberMac"
        ),
        .executableTarget(
            name: "SeptemberMacApp",
            dependencies: ["SeptemberMac"]
        ),
        .executableTarget(
            name: "SeptemberMacLayoutTests",
            dependencies: ["SeptemberMac"],
            path: "Tests/SeptemberMacLayoutTests"
        )
    ]
)
