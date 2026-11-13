import SwiftUI

/// Holds the tree that the Tree tab shows. The app fills it in; the view only
/// draws.
@MainActor
public final class AXTreeModel: ObservableObject {
    @Published public var tree: AXTree = .empty

    public init() {}

    /// Shows the tree. While the bar hides the text of the field, the tree
    /// shows no value on the focused element.
    public func show(_ tree: AXTree, hidingFocusedValue: Bool) {
        self.tree = hidingFocusedValue ? tree.hidingFocusedValue() : tree
    }
}

/// The tabs of the Debug panel.
public enum DebugTab: String, CaseIterable, Sendable {
    case context
    case records
    case tree

    public var title: String {
        switch self {
        case .context: "Context"
        case .records: "Records"
        case .tree: "Tree"
        }
    }
}

/// The state of the Debug panel: the tab, the tree, and the records. The
/// Context tab reads the prediction engine directly.
@MainActor
public final class DebugPanelModel: ObservableObject {
    @Published public var tab: DebugTab = .context
    @Published public private(set) var tables: [RecordTable] = []
    /// The table that the Records tab shows.
    @Published public private(set) var table: String?
    @Published public private(set) var rows: [RecordRow] = []
    public let tree: AXTreeModel
    /// Reads the tree again. The app sets it, because the read needs the
    /// running app.
    public var onRefreshTree: (() -> Void)?
    private let records: RecordBrowser?

    public init(records: RecordBrowser?, tree: AXTreeModel = AXTreeModel()) {
        self.records = records
        self.tree = tree
    }

    /// Reads the counts of the tables and the rows of the picked table. The
    /// first table is picked when none is.
    public func reloadRecords() {
        guard let records else { return }
        tables = records.tables()
        if table == nil || !tables.contains(where: { $0.name == table }) {
            table = tables.first?.name
        }
        rows = table.map { records.rows(in: $0) } ?? []
    }

    public func pick(table: String) {
        self.table = table
        reloadRecords()
    }

    /// The refresh button reads the tree and the records again.
    public func refresh() {
        onRefreshTree?()
        reloadRecords()
    }
}

/// The Debug panel: the context of the predictions, the records of the
/// database, and the accessibility tree of the app in front. It sits at the
/// right edge of the screen, the height of the keyboard.
public struct DebugPanelView: View {
    @ObservedObject private var model: DebugPanelModel
    @ObservedObject private var tree: AXTreeModel
    @ObservedObject private var predictions: PredictionEngine
    @ObservedObject private var permission: AccessibilityPermission
    private let height: CGFloat
    private let scrolls: Bool

    /// `scrolls: false` is for `--snapshot`: `ImageRenderer` draws nothing
    /// inside a `ScrollView`, so the rows would come out blank.
    public init(
        model: DebugPanelModel,
        predictions: PredictionEngine,
        permission: AccessibilityPermission,
        height: CGFloat,
        scrolls: Bool = true
    ) {
        self.model = model
        tree = model.tree
        self.predictions = predictions
        self.permission = permission
        self.height = height
        self.scrolls = scrolls
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Metrics.Tree.spacing) {
            header
            tabs
            if scrolls {
                ScrollView { content }
                    .scrollIndicators(.never)
            } else {
                content
            }
        }
        .padding(Metrics.Tree.padding)
        .frame(width: Metrics.treeViewerWidth, height: height, alignment: .topLeading)
        .clipped()
        .panelSurface()
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Debug panel for \(tree.tree.appName)")
    }

    @ViewBuilder
    private var content: some View {
        VStack(alignment: .leading, spacing: Metrics.Debug.groupSpacing) {
            switch model.tab {
            case .context: DebugContextView(predictions: predictions)
            case .records: DebugRecordsView(model: model)
            case .tree: treeRows
            }
            Spacer(minLength: 0)
        }
        .padding(.bottom, Metrics.Tree.listBottom)
    }

    private var header: some View {
        HStack(spacing: Metrics.Tree.headerSpacing) {
            VStack(alignment: .leading, spacing: Metrics.Tree.titleSpacing) {
                SectionLabel(text: "Debug")
                Text(tree.tree.appName.isEmpty ? "—" : tree.tree.appName)
                    .font(Typography.treeTitle)
                    .foregroundStyle(Color(Tokens.keyText))
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            Button {
                model.refresh()
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(Typography.treeRefreshIcon)
                    .foregroundStyle(Color(Tokens.labelSecondary))
                    .frame(width: Metrics.Tree.refreshButton, height: Metrics.Tree.refreshButton)
                    .background(Circle().fill(Color(Tokens.key)))
                    .overlay(Circle().strokeBorder(Color(Tokens.strokeStandard), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Refresh")
        }
    }

    private var tabs: some View {
        HStack(spacing: Metrics.Debug.tabsPadding) {
            ForEach(DebugTab.allCases, id: \.self) { tab in
                let isOn = model.tab == tab
                Button {
                    model.tab = tab
                    if tab == .records { model.reloadRecords() }
                } label: {
                    Text(tab.title)
                        .font(Typography.debugTab)
                        .foregroundStyle(Color(isOn ? Tokens.keyText : Tokens.labelSecondary))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Metrics.Debug.tabVerticalPadding)
                        .background(
                            RoundedRectangle(cornerRadius: Metrics.Debug.tabCornerRadius, style: .continuous)
                                .fill(isOn ? Color(Tokens.key) : Color.clear))
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.title)
                .accessibilityAddTraits(isOn ? .isSelected : [])
            }
        }
        .padding(Metrics.Debug.tabsPadding)
        .background(
            RoundedRectangle(cornerRadius: Metrics.Debug.tabsCornerRadius, style: .continuous)
                .fill(Color(Tokens.keySpecial)))
    }

    /// Not lazy: the tree is capped at a few hundred rows anyway, and a lazy
    /// stack renders as nothing when the window is snapshotted.
    @ViewBuilder
    private var treeRows: some View {
        if !permission.isTrusted {
            DebugMessage(text: "Accessibility access is off, so no tree can be read.")
        } else if tree.tree.root == nil {
            DebugMessage(text: "Nothing in front to read.")
        } else {
            VStack(alignment: .leading, spacing: Metrics.Tree.rowGap) {
                ForEach(tree.tree.rows()) { row in
                    AXTreeRowView(row: row)
                }
            }
        }
    }
}

// MARK: - Context

/// The last prediction context and what the model gave for it.
private struct DebugContextView: View {
    @ObservedObject var predictions: PredictionEngine

    var body: some View {
        if let context = predictions.context {
            input(context)
            if context.mode == .type, let screen = context.screen { self.screen(screen) }
            said(context)
            sentences
            words
        } else {
            DebugMessage(text: emptyMessage)
        }
    }

    /// Why there is no context. A password field and private text give no
    /// text to the keyboard.
    private var emptyMessage: String {
        switch predictions.notice {
        case .passwordField: "Password field. The keyboard reads no text here."
        case .privateText: "Private text. The keyboard reads no text here."
        default: "No text to predict from."
        }
    }

    private func input(_ context: PredictionContext) -> some View {
        let partial = context.partialWord
        let before = String(context.typed.dropLast(partial.count))
        return DebugGroup(title: "Input", note: context.mode == .type ? "Type" : "Talk") {
            (Text(before)
                + Text(partial).underline(color: Color(Tokens.accent))
                + Text("|").foregroundColor(Color(Tokens.accent))
                + Text(context.following).foregroundColor(Color(Tokens.dualSecondary)))
                .font(Typography.debugField)
                .foregroundStyle(Color(Tokens.keyText))
                .frame(maxWidth: .infinity, alignment: .leading)
                .debugBox(fill: Tokens.key)
            DebugPair(key: "caret", value: "\(context.caret) / \(context.text.utf16.count)")
            DebugPair(key: "partial", value: partial.isEmpty ? "none" : "\"\(partial)\"")
        }
    }

    private func screen(_ screen: ScreenContext) -> some View {
        DebugGroup(title: "Screen", note: "\(screen.lines.count) lines") {
            DebugPair(key: "App", value: screen.appName ?? "—")
            DebugPair(key: "Title", value: screen.title ?? "—")
            DebugPair(key: "Field", value: screen.field ?? "—")
            DebugLines(lines: screen.lines)
        }
    }

    private func said(_ context: PredictionContext) -> some View {
        let sent = context.said.suffix(SuggestionPrompt.maxSaidLines)
        return DebugGroup(title: "Said", note: "\(sent.count) sent") {
            if sent.isEmpty {
                DebugMessage(text: "Nothing said yet.")
            } else {
                DebugLines(lines: Array(sent))
            }
        }
    }

    @ViewBuilder
    private var sentences: some View {
        if let trace = predictions.trace {
            DebugGroup(title: "Sentences", note: trace.duration.map(Self.milliseconds) ?? "waiting") {
                ForEach(Array(trace.sentences.enumerated()), id: \.offset) { index, sentence in
                    DebugPair(key: "\(index + 1)", value: sentence)
                }
                ForEach(Array(trace.dropped.enumerated()), id: \.offset) { _, answer in
                    DebugPair(key: "dropped", value: answer, tone: Tokens.warning)
                }
            }
            DebugGroup(title: "Instructions", note: "\(trace.prompt.instructions.count) characters") {
                DebugCode(text: trace.prompt.instructions)
            }
            DebugGroup(title: "Prompt", note: "\(trace.prompt.prompt.count) characters") {
                DebugCode(text: trace.prompt.prompt)
            }
        } else {
            DebugGroup(title: "Sentences", note: "not asked") {
                DebugMessage(text: notAsked)
            }
        }
    }

    private var notAsked: String {
        if !predictions.sentencesEnabled { return "Sentence predictions are off." }
        if predictions.availability != .ready { return "Apple Intelligence is not ready." }
        return "The model is asked after the user types a letter."
    }

    private var words: some View {
        DebugGroup(title: "Words", note: "\(predictions.words.count)") {
            DebugMessage(text: predictions.words.isEmpty ? "none" : predictions.words.map(\.word).joined(separator: " · "))
        }
    }

    private static func milliseconds(_ duration: Duration) -> String {
        let (seconds, attoseconds) = duration.components
        return "\(seconds * 1000 + attoseconds / 1_000_000_000_000_000) ms"
    }
}

// MARK: - Records

/// The tables of `keyboard.sqlite` and the rows of the picked table. It
/// changes nothing.
private struct DebugRecordsView: View {
    @ObservedObject var model: DebugPanelModel

    var body: some View {
        // Not lazy: a lazy grid renders as nothing when the window is
        // snapshotted.
        Grid(horizontalSpacing: Metrics.Debug.itemSpacing, verticalSpacing: Metrics.Debug.itemSpacing) {
            ForEach(Array(stride(from: 0, to: model.tables.count, by: Self.columns)), id: \.self) { start in
                GridRow {
                    ForEach(model.tables[start..<min(start + Self.columns, model.tables.count)]) { table in
                        chip(table)
                    }
                }
            }
        }
        if model.rows.isEmpty {
            DebugMessage(text: "No rows.")
        } else {
            let now = Date()
            VStack(alignment: .leading, spacing: Metrics.Tree.rowGap) {
                ForEach(model.rows) { row in
                    VStack(alignment: .leading, spacing: Metrics.Tree.titleSpacing) {
                        Text(row.title)
                            .font(Typography.treeText)
                            .foregroundStyle(Color(Tokens.keyText))
                            .lineLimit(1)
                        Text(row.details.map { "\($0.column) \($0.formatted(at: now))" }.joined(separator: " · "))
                            .font(Typography.debugMeta)
                            .foregroundStyle(Color(Tokens.dualSecondary))
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, Metrics.Tree.rowVerticalPadding)
                    .padding(.horizontal, Metrics.Tree.rowHorizontalPadding)
                    .background(
                        RoundedRectangle(cornerRadius: Metrics.Tree.rowCornerRadius, style: .continuous)
                            .fill(row.id.isMultiple(of: 2) ? Color(Tokens.keySpecial) : Color.clear))
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
}

extension DebugRecordsView {
    fileprivate static let columns = 3

    fileprivate func chip(_ table: RecordTable) -> some View {
        let isOn = model.table == table.name
        return Button {
            model.pick(table: table.name)
        } label: {
            Text("\(table.name) \(table.count)")
                .font(Typography.debugChip)
                .foregroundStyle(Color(isOn ? Tokens.keyText : Tokens.labelSecondary))
                .lineLimit(1)
                .minimumScaleFactor(Metrics.Debug.chipScale)
                .padding(.horizontal, Metrics.Debug.chipHorizontalPadding)
                .padding(.vertical, Metrics.Debug.chipVerticalPadding)
                .frame(maxWidth: .infinity)
                .background(Capsule().fill(Color(isOn ? Tokens.selection : Tokens.key)))
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(table.name), \(table.count) rows")
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

// MARK: - Parts

/// A titled group of the Context tab.
private struct DebugGroup<Content: View>: View {
    let title: String
    let note: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: Metrics.Debug.itemSpacing) {
            HStack(alignment: .firstTextBaseline) {
                SectionLabel(text: title)
                Text(note)
                    .font(Typography.debugMeta)
                    .foregroundStyle(Color(Tokens.sectionLabel))
                    .lineLimit(1)
                    .fixedSize()
            }
            content
        }
        .accessibilityElement(children: .contain)
    }
}

/// A name and its value on one line.
private struct DebugPair: View {
    let key: String
    let value: String
    var tone: ThemeColor = Tokens.keyText

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Metrics.Tree.columnSpacing) {
            Text(key)
                .foregroundStyle(Color(Tokens.dualSecondary))
                .frame(width: Metrics.Debug.keyColumn, alignment: .leading)
            Text(value)
                .foregroundStyle(Color(tone))
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .font(Typography.treeText)
        .accessibilityElement(children: .combine)
    }
}

/// Lines of text, one row each.
private struct DebugLines: View {
    let lines: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: Metrics.Tree.rowGap) {
            ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                Text(line)
                    .font(Typography.treeText)
                    .foregroundStyle(Color(Tokens.keyText))
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, Metrics.Tree.rowVerticalPadding)
                    .padding(.horizontal, Metrics.Tree.rowHorizontalPadding)
                    .background(
                        RoundedRectangle(cornerRadius: Metrics.Tree.rowCornerRadius, style: .continuous)
                            .fill(index.isMultiple(of: 2) ? Color(Tokens.keySpecial) : Color.clear))
            }
        }
    }
}

/// Text that went to the model, as it went.
private struct DebugCode: View {
    let text: String

    var body: some View {
        Text(text)
            .font(Typography.debugCode)
            .foregroundStyle(Color(Tokens.shortcutLabel))
            .frame(maxWidth: .infinity, alignment: .leading)
            .debugBox(fill: Tokens.keySpecial)
    }
}

private struct DebugMessage: View {
    let text: String

    var body: some View {
        Text(text)
            .font(Typography.treeMessage)
            .foregroundStyle(Color(Tokens.dualSecondary))
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

extension View {
    fileprivate func debugBox(fill: ThemeColor) -> some View {
        padding(Metrics.Debug.boxPadding)
            .background(
                RoundedRectangle(cornerRadius: Metrics.Debug.boxCornerRadius, style: .continuous)
                    .fill(Color(fill)))
    }
}

// MARK: - Tree

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
                .fill(row.node.isFocused ? Color(Tokens.selection) : Color.clear))
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
