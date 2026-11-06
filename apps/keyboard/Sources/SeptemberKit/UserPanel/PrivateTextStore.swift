import Foundation
import Security

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

    public init() {}

    public func text(for id: String) throws -> String? {
        var query = baseQuery(id)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else {
            throw KeychainError(status: status)
        }
        return String(data: data, encoding: .utf8)
    }

    public func setText(_ text: String, for id: String) throws {
        let data = Data(text.utf8)
        let update = SecItemUpdate(
            baseQuery(id) as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if update == errSecSuccess { return }
        guard update == errSecItemNotFound else { throw KeychainError(status: update) }

        var item = baseQuery(id)
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlocked
        item[kSecAttrLabel as String] = "September Keyboard private text"
        let status = SecItemAdd(item as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError(status: status) }
    }

    public func removeText(for id: String) throws {
        let status = SecItemDelete(baseQuery(id) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError(status: status)
        }
    }

    private func baseQuery(_ id: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.service,
            kSecAttrAccount as String: id,
        ]
    }
}

public struct KeychainError: Error, CustomStringConvertible {
    public let status: OSStatus

    public var description: String {
        let message = SecCopyErrorMessageString(status, nil) as String? ?? "unknown error"
        return "Keychain: \(message) (\(status))"
    }
}
