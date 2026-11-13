import SwiftUI

/// Holds the tree the viewer shows. The app fills it in; the view only draws.
@MainActor
public final class AXTreeModel: ObservableObject {
    @Published public var tree: AXTree = .empty
    public var onRefresh: (() -> Void)?

    public init() {}

    /// Shows the tree. While the bar hides the text of the field, the tree
    /// shows no value on the focused element.
    public func show(_ tree: AXTree, hidingFocusedValue: Bool) {
        self.tree = hidingFocusedValue ? tree.hidingFocusedValue() : tree
    }
}

/// The accessibility tree of the app in front. It sits at the right edge of
/// the screen, the height of the keyboard.
public struct AXTreeView: View {
    @ObservedObject private var model: AXTreeModel
    @ObservedObject private var permission: AccessibilityPermission
    private let height: CGFloat
    private let scrolls: Bool

    /// `scrolls: false` is for `--snapshot`: `ImageRenderer` draws nothing
    /// inside a `ScrollView`, so the rows would come out blank.
    public init(
        model: AXTreeModel,
        permission: AccessibilityPermission,
        height: CGFloat,
        scrolls: Bool = true
    ) {
        self.model = model
        self.permission = permission
        self.height = height
        self.scrolls = scrolls
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Metrics.Tree.spacing) {
            header

            if !permission.isTrusted {
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
        .padding(Metrics.Tree.padding)
        .frame(width: Metrics.treeViewerWidth, height: height, alignment: .topLeading)
        .panelSurface()
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Accessibility tree for \(model.tree.appName)")
    }

    /// Not lazy: the tree is capped at a few hundred rows anyway, and a lazy
    /// stack renders as nothing when the window is snapshotted.
    private var rows: some View {
        VStack(alignment: .leading, spacing: Metrics.Tree.rowGap) {
            ForEach(model.tree.rows()) { row in
                AXTreeRowView(row: row)
            }
            Spacer(minLength: 0)
        }
        .padding(.bottom, Metrics.Tree.listBottom)
    }

    private var header: some View {
        HStack(spacing: Metrics.Tree.headerSpacing) {
            VStack(alignment: .leading, spacing: Metrics.Tree.titleSpacing) {
                SectionLabel(text: "ACCESSIBILITY TREE")
                Text(model.tree.appName.isEmpty ? "—" : model.tree.appName)
                    .font(Typography.treeTitle)
                    .foregroundStyle(Color(Tokens.keyText))
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            Button {
                model.onRefresh?()
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(Typography.treeRefreshIcon)
                    .foregroundStyle(Color(Tokens.labelSecondary))
                    .frame(width: Metrics.Tree.refreshButton, height: Metrics.Tree.refreshButton)
                    .background(Circle().fill(Color(Tokens.key)))
                    .overlay(Circle().strokeBorder(Color(Tokens.strokeStandard), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Refresh the tree")
        }
    }

    private func message(_ text: String) -> some View {
        Text(text)
            .font(Typography.treeMessage)
            .foregroundStyle(Color(Tokens.dualSecondary))
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// One element: its role, then whatever identifies it, then its text.
private struct AXTreeRowView: View {
    let row: AXTreeRow

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Metrics.Tree.columnSpacing) {
            Color.clear.frame(width: CGFloat(row.depth) * Metrics.Tree.indent, height: 1)

            Text(disclosure)
                .font(Typography.treeDisclosure)
                .foregroundStyle(Color(Tokens.sectionLabel))
                .frame(width: Metrics.Tree.disclosureWidth, alignment: .leading)

            Text(row.node.role)
                .font(Typography.treeRole(focused: row.node.isFocused))
                .foregroundStyle(Color(row.node.isFocused ? Tokens.accent : Tokens.shortcutLabel))
                .lineLimit(1)
                .layoutPriority(1)

            if let label = row.node.label {
                Text(label)
                    .font(Typography.treeText)
                    .foregroundStyle(Color(Tokens.keyText))
                    .lineLimit(1)
            }
            if let detail = row.node.detail {
                Text(detail)
                    .font(Typography.treeText)
                    .foregroundStyle(Color(Tokens.dualSecondary))
                    .lineLimit(1)
            }
            if row.hiddenChildren > 0 {
                Text("\(row.hiddenChildren)")
                    .font(Typography.treeCount)
                    .foregroundStyle(Color(Tokens.sectionLabel))
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, Metrics.Tree.rowVerticalPadding)
        .padding(.horizontal, Metrics.Tree.rowHorizontalPadding)
        .background(
            RoundedRectangle(cornerRadius: Metrics.Tree.rowCornerRadius, style: .continuous)
                .fill(row.node.isFocused ? Color(Tokens.selection) : Color.clear)
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(row.spokenLabel)
    }

    private var disclosure: String {
        switch row.disclosure {
        case .open: "▾"
        case .shut: "▸"
        case .none: ""
        }
    }
}
