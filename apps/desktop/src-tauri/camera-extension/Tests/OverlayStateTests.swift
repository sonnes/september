import XCTest

@testable import SeptemberCameraCore

final class OverlayStateTests: XCTestCase {
  func testOverlayTextIsBoundedBeforeItReachesTheFramePipeline() {
    let state = CameraOverlayState(text: String(repeating: "a", count: 5000))

    XCTAssertEqual(state.text.count, CameraOverlayState.maxTextLength)
  }

  func testOverlayStateCrossesTheCustomCameraPropertyAsJson() {
    let original = CameraOverlayState(text: "Would you like some tea?", visible: true)

    XCTAssertEqual(CameraOverlayState.decode(original.encoded()), original)
  }
}
