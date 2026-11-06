import SwiftUI

/// The Accessibility page: the state of the Accessibility permission, and a
/// button that opens System Settings when the permission is off.
public struct AccessibilitySettingsPage: View {
    @ObservedObject private var permission: AccessibilityPermission

    public init(permission: AccessibilityPermission) {
        self.permission = permission
    }

    public var body: some View {
        Form {
            Section {
                LabeledContent("Accessibility access") {
                    if permission.isTrusted {
                        Label("On", systemImage: "checkmark.circle.fill")
                    } else {
                        Label("Off", systemImage: "exclamationmark.triangle.fill")
                    }
                }
                if !permission.isTrusted {
                    LabeledContent("Turn on access in System Settings") {
                        Button("Open System Settings") { permission.openSettings() }
                    }
                }
            } footer: {
                Text(
                    "Keyboard needs Accessibility access to type into other apps and to read the text field that you type into."
                )
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .formStyle(.grouped)
    }
}
