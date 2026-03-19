import SwiftData
import SwiftUI

// MARK: - WriterViewWrapper
//
// Bridges the AppDelegate-provided initial document into a @Query-driven
// WriterView. Manages the current document selection.

struct WriterViewWrapper: View {
    var writerState: WriterState
    var initialDocument: Document?

    @Query(sort: \Document.updatedAt, order: .reverse) private var documents: [Document]
    @State private var currentDocument: Document?

    var body: some View {
        WriterView(
            writerState: writerState,
            document: $currentDocument
        )
        .onAppear {
            currentDocument = initialDocument ?? documents.first
        }
    }
}
