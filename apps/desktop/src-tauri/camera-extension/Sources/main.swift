import CoreMediaIO
import Foundation

let providerSource = SeptemberCameraProviderSource(clientQueue: nil)
CMIOExtensionProvider.startService(provider: providerSource.provider)
CFRunLoopRun()
