import SwiftUI

struct ContentView: View {
    @State private var selectedTab: AppTab = .type

    var body: some View {
        TabView(selection: $selectedTab) {
            Text("Type")
                .tabItem { Label("Type", systemImage: "keyboard") }
                .tag(AppTab.type)

            TalkPlaceholderView()
                .tabItem { Label("Talk", systemImage: "waveform") }
                .tag(AppTab.talk)

            Text("Write — opens in floating panel")
                .tabItem { Label("Write", systemImage: "doc.text") }
                .tag(AppTab.write)

            SettingsPlaceholderView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(AppTab.settings)
        }
    }
}
