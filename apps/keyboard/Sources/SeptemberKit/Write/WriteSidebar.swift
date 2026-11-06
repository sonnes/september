import SwiftUI

/// The document list of the Write window, newest first. A press on a row
/// opens the document.
public struct WriteSidebar: View {
    @ObservedObject private var model: WriteModel

    public init(model: WriteModel) {
        self.model = model
    }

    public var body: some View {
        List(selection: selection) {
            Section("Documents") {
                ForEach(model.documents) { document in
                    row(document).tag(document.url)
                }
            }
        }
        .listStyle(.sidebar)
        .safeAreaInset(edge: .bottom) {
            if let failure = model.failure {
                Label(failure, systemImage: "exclamationmark.triangle")
                    .font(Typography.writeDocumentDate)
                    .padding(Metrics.writeNoticePadding)
            }
        }
    }

    private var selection: Binding<URL?> {
        Binding(
            get: { model.current?.url },
            set: { url in if let url { model.select(url) } }
        )
    }

    private func row(_ document: WriteDocument) -> some View {
        VStack(alignment: .leading, spacing: Metrics.writeRowSpacing) {
            Text(document.title)
                .font(Typography.writeDocumentTitle)
                .lineLimit(1)
            // "Now" turns into the time a minute later.
            TimelineView(.everyMinute) { context in
                Text(WriteDocument.dateLabel(document.modified, now: context.date))
                    .font(Typography.writeDocumentDate)
                    .foregroundStyle(.secondary)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
