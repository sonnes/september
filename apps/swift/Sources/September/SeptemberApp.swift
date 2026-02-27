import AppKit
import SwiftUI

@main
struct SeptemberApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate

  var body: some Scene {
    // Use Settings as a dummy scene — the real UI is in the floating panel
    Settings {
      EmptyView()
    }
  }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
  private var panel: FloatingPanel?
  private var predictionsPanel: NSPanel?
  private var statusItem: NSStatusItem?
  private let accessibility = AccessibilityManager()
  private let typingTracker = TypingTracker()
  private var predictionsObservation: Task<Void, Never>?

  func applicationDidFinishLaunching(_ notification: Notification) {
    accessibility.requestPermission()

    let hostingView = NSHostingView(rootView: KeyboardView(typingTracker: typingTracker))
    hostingView.translatesAutoresizingMaskIntoConstraints = false

    panel = FloatingPanel(contentView: hostingView)
    panel?.orderFront(nil)

    setupPredictionsPanel()
    setupMenuBar()
  }

  private func setupPredictionsPanel() {
    guard let keyboardPanel = panel else { return }

    let predictionsView = NSHostingView(rootView: SentencePredictionsView(tracker: typingTracker))

    let predPanel = NSPanel(
      contentRect: .zero,
      styleMask: [.nonactivatingPanel],
      backing: .buffered,
      defer: false
    )
    predPanel.contentView = predictionsView
    predPanel.level = .floating
    predPanel.isFloatingPanel = true
    predPanel.hidesOnDeactivate = false
    predPanel.isReleasedWhenClosed = false
    predPanel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
    predPanel.isOpaque = false
    predPanel.backgroundColor = .clear
    predPanel.hasShadow = false

    predictionsPanel = predPanel
    keyboardPanel.addChildWindow(predPanel, ordered: .above)

    repositionPredictionsPanel()

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(keyboardPanelDidMove),
      name: NSWindow.didMoveNotification,
      object: keyboardPanel
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(keyboardPanelDidMove),
      name: NSWindow.didResizeNotification,
      object: keyboardPanel
    )

    // Observe prediction changes to resize the panel
    startObservingPredictions()
  }

  private func startObservingPredictions() {
    predictionsObservation = Task { [weak self] in
      while !Task.isCancelled {
        guard let self else { return }
        _ = withObservationTracking {
          self.typingTracker.sentencePredictions
        } onChange: {}
        try? await Task.sleep(for: .milliseconds(50))
        // Defer to next run loop to avoid conflicting with AppKit's layout cycle
        DispatchQueue.main.async { self.repositionPredictionsPanel() }
      }
    }
  }

  @objc private func keyboardPanelDidMove() {
    repositionPredictionsPanel()
  }

  private func repositionPredictionsPanel() {
    guard let keyboardPanel = panel, let predPanel = predictionsPanel else { return }

    if typingTracker.sentencePredictions.isEmpty {
      if predPanel.isVisible {
        predPanel.orderOut(nil)
      }
      return
    }

    let width = keyboardPanel.frame.width
    // Estimate height: ~36pt per prediction + 16pt padding
    let count = CGFloat(typingTracker.sentencePredictions.count)
    let height = count * 36 + 16

    let origin = NSPoint(
      x: keyboardPanel.frame.origin.x,
      y: keyboardPanel.frame.maxY + 4
    )
    predPanel.setFrame(
      NSRect(origin: origin, size: NSSize(width: width, height: height)),
      display: true
    )

    if !predPanel.isVisible {
      predPanel.orderFront(nil)
    }
  }

  private func setupMenuBar() {
    statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

    if let button = statusItem?.button {
      button.image = NSImage(systemSymbolName: "keyboard", accessibilityDescription: "September")
    }

    let menu = NSMenu()

    let showItem = NSMenuItem(
      title: "Show Keyboard", action: #selector(showKeyboard), keyEquivalent: "k")
    showItem.keyEquivalentModifierMask = [.command, .shift]
    menu.addItem(showItem)

    let hideItem = NSMenuItem(
      title: "Hide Keyboard", action: #selector(hideKeyboard), keyEquivalent: "k")
    hideItem.keyEquivalentModifierMask = [.command, .shift, .option]
    menu.addItem(hideItem)

    menu.addItem(.separator())

    let accessibilityItem = NSMenuItem(
      title: "Accessibility: Checking…", action: nil, keyEquivalent: "")
    accessibilityItem.tag = 100
    menu.addItem(accessibilityItem)
    updateAccessibilityMenuItem()

    menu.addItem(.separator())

    menu.addItem(
      NSMenuItem(
        title: "Quit September", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
    )

    statusItem?.menu = menu
  }

  private func updateAccessibilityMenuItem() {
    guard let menu = statusItem?.menu,
      let item = menu.item(withTag: 100)
    else { return }

    if accessibility.isGranted {
      item.title = "Accessibility: Granted"
      item.image = NSImage(systemSymbolName: "checkmark.circle.fill", accessibilityDescription: nil)
    } else {
      item.title = "Grant Accessibility…"
      item.action = #selector(requestAccessibility)
      item.target = self
      item.image = NSImage(
        systemSymbolName: "exclamationmark.triangle", accessibilityDescription: nil)
    }
  }

  @objc private func showKeyboard() {
    panel?.orderFront(nil)
  }

  @objc private func hideKeyboard() {
    panel?.orderOut(nil)
  }

  @objc private func requestAccessibility() {
    accessibility.requestPermission()
    updateAccessibilityMenuItem()
  }
}
