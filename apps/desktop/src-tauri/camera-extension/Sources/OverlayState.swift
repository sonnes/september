import Foundation

struct CameraOverlayState: Codable, Equatable, Sendable {
  static let maxTextLength = 4096

  let text: String
  let visible: Bool

  init(text: String = "", visible: Bool = true) {
    self.text = String(text.prefix(Self.maxTextLength))
    self.visible = visible
  }

  static func decode(_ value: String) -> CameraOverlayState? {
    guard let data = value.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(Self.self, from: data)
  }

  func encoded() -> String {
    guard
      let data = try? JSONEncoder().encode(self),
      let value = String(data: data, encoding: .utf8)
    else {
      return #"{"text":"","visible":false}"#
    }
    return value
  }
}
