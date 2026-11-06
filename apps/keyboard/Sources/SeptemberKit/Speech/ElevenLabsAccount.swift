import Combine
import Foundation

/// The ElevenLabs connection of the keyboard: the key, the credits, and the
/// voices of the account.
@MainActor
public final class ElevenLabsAccount: ObservableObject {
    public enum Status: Equatable, Sendable {
        case disconnected
        case connecting
        case connected(ElevenLabsSubscription)
        /// The message says why. It never holds the key.
        case failed(String)
    }

    @Published public private(set) var status: Status = .disconnected
    @Published public private(set) var voices: [ElevenLabsVoice] = []
    /// True when the September app on this Mac has an ElevenLabs key.
    @Published public private(set) var septemberHasKey = false

    /// The key in memory, for `ElevenLabsSpeech`. It is never published,
    /// logged, or written outside the Keychain.
    private(set) var key: String?

    private let keychain: ElevenLabsKeychain
    let client: ElevenLabsClient

    public init(keychain: ElevenLabsKeychain = ElevenLabsKeychain(), client: ElevenLabsClient = ElevenLabsClient()) {
        self.keychain = keychain
        self.client = client
    }

    public var isConnected: Bool {
        if case .connected = status { return true }
        return false
    }

    /// Reads the saved key and checks it with ElevenLabs.
    public func load() async {
        septemberHasKey = keychain.septemberHasKey
        do {
            key = try keychain.key()
        } catch let error as KeychainError {
            status = .failed(error.message)
            return
        } catch {
            return
        }
        await refresh()
    }

    /// Tests the key with ElevenLabs, and keeps it in the Keychain only if it works.
    public func connect(key pasted: String) async {
        let candidate = pasted.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !candidate.isEmpty else { return }
        status = .connecting
        do {
            let subscription = try await client.subscription(key: candidate)
            try keychain.save(candidate)
            key = candidate
            status = .connected(subscription)
            voices = (try? await client.voices(key: candidate)) ?? []
        } catch {
            status = .failed(Self.message(error))
        }
    }

    /// Copies the key of the September app one time. macOS asks the user to
    /// let the keyboard read it.
    public func useSeptemberKey() async {
        do {
            guard let copied = try keychain.septemberKey() else {
                septemberHasKey = false
                return
            }
            await connect(key: copied)
        } catch {
            status = .failed(Self.message(error))
        }
    }

    /// Reads the credits and the voices again with the saved key.
    public func refresh() async {
        guard let key else {
            status = .disconnected
            return
        }
        do {
            let subscription = try await client.subscription(key: key)
            status = .connected(subscription)
            voices = try await client.voices(key: key)
        } catch {
            status = .failed(Self.message(error))
        }
    }

    /// Forgets the key of the keyboard. The key of the September app stays.
    public func disconnect() {
        try? keychain.forget()
        key = nil
        voices = []
        status = .disconnected
        septemberHasKey = keychain.septemberHasKey
    }

    private static func message(_ error: any Error) -> String {
        switch error {
        case let error as ElevenLabsError: error.message
        case let error as KeychainError: error.message
        default: ElevenLabsError.unreachable.message
        }
    }
}
