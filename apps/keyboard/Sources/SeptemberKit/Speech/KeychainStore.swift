import Foundation
import Security

/// Generic passwords, by service and account. The tests use a store in memory.
public protocol SecretStore: Sendable {
    func read(service: String, account: String) throws -> String?
    /// True when the item exists. It does not read the secret, so macOS does
    /// not ask for permission.
    func contains(service: String, account: String) -> Bool
    func write(_ secret: String, service: String, account: String) throws
    func delete(service: String, account: String) throws
}

/// A Keychain call that failed. The message never holds the secret.
public struct KeychainError: Error, Equatable, Sendable {
    public let status: OSStatus

    public var message: String {
        (SecCopyErrorMessageString(status, nil) as String?) ?? "Keychain error \(status)"
    }
}

/// The generic passwords of the macOS Keychain.
public struct KeychainStore: SecretStore {
    public init() {}

    private func query(_ service: String, _ account: String) -> [CFString: Any] {
        [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
        ]
    }

    public func read(service: String, account: String) throws -> String? {
        var query = query(service, account)
        query[kSecReturnData] = true
        query[kSecMatchLimit] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw KeychainError(status: status) }
        return (result as? Data).flatMap { String(data: $0, encoding: .utf8) }
    }

    public func contains(service: String, account: String) -> Bool {
        var query = query(service, account)
        query[kSecReturnAttributes] = true
        query[kSecMatchLimit] = kSecMatchLimitOne
        var result: CFTypeRef?
        return SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess
    }

    public func write(_ secret: String, service: String, account: String) throws {
        let data = Data(secret.utf8)
        let status = SecItemUpdate(
            query(service, account) as CFDictionary, [kSecValueData: data] as CFDictionary)
        if status == errSecSuccess { return }
        guard status == errSecItemNotFound else { throw KeychainError(status: status) }
        var add = query(service, account)
        add[kSecValueData] = data
        let added = SecItemAdd(add as CFDictionary, nil)
        guard added == errSecSuccess else { throw KeychainError(status: added) }
    }

    public func delete(service: String, account: String) throws {
        let status = SecItemDelete(query(service, account) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError(status: status)
        }
    }
}

/// The ElevenLabs key of the keyboard, and the key of the September app.
public struct ElevenLabsKeychain: Sendable {
    public static let service = "com.september.keyboard"
    /// The September desktop app keeps its key here. See
    /// `apps/desktop/src-tauri/src/providers.rs`.
    public static let septemberService = "com.september.desktop"
    public static let account = "elevenlabs"

    private let store: any SecretStore

    public init(store: any SecretStore = KeychainStore()) {
        self.store = store
    }

    public func key() throws -> String? {
        try store.read(service: Self.service, account: Self.account)
    }

    public func save(_ key: String) throws {
        try store.write(key, service: Self.service, account: Self.account)
    }

    public func forget() throws {
        try store.delete(service: Self.service, account: Self.account)
    }

    public var septemberHasKey: Bool {
        store.contains(service: Self.septemberService, account: Self.account)
    }

    /// Reads the key of the September app. macOS asks the user one time to let
    /// the keyboard read it.
    public func septemberKey() throws -> String? {
        try store.read(service: Self.septemberService, account: Self.account)
    }
}
