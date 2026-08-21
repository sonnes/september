// swift-tools-version: 6.0

import PackageDescription

let package = Package(
  name: "SeptemberCameraCore",
  platforms: [.macOS(.v13)],
  products: [
    .library(name: "SeptemberCameraCore", targets: ["SeptemberCameraCore"])
  ],
  targets: [
    .target(
      name: "SeptemberCameraCore",
      path: "Sources",
      exclude: ["CameraProvider.swift", "main.swift"],
      sources: ["OverlayState.swift"]
    ),
    .testTarget(
      name: "SeptemberCameraCoreTests",
      dependencies: ["SeptemberCameraCore"],
      path: "Tests"
    ),
  ]
)
