import Foundation

/// Where the text of private buttons lives. The app uses the Keychain, and the
/// tests use memory.
public protocol PrivateTextStore: Sendable {
    func text(for id: String) throws -> String?
    func setText(_ text: String, for id: String) throws
    func removeText(for id: String) throws
}

/// Private text as generic passwords: service `com.september.keyboard.private`,
/// account = the ID of the button.
public struct KeychainPrivateTextStore: PrivateTextStore {
    public static let service = "com.september.keyboard.private"

    private let store: any SecretStore

    public init(store: any SecretStore = KeychainStore()) {
        self.store = store
    }

    public func text(for id: String) throws -> String? {
        try store.read(service: Self.service, account: id)
    }

    public func setText(_ text: String, for id: String) throws {
        try store.write(text, service: Self.service, account: id)
    }

    public func removeText(for id: String) throws {
        try store.delete(service: Self.service, account: id)
    }
}
