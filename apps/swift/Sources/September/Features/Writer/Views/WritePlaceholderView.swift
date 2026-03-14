import SwiftUI

struct WritePlaceholderView: View {
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundStyle(DesignColors.primary)

            Text("Write Mode")
                .font(Typography.heading())
                .foregroundStyle(DesignColors.foreground)

            Text("Floating markdown editor with focus modes")
                .font(Typography.body())
                .foregroundStyle(DesignColors.mutedForeground)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignColors.background)
    }
}
