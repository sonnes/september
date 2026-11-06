import SwiftUI

/// The App Panels page of Settings. It shows one app at a time: the panel
/// switch, the learning switch, the shortcuts by use, and Reset Usage.
///
/// The page sits in the Settings window, a normal window, so it uses the
/// standard macOS controls.
public struct AppPanelsSettingsPage: View {
    @ObservedObject private var model: AppPanelModel
    @ObservedObject private var usage: UsageStore
    @ObservedObject private var learner: ShortcutLearner
    @ObservedObject private var settings: AppPanelSettings
    @State private var selection: String?

    public init(model: AppPanelModel) {
        self.model = model
        usage = model.usage
        learner = model.learner
        settings = model.settings
    }

    public var body: some View {
        let apps = model.apps
        let app = apps.first { $0.bundleID == selection } ?? apps.first

        Form {
            Section {
                Picker("App", selection: Binding(get: { app?.bundleID }, set: { selection = $0 })) {
                    ForEach(apps) { Text($0.name).tag(Optional($0.bundleID)) }
                }
                if let app {
                    Toggle(
                        "Show the \(app.name) panel",
                        isOn: Binding(
                            get: { settings.isPanelOn(app.bundleID) },
                            set: { model.setPanelOn($0, for: app.bundleID) }))
                    Toggle(
                        "Learn from the shortcuts I press",
                        isOn: Binding(
                            get: { settings.isLearningOn(app.bundleID) },
                            set: { model.setLearningOn($0, for: app.bundleID) }))
                }
            }

            if let app {
                mostUsed(app)
                Section {
                    Button("Reset Usage for \(app.name)") { model.resetUsage(bundleID: app.bundleID) }
                }
            }
        }
        .formStyle(.grouped)
    }

    private func mostUsed(_ app: AppPanelModel.App) -> some View {
        let rows = model.mostUsed(bundleID: app.bundleID)
        return Section {
            if rows.isEmpty {
                Text("No uses yet.")
                    .foregroundStyle(.secondary)
            }
            ForEach(Array(rows.enumerated()), id: \.element.button.id) { rank, row in
                LabeledContent {
                    HStack {
                        if let hint = row.button.hint { Text(hint) }
                        Text(row.uses == 1 ? "1 use" : "\(row.uses) uses")
                    }
                    .foregroundStyle(.secondary)
                } label: {
                    HStack {
                        Text("\(rank + 1)")
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                        Text(row.button.label)
                        if row.button.isLearned {
                            Text("Learned")
                                .font(.caption)
                                .foregroundStyle(.tint)
                        }
                    }
                }
                .accessibilityElement(children: .combine)
            }
        } header: {
            Text("Most Used in \(app.name)")
        } footer: {
            Text("The counts are for the last two weeks. They stay on this Mac.")
        }
    }
}
