import AVFoundation
import AppKit
import CoreGraphics
import CoreImage
import CoreMediaIO
import CoreText
import Foundation
import IOKit.audio
import Metal
import os

private let frameWidth: Int32 = 1280
private let frameHeight: Int32 = 720
private let frameRate: Int32 = 30
private let cameraDeviceID = UUID(uuidString: "C4914DB0-277B-4E29-96F5-418F7B778A54")!
private let cameraStreamID = UUID(uuidString: "A23704F5-7C10-48A4-9E17-2B10A88DB768")!
private let cameraLegacyID = "app.september.desktop.camera.device"
private let overlayProperty = CMIOExtensionProperty(rawValue: "4cc_otxt_glob_0000")
private let log = Logger(subsystem: "app.september.desktop.camera", category: "frames")

final class OverlayRenderer {
  private let lock = NSLock()
  private let context: CIContext
  private let colorSpace = CGColorSpaceCreateDeviceRGB()
  private let cachedWatermark: CIImage?
  private var state = CameraOverlayState()
  private(set) var cachedOverlay: CIImage?

  init?() {
    guard let device = MTLCreateSystemDefaultDevice() else { return nil }
    context = CIContext(
      mtlDevice: device,
      options: [
        .cacheIntermediates: false,
        .workingColorSpace: colorSpace,
      ]
    )
    cachedWatermark = Self.makeWatermark()
  }

  func update(_ next: CameraOverlayState) {
    lock.lock()
    let unchanged = next == state
    lock.unlock()
    guard !unchanged else { return }

    // Text shaping and bitmap creation happen only when the text changes.
    let rendered = Self.makeOverlay(next)
    lock.lock()
    state = next
    cachedOverlay = rendered
    lock.unlock()
  }

  func render(source: CVPixelBuffer, into destination: CVPixelBuffer) {
    let bounds = CGRect(x: 0, y: 0, width: Int(frameWidth), height: Int(frameHeight))
    let input = CIImage(cvPixelBuffer: source)
    let scale = max(bounds.width / input.extent.width, bounds.height / input.extent.height)
    let scaled = input.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let x = (scaled.extent.width - bounds.width) / 2
    let y = (scaled.extent.height - bounds.height) / 2
    var image = scaled.cropped(to: CGRect(x: x, y: y, width: bounds.width, height: bounds.height))
      .transformed(by: CGAffineTransform(translationX: -x, y: -y))

    if let cachedWatermark {
      let placed = cachedWatermark.transformed(
        by: CGAffineTransform(translationX: 24, y: 24)
      )
      image = placed.composited(over: image)
    }

    lock.lock()
    let overlay = cachedOverlay
    lock.unlock()
    if let overlay {
      let placed = overlay.transformed(
        by: CGAffineTransform(
          translationX: (bounds.width - overlay.extent.width) / 2,
          y: 36
        )
      )
      image = placed.composited(over: image)
    }

    context.render(image, to: destination, bounds: bounds, colorSpace: colorSpace)
  }

  private static func makeWatermark() -> CIImage? {
    guard
      let url = Bundle.main.url(forResource: "logo", withExtension: "svg"),
      let logo = NSImage(contentsOf: url),
      let image = logo.cgImage(forProposedRect: nil, context: nil, hints: nil)
    else {
      log.error("The September Camera bundle has no readable logo.svg")
      return nil
    }

    let size = 80
    guard
      let bitmap = CGContext(
        data: nil,
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
      )
    else { return nil }

    bitmap.interpolationQuality = .high
    bitmap.setAlpha(0.72)
    bitmap.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
    guard let rendered = bitmap.makeImage() else { return nil }
    return CIImage(cgImage: rendered)
  }

  private static func makeOverlay(_ state: CameraOverlayState) -> CIImage? {
    let text = state.text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard state.visible, !text.isEmpty else { return nil }

    let padding: CGFloat = 24
    let width = 1088
    let maxTextHeight: CGFloat = 190
    let font = CTFontCreateWithName("Helvetica Neue" as CFString, 42, nil)
    let attributes: [CFString: Any] = [
      kCTFontAttributeName: font,
      kCTForegroundColorAttributeName: CGColor(
        red: 1,
        green: 1,
        blue: 1,
        alpha: 1
      ),
    ]
    let attributed = CFAttributedStringCreate(
      kCFAllocatorDefault,
      text as CFString,
      attributes as CFDictionary
    )!
    let framesetter = CTFramesetterCreateWithAttributedString(attributed)
    let constraint = CGSize(width: CGFloat(width) - padding * 2, height: maxTextHeight)
    let suggested = CTFramesetterSuggestFrameSizeWithConstraints(
      framesetter,
      CFRange(location: 0, length: 0),
      nil,
      constraint,
      nil
    )
    let height = Int(ceil(min(maxTextHeight, suggested.height) + padding * 2))

    guard
      let bitmap = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
      )
    else { return nil }

    bitmap.setFillColor(CGColor(red: 0.04, green: 0.04, blue: 0.05, alpha: 0.78))
    bitmap.addPath(
      CGPath(
        roundedRect: CGRect(x: 0, y: 0, width: width, height: height),
        cornerWidth: 22,
        cornerHeight: 22,
        transform: nil
      )
    )
    bitmap.fillPath()

    let textRect = CGRect(
      x: padding,
      y: padding,
      width: CGFloat(width) - padding * 2,
      height: CGFloat(height) - padding * 2
    )
    let frame = CTFramesetterCreateFrame(
      framesetter,
      CFRange(location: 0, length: 0),
      CGPath(rect: textRect, transform: nil),
      nil
    )
    CTFrameDraw(frame, bitmap)

    guard let image = bitmap.makeImage() else { return nil }
    return CIImage(cgImage: image)
  }
}

final class SeptemberCameraDeviceSource: NSObject, CMIOExtensionDeviceSource,
  AVCaptureVideoDataOutputSampleBufferDelegate
{
  private(set) var device: CMIOExtensionDevice!

  private let session = AVCaptureSession()
  private let sessionQueue = DispatchQueue(
    label: "app.september.camera.session", qos: .userInitiated)
  private let frameQueue = DispatchQueue(
    label: "app.september.camera.frames", qos: .userInteractive)
  private let stateLock = NSLock()
  private let renderer: OverlayRenderer
  private let formatDescription: CMFormatDescription
  private let bufferPool: CVPixelBufferPool
  private let bufferAuxAttributes: CFDictionary =
    [
      kCVPixelBufferPoolAllocationThresholdKey: 3
    ] as CFDictionary
  private var streamSource: SeptemberCameraStreamSource!
  private var streamingClients = 0
  private var configured = false

  init(localizedName: String) {
    guard let renderer = OverlayRenderer() else {
      fatalError("September Camera needs a Metal device")
    }
    self.renderer = renderer

    var description: CMFormatDescription?
    let descriptionStatus = CMVideoFormatDescriptionCreate(
      allocator: kCFAllocatorDefault,
      codecType: kCVPixelFormatType_32BGRA,
      width: frameWidth,
      height: frameHeight,
      extensions: nil,
      formatDescriptionOut: &description
    )
    guard descriptionStatus == noErr, let description else {
      fatalError("Could not create the September Camera format: \(descriptionStatus)")
    }
    formatDescription = description

    let attributes: CFDictionary =
      [
        kCVPixelBufferWidthKey: frameWidth,
        kCVPixelBufferHeightKey: frameHeight,
        kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA,
        kCVPixelBufferMetalCompatibilityKey: true,
        kCVPixelBufferIOSurfacePropertiesKey: [:] as CFDictionary,
      ] as CFDictionary
    var pool: CVPixelBufferPool?
    let poolStatus = CVPixelBufferPoolCreate(
      kCFAllocatorDefault,
      [kCVPixelBufferPoolMinimumBufferCountKey: 3] as CFDictionary,
      attributes,
      &pool
    )
    guard poolStatus == noErr, let pool else {
      fatalError("Could not create the September Camera buffer pool: \(poolStatus)")
    }
    bufferPool = pool

    super.init()

    device = CMIOExtensionDevice(
      localizedName: localizedName,
      deviceID: cameraDeviceID,
      legacyDeviceID: cameraLegacyID,
      source: self
    )
    let streamFormat = CMIOExtensionStreamFormat(
      formatDescription: description,
      maxFrameDuration: CMTime(value: 1, timescale: frameRate),
      minFrameDuration: CMTime(value: 1, timescale: frameRate),
      validFrameDurations: nil
    )
    streamSource = SeptemberCameraStreamSource(
      localizedName: "September Camera Video",
      streamID: cameraStreamID,
      streamFormat: streamFormat,
      device: device
    )
    do {
      try device.addStream(streamSource.stream)
    } catch {
      fatalError("Could not add the September Camera stream: \(error.localizedDescription)")
    }
  }

  var availableProperties: Set<CMIOExtensionProperty> {
    [.deviceTransportType, .deviceModel, overlayProperty]
  }

  func deviceProperties(
    forProperties properties: Set<CMIOExtensionProperty>
  ) throws -> CMIOExtensionDeviceProperties {
    let result = CMIOExtensionDeviceProperties(dictionary: [:])
    if properties.contains(.deviceTransportType) {
      result.transportType = kIOAudioDeviceTransportTypeVirtual
    }
    if properties.contains(.deviceModel) {
      result.model = "September Text Camera"
    }
    if properties.contains(overlayProperty) {
      result.setPropertyState(
        CMIOExtensionPropertyState(value: CameraOverlayState().encoded() as NSString),
        forProperty: overlayProperty
      )
    }
    return result
  }

  func setDeviceProperties(_ properties: CMIOExtensionDeviceProperties) throws {
    guard
      let value = properties.propertiesDictionary[overlayProperty]?.value as? String,
      let state = CameraOverlayState.decode(value)
    else { return }
    renderer.update(state)
  }

  func startStreaming() throws {
    stateLock.lock()
    streamingClients += 1
    let shouldStart = streamingClients == 1
    stateLock.unlock()
    guard shouldStart else { return }

    try configureCaptureIfNeeded()
    sessionQueue.async { [session] in
      if !session.isRunning { session.startRunning() }
    }
  }

  func stopStreaming() {
    stateLock.lock()
    streamingClients = max(0, streamingClients - 1)
    let shouldStop = streamingClients == 0
    stateLock.unlock()
    guard shouldStop else { return }

    sessionQueue.async { [session] in
      if session.isRunning { session.stopRunning() }
    }
  }

  private func configureCaptureIfNeeded() throws {
    stateLock.lock()
    let alreadyConfigured = configured
    stateLock.unlock()
    if alreadyConfigured { return }

    let discovery = AVCaptureDevice.DiscoverySession(
      deviceTypes: [.builtInWideAngleCamera, .external],
      mediaType: .video,
      position: .unspecified
    )
    guard let camera = discovery.devices.first(where: { $0.uniqueID != cameraLegacyID }) else {
      throw NSError(
        domain: "app.september.desktop.camera",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "This Mac has no physical camera to share."]
      )
    }

    let input = try AVCaptureDeviceInput(device: camera)
    let output = AVCaptureVideoDataOutput()
    output.alwaysDiscardsLateVideoFrames = true
    output.videoSettings = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
      kCVPixelBufferWidthKey as String: frameWidth,
      kCVPixelBufferHeightKey as String: frameHeight,
    ]
    output.setSampleBufferDelegate(self, queue: frameQueue)

    session.beginConfiguration()
    defer { session.commitConfiguration() }
    if session.canSetSessionPreset(.hd1280x720) {
      session.sessionPreset = .hd1280x720
    }
    guard session.canAddInput(input), session.canAddOutput(output) else {
      throw NSError(
        domain: "app.september.desktop.camera",
        code: 2,
        userInfo: [NSLocalizedDescriptionKey: "The physical camera cannot feed September Camera."]
      )
    }
    session.addInput(input)
    session.addOutput(output)

    stateLock.lock()
    configured = true
    stateLock.unlock()
  }

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    guard let source = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

    var destination: CVPixelBuffer?
    let poolStatus = CVPixelBufferPoolCreatePixelBufferWithAuxAttributes(
      kCFAllocatorDefault,
      bufferPool,
      bufferAuxAttributes,
      &destination
    )
    guard poolStatus == noErr, let destination else {
      log.warning("Dropping a frame because the output pool is busy: \(poolStatus)")
      return
    }

    renderer.render(source: source, into: destination)

    let now = CMClockGetTime(CMClockGetHostTimeClock())
    var timing = CMSampleTimingInfo(
      duration: CMTime(value: 1, timescale: frameRate),
      presentationTimeStamp: now,
      decodeTimeStamp: .invalid
    )
    var result: CMSampleBuffer?
    let sampleStatus = CMSampleBufferCreateForImageBuffer(
      allocator: kCFAllocatorDefault,
      imageBuffer: destination,
      dataReady: true,
      makeDataReadyCallback: nil,
      refcon: nil,
      formatDescription: formatDescription,
      sampleTiming: &timing,
      sampleBufferOut: &result
    )
    guard sampleStatus == noErr, let result else { return }
    streamSource.stream.send(
      result,
      discontinuity: [],
      hostTimeInNanoseconds: UInt64(now.seconds * Double(NSEC_PER_SEC))
    )
  }
}

final class SeptemberCameraStreamSource: NSObject, CMIOExtensionStreamSource {
  private(set) var stream: CMIOExtensionStream!
  private let streamFormat: CMIOExtensionStreamFormat
  private let device: CMIOExtensionDevice

  init(
    localizedName: String,
    streamID: UUID,
    streamFormat: CMIOExtensionStreamFormat,
    device: CMIOExtensionDevice
  ) {
    self.streamFormat = streamFormat
    self.device = device
    super.init()
    stream = CMIOExtensionStream(
      localizedName: localizedName,
      streamID: streamID,
      direction: .source,
      clockType: .hostTime,
      source: self
    )
  }

  var formats: [CMIOExtensionStreamFormat] { [streamFormat] }

  var availableProperties: Set<CMIOExtensionProperty> {
    [.streamActiveFormatIndex, .streamFrameDuration]
  }

  func streamProperties(
    forProperties properties: Set<CMIOExtensionProperty>
  ) throws -> CMIOExtensionStreamProperties {
    let result = CMIOExtensionStreamProperties(dictionary: [:])
    if properties.contains(.streamActiveFormatIndex) { result.activeFormatIndex = 0 }
    if properties.contains(.streamFrameDuration) {
      result.frameDuration = CMTime(value: 1, timescale: frameRate)
    }
    return result
  }

  func setStreamProperties(_ properties: CMIOExtensionStreamProperties) throws {
    if let index = properties.activeFormatIndex, index != 0 {
      throw NSError(
        domain: "app.september.desktop.camera",
        code: 3,
        userInfo: [NSLocalizedDescriptionKey: "September Camera has one video format."]
      )
    }
  }

  func authorizedToStartStream(for client: CMIOExtensionClient) -> Bool { true }

  func startStream() throws {
    guard let source = device.source as? SeptemberCameraDeviceSource else {
      fatalError("September Camera has an unexpected device source")
    }
    try source.startStreaming()
  }

  func stopStream() throws {
    guard let source = device.source as? SeptemberCameraDeviceSource else {
      fatalError("September Camera has an unexpected device source")
    }
    source.stopStreaming()
  }
}

final class SeptemberCameraProviderSource: NSObject, CMIOExtensionProviderSource {
  private(set) var provider: CMIOExtensionProvider!
  private var deviceSource: SeptemberCameraDeviceSource!

  init(clientQueue: DispatchQueue?) {
    super.init()
    provider = CMIOExtensionProvider(source: self, clientQueue: clientQueue)
    deviceSource = SeptemberCameraDeviceSource(localizedName: "September Camera")
    do {
      try provider.addDevice(deviceSource.device)
    } catch {
      fatalError("Could not publish September Camera: \(error.localizedDescription)")
    }
  }

  func connect(to client: CMIOExtensionClient) throws {}
  func disconnect(from client: CMIOExtensionClient) {}

  var availableProperties: Set<CMIOExtensionProperty> { [.providerManufacturer] }

  func providerProperties(
    forProperties properties: Set<CMIOExtensionProperty>
  ) throws -> CMIOExtensionProviderProperties {
    let result = CMIOExtensionProviderProperties(dictionary: [:])
    if properties.contains(.providerManufacturer) { result.manufacturer = "September" }
    return result
  }

  func setProviderProperties(_ properties: CMIOExtensionProviderProperties) throws {}
}
