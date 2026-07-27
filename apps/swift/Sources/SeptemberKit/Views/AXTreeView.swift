import SwiftUI

/// Holds the tree the viewer shows. The app fills it in; the view only draws.
@MainActor
public final class AXTreeModel: ObservableObject {
    @Published public var tree: AXTree = .empty
    /// Set when macOS has not granted us accessibility — there is nothing to
    /// read, and saying so beats an empty window.
    @Published public var isTrusted = true
    public var onRefresh: (() -> Void)?

    public init() {}
}

/// The accessibility tree of the app in front, the same one September reads to
/// find the field it types into. It sits at the right edge of the screen, the
/// height of the keyboard.
public struct AXTreeView: View {
    @ObservedObject private var model: AXTreeModel
    private let height: CGFloat
    private let scrolls: Bool

    /// `scrolls: false` is for `--snapshot`: `ImageRenderer` draws nothing
    /// inside a `ScrollView`, so the rows would come out blank.
    public init(model: AXTreeModel, height: CGFloat, scrolls: Bool = true) {
        self.model = model
        self.height = height
        self.scrolls = scrolls
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            header

            if !model.isTrusted {
                message("Accessibility access is off, so no tree can be read.")
            } else if model.tree.root == nil {
                message("Nothing in front to read.")
            } else {
                if scrolls {
                    ScrollView {
                        rows
                    }
                    .scrollIndicators(.never)
                } else {
                    rows
                }
            }
        }
        .padding(12)
        .frame(width: Metrics.treeViewerWidth, height: height, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(Tokens.panelBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color(Tokens.panelStroke), lineWidth: 1)
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Accessibility tree for \(model.tree.appName)")
    }

    /// Not lazy: the tree is capped at a few hundred rows anyway, and a lazy
    /// stack renders as nothing when the window is snapshotted.
    private var rows: some View {
        VStack(alignment: .leading, spacing: 1) {
            ForEach(model.tree.rows()) { row in
                AXTreeRowView(row: row)
            }
            Spacer(minLength: 0)
        }
        .padding(.bottom, 8)
    }

    private var header: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                SectionLabel(text: "ACCESSIBILITY TREE")
                Text(model.tree.appName.isEmpty ? "—" : model.tree.appName)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color(Tokens.keyText))
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            Button {
                model.onRefresh?()
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color(Tokens.labelSecondary))
                    .frame(width: 28, height: 28)
                    .background(Circle().fill(Color(Tokens.key)))
                    .overlay(Circle().strokeBorder(Color(Tokens.strokeStandard), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Refresh the tree")
        }
    }

    private func message(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12))
            .foregroundStyle(Color(Tokens.dualSecondary))
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// One element: its role, then whatever identifies it, then its text.
private struct AXTreeRowView: View {
    let row: AXTreeRow

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Color.clear.frame(width: CGFloat(row.depth) * 10, height: 1)

            Text(row.node.title)
                .font(.system(size: 11, weight: row.node.isFocused ? .semibold : .regular, design: .monospaced))
                .foregroundStyle(Color(row.node.isFocused ? Tokens.accent : Tokens.shortcutLabel))
                .lineLimit(1)
                .layoutPriority(1)

            if let subtitle = row.node.subtitle {
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(Color(Tokens.keyText))
                    .lineLimit(1)
            }
            if let detail = row.node.detail {
                Text(detail)
                    .font(.system(size: 11))
                    .foregroundStyle(Color(Tokens.dualSecondary))
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 2)
        .padding(.horizontal, 4)
        .background(
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(row.node.isFocused ? Color(Tokens.selection) : Color.clear)
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            row.node.isFocused
                ? "Focused. \(row.node.spokenDescription)" : row.node.spokenDescription
        )
    }
}
