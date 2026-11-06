extension KeyboardController {
    /// Presses a button of My Panel: its keys, each key of its sequence in
    /// order, or its text.
    public func perform(_ button: UserButton) {
        for action in button.panelActions { perform(action) }
    }
}

extension FocusedField {
    /// The field with no text, for a field that holds private text.
    var withoutText: FocusedField {
        var field = self
        field.text = nil
        field.selection = nil
        return field
    }
}
