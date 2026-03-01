// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "September",
    platforms: [
        .macOS(.v14)
    ],
    dependencies: [
        .package(url: "https://github.com/eastriverlee/LLM.swift.git", branch: "main"),
    ],
    targets: [
        .executableTarget(
            name: "September",
            dependencies: [
                .product(name: "LLM", package: "LLM.swift"),
            ],
            path: "Sources/September",
            resources: [
                .copy("Resources/Qwen3-0.6B-Q4_K_M.gguf")
            ]
        )
    ]
)
