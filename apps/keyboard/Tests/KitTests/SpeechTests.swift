import Foundation
import SeptemberKit

// MARK: - Fakes

/// A Keychain in memory. The tests never touch the real Keychain.
final class MemorySecretStore: SecretStore, @unchecked Sendable {
    var items: [String: String] = [:]
    var reads: [String] = []

    private func slot(_ service: String, _ account: String) -> String { "\(service)/\(account)" }

    func read(service: String, account: String) throws -> String? {
        reads.append(slot(service, account))
        return items[slot(service, account)]
    }

    func contains(service: String, account: String) -> Bool {
        items[slot(service, account)] != nil
    }

    func write(_ secret: String, service: String, account: String) throws {
        items[slot(service, account)] = secret
    }

    func delete(service: String, account: String) throws {
        items[slot(service, account)] = nil
    }
}

/// Answers each request with the reply of `StubURLProtocol.handler`. No
/// request leaves the process.
final class StubURLProtocol: URLProtocol {
    struct Reply {
        var status = 200
        var body = Data()
    }

    nonisolated(unsafe) static var handler: @Sendable (URLRequest, Data) -> Reply = { _, _ in Reply(status: 500) }
    nonisolated(unsafe) static var requests: [(request: URLRequest, body: Data)] = []

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let body = Self.body(of: request)
        Self.requests.append((request, body))
        let reply = Self.handler(request, body)
        let response = HTTPURLResponse(
            url: request.url!, statusCode: reply.status, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: reply.body)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}

    /// URLSession moves the body of a request into a stream.
    private static func body(of request: URLRequest) -> Data {
        if let body = request.httpBody { return body }
        guard let stream = request.httpBodyStream else { return Data() }
        stream.open()
        defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            if count <= 0 { break }
            data.append(buffer, count: count)
        }
        return data
    }

    static func reset(_ handler: @escaping @Sendable (URLRequest, Data) -> Reply) {
        self.handler = handler
        requests = []
    }
}

private func stubClient() -> ElevenLabsClient {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [StubURLProtocol.self]
    return ElevenLabsClient(
        baseURL: URL(string: "https://eleven.test")!, session: URLSession(configuration: configuration))
}

private func json(_ object: Any) -> Data {
    try! JSONSerialization.data(withJSONObject: object)
}

private let subscriptionBody = json([
    "tier": "creator",
    "character_count": 38_800,
    "character_limit": 100_000,
    "next_character_count_reset_unix": 1_764_547_200,  // 2025-12-01 00:00 UTC
])

private let voicesBody = json([
    "voices": [
        ["voice_id": "v-sarah", "name": "Sarah", "category": "premade",
         "labels": ["description": "soft", "age": "young", "accent": "american"],
         "preview_url": "https://eleven.test/sarah.mp3"],
        ["voice_id": "v-dad", "name": "Dad", "category": "cloned"],
        ["voice_id": "v-me", "name": "My Voice", "category": "cloned", "is_owner": true],
        ["voice_id": "v-pro", "name": "Rachel - calm narrator", "category": "professional", "is_owner": false],
    ]
])

/// Routes the account requests: the key `good` works, any other key fails.
private func accountRoutes(_ request: URLRequest, _ body: Data) -> StubURLProtocol.Reply {
    guard request.value(forHTTPHeaderField: "xi-api-key") == "good" else {
        return .init(status: 401, body: json(["detail": ["message": "Invalid API key"]]))
    }
    switch request.url?.path {
    case "/v1/user/subscription": return .init(body: subscriptionBody)
    case "/v1/voices": return .init(body: voicesBody)
    default: return .init(status: 404)
    }
}

@MainActor
final class FakeEngine: SpeechEngine {
    var ready = true
    var spoken: [String] = []
    var stops = 0
    var words: [NSRange] = []
    var failure: (any Error)?
    /// When true, `speak` waits until `finish()` or `stop()`.
    var holds = false
    /// The number of calls to `speak` that returned or threw.
    private(set) var ended = 0
    private var waiting: CheckedContinuation<Void, any Error>?
    private var waiters: [(ready: () -> Bool, go: CheckedContinuation<Void, Never>)] = []

    func canSpeak(_ voice: VoiceSettings) -> Bool { ready }

    func speak(
        _ text: String, voice: VoiceSettings, onWord: @escaping @MainActor (NSRange) -> Void
    ) async throws {
        spoken.append(text)
        for word in words { onWord(word) }
        // The caller continues in the same job after the return, so it is
        // done before a waiter that this signal resumes.
        defer {
            ended += 1
            signal()
        }
        if let failure { throw failure }
        guard holds else { return }
        signal()
        try await withCheckedThrowingContinuation { waiting = $0 }
    }

    /// Returns when `speak` got `count` texts.
    func waitUntilSpoken(_ count: Int) async {
        await wait { self.spoken.count >= count }
    }

    /// Returns when `count` calls to `speak` ended, and the speaker handled
    /// the end.
    func waitUntilEnded(_ count: Int) async {
        await wait { self.ended >= count }
    }

    private func wait(until ready: @escaping () -> Bool) async {
        if ready() { return }
        await withCheckedContinuation { waiters.append((ready, $0)) }
    }

    private func signal() {
        let ready = waiters.filter { $0.ready() }
        waiters.removeAll { $0.ready() }
        for waiter in ready { waiter.go.resume() }
    }

    func stop() {
        stops += 1
        waiting?.resume(throwing: CancellationError())
        waiting = nil
    }

    func finish() {
        waiting?.resume()
        waiting = nil
    }
}

private struct Broken: Error {}

// MARK: - Tests

@MainActor
func speechTests() async {
    // Models and Expression presets, from packages/core/rules/voice.ts

    test("a deprecated model reads as its replacement") {
        expectEqual(VoiceModel.id(from: "eleven_turbo_v2_5"), "eleven_flash_v2_5")
        expectEqual(VoiceModel.id(from: "eleven_v3"), "eleven_v3")
    }

    test("an Expression sets the stability, and Eleven v3 takes one of three modes") {
        expectEqual(Expression.allCases.map(\.label), ["Steady", "Natural", "Expressive"])
        expectEqual(Expression.steady.sound(model: "eleven_flash_v2_5"), VoiceSound(stability: 0.75, similarity: 0.75))
        expectEqual(Expression.natural.sound(model: "eleven_multilingual_v2"), VoiceSound(stability: 0.5, similarity: 0.75))
        expectEqual(Expression.expressive.sound(model: "eleven_flash_v2_5").stability, 0.35)
        expectEqual(Expression.steady.sound(model: "eleven_v3").stability, 1)
        expectEqual(Expression.natural.sound(model: "eleven_v3").stability, 0.5)
        expectEqual(Expression.expressive.sound(model: "eleven_v3").stability, 0)
    }

    // Voice settings

    test("the voice settings start with the macOS voice at normal speed and volume") {
        let settings = VoiceSettings()
        expectEqual(settings.provider, .system)
        expectEqual(settings.systemVoiceID, nil)
        expectEqual(settings.elevenLabsVoiceID, nil)
        expectEqual(settings.modelID, "eleven_flash_v2_5")
        expectEqual(settings.expression, .natural)
        expectEqual(settings.speed, 1)
        expectEqual(settings.volume, 1)
    }

    test("the voice settings keep the speed and the volume in range") {
        var settings = VoiceSettings()
        settings.speed = 3
        settings.volume = -1
        expectEqual(settings.speed, 1.2)
        expectEqual(settings.volume, 0)
        settings.speed = 0.1
        settings.volume = 4
        expectEqual(settings.speed, 0.7)
        expectEqual(settings.volume, 1)
    }

    test("the voice settings persist in UserDefaults") {
        let defaults = freshDefaults()
        let store = VoiceSettingsStore(defaults: defaults)
        store.value.provider = .elevenLabs
        store.value.elevenLabsVoiceID = "v-me"
        store.value.systemVoiceID = "com.apple.voice.premium.en-US.Ava"
        store.value.modelID = "eleven_v3"
        store.value.expression = .expressive
        store.value.speed = 1.1
        store.value.volume = 0.6

        let again = VoiceSettingsStore(defaults: defaults)
        expectEqual(again.value, store.value)
    }

    test("a saved Turbo model or an unknown model loads as a model the keyboard offers") {
        let defaults = freshDefaults()
        let store = VoiceSettingsStore(defaults: defaults)
        store.value.modelID = "eleven_turbo_v2_5"
        expectEqual(VoiceSettingsStore(defaults: defaults).value.modelID, "eleven_flash_v2_5")
        store.value.modelID = "eleven_turbo_v2"
        expectEqual(VoiceSettingsStore(defaults: defaults).value.modelID, "eleven_flash_v2_5")
        store.value.modelID = "eleven_unknown"
        expectEqual(VoiceSettingsStore(defaults: defaults).value.modelID, "eleven_flash_v2_5")
    }

    // The ElevenLabs key in the Keychain

    test("the keyboard keeps its ElevenLabs key in its own Keychain item") {
        let secrets = MemorySecretStore()
        let keychain = ElevenLabsKeychain(store: secrets)
        try keychain.save("abc")
        expectEqual(secrets.items["com.september.keyboard/elevenlabs"], "abc")
        expectEqual(try keychain.key(), "abc")
        try keychain.forget()
        expectEqual(try keychain.key(), nil)
    }

    test("the key of the September app is read from its own item") {
        let secrets = MemorySecretStore()
        let keychain = ElevenLabsKeychain(store: secrets)
        expect(!keychain.septemberHasKey)
        secrets.items["com.september.desktop/elevenlabs"] = "desk"
        expect(keychain.septemberHasKey)
        expectEqual(secrets.reads, [], "checking for the key must not read it")
        expectEqual(try keychain.septemberKey(), "desk")
    }

    // The ElevenLabs client

    await asyncTest("the client reads the voices of the account with the key") {
        StubURLProtocol.reset(accountRoutes)
        let voices = try await stubClient().voices(key: "good")
        let request = StubURLProtocol.requests.first?.request
        expectEqual(request?.httpMethod, "GET")
        expectEqual(request?.url?.path, "/v1/voices")
        expectEqual(request?.value(forHTTPHeaderField: "xi-api-key"), "good")
        expectEqual(voices.map(\.id), ["v-sarah", "v-dad", "v-me", "v-pro"])
        expectEqual(voices[0].previewURL, URL(string: "https://eleven.test/sarah.mp3"))
    }

    await asyncTest("the voices fall into groups, with the voices of the user first") {
        StubURLProtocol.reset(accountRoutes)
        let voices = try await stubClient().voices(key: "good")
        let groups = ElevenLabsVoice.grouped(voices)
        expectEqual(groups.map(\.group), [.mine, .library, .elevenLabs])
        expectEqual(groups[0].voices.map(\.name), ["Dad", "My Voice"])
        expectEqual(groups[0].voices.map(\.detail), ["Cloned", "Cloned"])
        expectEqual(groups[1].voices.map(\.name), ["Rachel"])
        expectEqual(groups[1].voices.map(\.detail), ["Calm narrator"])
        expectEqual(groups[2].voices.map(\.detail), ["Soft, young, American"])
    }

    await asyncTest("the client reads the credits of the account") {
        StubURLProtocol.reset(accountRoutes)
        let subscription = try await stubClient().subscription(key: "good")
        expectEqual(StubURLProtocol.requests.first?.request.url?.path, "/v1/user/subscription")
        expectEqual(subscription.creditsLeft, 61_200)
        expectEqual(subscription.resetsAt, Date(timeIntervalSince1970: 1_764_547_200))
    }

    await asyncTest("the client asks for speech with word times") {
        let text = "Can we go"
        // ElevenLabs sends one time for each character of the text.
        let starts: [Double] = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4]
        StubURLProtocol.reset { _, _ in
            .init(body: json([
                "audio_base64": Data("mp3".utf8).base64EncodedString(),
                "alignment": [
                    "characters": text.map(String.init),
                    "character_start_times_seconds": starts,
                    "character_end_times_seconds": starts.map { $0 + 0.05 },
                ],
            ]))
        }
        var settings = VoiceSettings()
        settings.elevenLabsVoiceID = "v-me"
        settings.modelID = "eleven_v3"
        settings.expression = .steady
        settings.speed = 1.1

        let speech = try await stubClient().speech(text, settings: settings, key: "good")

        let (request, body) = StubURLProtocol.requests[0]
        expectEqual(request.httpMethod, "POST")
        expectEqual(request.url?.path, "/v1/text-to-speech/v-me/with-timestamps")
        expectEqual(request.value(forHTTPHeaderField: "xi-api-key"), "good")
        let sent = try JSONSerialization.jsonObject(with: body) as? [String: Any]
        expectEqual(sent?["text"] as? String, text)
        expectEqual(sent?["model_id"] as? String, "eleven_v3")
        let sound = sent?["voice_settings"] as? [String: Double]
        expectEqual(sound?["stability"], 1)
        expectEqual(sound?["similarity_boost"], 0.75)
        expectEqual(sound?["speed"], 1.1)

        expectEqual(speech.audio, Data("mp3".utf8))
        expectEqual(speech.words.map(\.range), [NSRange(location: 0, length: 3), NSRange(location: 4, length: 2), NSRange(location: 7, length: 2)])
        expectEqual(speech.words.map(\.start), [0, 0.2, 0.35])
    }

    await asyncTest("the client turns a refusal into an error that says why") {
        StubURLProtocol.reset { _, _ in .init(status: 401) }
        do {
            _ = try await stubClient().subscription(key: "bad")
            expect(false, "a 401 must throw")
        } catch let error as ElevenLabsError {
            expectEqual(error, .rejected)
        }

        StubURLProtocol.reset { _, _ in .init(status: 429) }
        do {
            _ = try await stubClient().voices(key: "good")
            expect(false, "a 429 must throw")
        } catch let error as ElevenLabsError {
            expectEqual(error, .quotaEmpty)
        }

        StubURLProtocol.reset { _, _ in .init(status: 500, body: json(["detail": ["message": "Voice not found"]])) }
        do {
            _ = try await stubClient().voices(key: "good")
            expect(false, "a 500 must throw")
        } catch let error as ElevenLabsError {
            expectEqual(error, .service("Voice not found"))
        }
    }

    test("no error message holds the key") {
        for error in [ElevenLabsError.rejected, .quotaEmpty, .notConnected, .badResponse, .service("x")] {
            expect(!error.message.isEmpty)
        }
    }

    // Word times

    test("the word at a time is the last word that has started") {
        let words = WordTimes([
            .init(range: NSRange(location: 0, length: 3), start: 0),
            .init(range: NSRange(location: 4, length: 2), start: 0.2),
            .init(range: NSRange(location: 7, length: 2), start: 0.35),
        ])
        expectEqual(words.word(at: 0), NSRange(location: 0, length: 3))
        expectEqual(words.word(at: 0.25), NSRange(location: 4, length: 2))
        expectEqual(words.word(at: 9), NSRange(location: 7, length: 2))
        expectEqual(WordTimes([]).word(at: 1), nil)
    }

    test("word times follow the words in order when ElevenLabs changes the characters") {
        // ElevenLabs can send fewer characters than the text, for example
        // without a double space.
        let words = WordTimes(
            text: "Hi  there", characters: ["H", "i", " ", "t", "h", "e", "r", "e"],
            starts: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7])
        expectEqual(words.map(\.range), [NSRange(location: 0, length: 2), NSRange(location: 4, length: 5)])
        expectEqual(words.map(\.start), [0, 0.3])
    }

    // The ElevenLabs account

    await asyncTest("connect tests a key before the keyboard keeps it") {
        StubURLProtocol.reset(accountRoutes)
        let secrets = MemorySecretStore()
        let account = ElevenLabsAccount(keychain: ElevenLabsKeychain(store: secrets), client: stubClient())

        await account.connect(key: "  bad  ")
        expectEqual(secrets.items["com.september.keyboard/elevenlabs"], nil)
        expectEqual(account.status, .failed(ElevenLabsError.rejected.message))
        expect(!account.isConnected)

        await account.connect(key: " good\n")
        expectEqual(secrets.items["com.september.keyboard/elevenlabs"], "good")
        expect(account.isConnected)
        expectEqual(account.voices.count, 4)
    }

    await asyncTest("Use This Key copies the key of the September app one time") {
        StubURLProtocol.reset(accountRoutes)
        let secrets = MemorySecretStore()
        secrets.items["com.september.desktop/elevenlabs"] = "good"
        let account = ElevenLabsAccount(keychain: ElevenLabsKeychain(store: secrets), client: stubClient())
        await account.load()
        expect(account.septemberHasKey)
        expect(!account.isConnected)

        await account.useSeptemberKey()
        expectEqual(secrets.reads.filter { $0 == "com.september.desktop/elevenlabs" }.count, 1)
        expectEqual(secrets.items["com.september.keyboard/elevenlabs"], "good")
        expect(account.isConnected)

        await account.refresh()
        expectEqual(secrets.reads.filter { $0 == "com.september.desktop/elevenlabs" }.count, 1)
    }

    await asyncTest("a saved key connects at load, and Disconnect forgets it") {
        StubURLProtocol.reset(accountRoutes)
        let secrets = MemorySecretStore()
        secrets.items["com.september.keyboard/elevenlabs"] = "good"
        let account = ElevenLabsAccount(keychain: ElevenLabsKeychain(store: secrets), client: stubClient())
        await account.load()
        expect(account.isConnected)
        if case .connected(let subscription) = account.status {
            expectEqual(subscription.tier, "creator")
        }

        account.disconnect()
        expectEqual(secrets.items["com.september.keyboard/elevenlabs"], nil)
        expectEqual(account.status, .disconnected)
        expectEqual(account.voices, [])
        var voice = VoiceSettings()
        voice.elevenLabsVoiceID = "v-me"
        expect(!ElevenLabsSpeech(account: account).canSpeak(voice), "the key is gone from memory too")
    }

    // The Speaker

    await asyncTest("Speak publishes the current word, then the speaker is idle") {
        let system = FakeEngine()
        system.holds = true
        system.words = [NSRange(location: 0, length: 3), NSRange(location: 4, length: 2)]
        let speaker = Speaker(settings: VoiceSettingsStore(defaults: freshDefaults()), system: system, elevenLabs: FakeEngine())

        speaker.speak("Can we go")
        await system.waitUntilSpoken(1)
        expectEqual(system.spoken, ["Can we go"])
        expectEqual(speaker.state, .speaking(text: "Can we go", word: NSRange(location: 4, length: 2)))
        expect(speaker.isSpeaking)

        system.finish()
        await system.waitUntilEnded(1)
        expectEqual(speaker.state, .idle)
        expectEqual(speaker.error, nil)
    }

    await asyncTest("Stop ends the speech at once") {
        let system = FakeEngine()
        system.holds = true
        let speaker = Speaker(settings: VoiceSettingsStore(defaults: freshDefaults()), system: system, elevenLabs: FakeEngine())
        speaker.speak("Hello")
        await system.waitUntilSpoken(1)
        speaker.stop()
        expectEqual(speaker.state, .idle)
        await system.waitUntilEnded(1)
        expectEqual(system.stops, 1)
        expectEqual(speaker.state, .idle)
        expectEqual(speaker.error, nil)
    }

    await asyncTest("an empty text speaks nothing") {
        let system = FakeEngine()
        let speaker = Speaker(settings: VoiceSettingsStore(defaults: freshDefaults()), system: system, elevenLabs: FakeEngine())
        speaker.speak("  \n ")
        expectEqual(system.spoken, [])
        expectEqual(speaker.state, .idle)
    }

    await asyncTest("a new Speak during speech replaces the old speech") {
        let system = FakeEngine()
        system.holds = true
        let speaker = Speaker(settings: VoiceSettingsStore(defaults: freshDefaults()), system: system, elevenLabs: FakeEngine())
        speaker.speak("One")
        await system.waitUntilSpoken(1)
        speaker.speak("Two")
        await system.waitUntilSpoken(2)
        expectEqual(system.spoken, ["One", "Two"])
        expectEqual(speaker.state, .speaking(text: "Two", word: nil))
        system.finish()
        await system.waitUntilEnded(2)
        expectEqual(speaker.state, .idle)
    }

    await asyncTest("the macOS voice speaks when ElevenLabs is not the service") {
        let system = FakeEngine()
        let cloud = FakeEngine()
        let speaker = Speaker(settings: VoiceSettingsStore(defaults: freshDefaults()), system: system, elevenLabs: cloud)
        speaker.speak("Hi")
        await system.waitUntilEnded(1)
        expectEqual(system.spoken, ["Hi"])
        expectEqual(cloud.spoken, [])
    }

    await asyncTest("ElevenLabs speaks when it is the service and it is ready") {
        let settings = VoiceSettingsStore(defaults: freshDefaults())
        settings.value.provider = .elevenLabs
        let system = FakeEngine()
        let cloud = FakeEngine()
        let speaker = Speaker(settings: settings, system: system, elevenLabs: cloud)
        speaker.speak("Hi")
        await cloud.waitUntilEnded(1)
        expectEqual(cloud.spoken, ["Hi"])
        expectEqual(system.spoken, [])
        expectEqual(speaker.state, .idle)
    }

    await asyncTest("if ElevenLabs fails, the macOS voice speaks the same text and the error shows") {
        let settings = VoiceSettingsStore(defaults: freshDefaults())
        settings.value.provider = .elevenLabs
        let system = FakeEngine()
        let cloud = FakeEngine()
        cloud.failure = ElevenLabsError.quotaEmpty
        let speaker = Speaker(settings: settings, system: system, elevenLabs: cloud)
        speaker.speak("Can we go")
        await system.waitUntilEnded(1)
        expectEqual(cloud.spoken, ["Can we go"])
        expectEqual(system.spoken, ["Can we go"])
        expectEqual(speaker.error, SpeechError(message: ElevenLabsError.quotaEmpty.message))
        expectEqual(speaker.state, .idle)

        cloud.failure = nil
        speaker.speak("Again")
        await cloud.waitUntilEnded(2)
        expectEqual(speaker.error, nil, "a new Speak clears the old error")
    }

    await asyncTest("an ElevenLabs voice that is not set up speaks with the macOS voice and no error") {
        let settings = VoiceSettingsStore(defaults: freshDefaults())
        settings.value.provider = .elevenLabs
        let system = FakeEngine()
        let cloud = FakeEngine()
        cloud.ready = false
        let speaker = Speaker(settings: settings, system: system, elevenLabs: cloud)
        speaker.speak("Hi")
        await system.waitUntilEnded(1)
        expectEqual(cloud.spoken, [])
        expectEqual(system.spoken, ["Hi"])
        expectEqual(speaker.error, nil)
    }

    await asyncTest("ElevenLabs is ready with a key and a voice") {
        StubURLProtocol.reset(accountRoutes)
        let secrets = MemorySecretStore()
        let account = ElevenLabsAccount(keychain: ElevenLabsKeychain(store: secrets), client: stubClient())
        let engine = ElevenLabsSpeech(account: account)
        var settings = VoiceSettings()
        settings.elevenLabsVoiceID = "v-me"
        expect(!engine.canSpeak(settings), "no key")
        await account.connect(key: "good")
        expect(engine.canSpeak(settings))
        settings.elevenLabsVoiceID = nil
        expect(!engine.canSpeak(settings), "no voice")
    }

    // The Speak button and the highlight of the current word

    test("the Speak button is Stop during speech, and off with nothing to speak") {
        expectEqual(SpeakButton.Mode(isSpeaking: false, canSpeak: true), .speak)
        expectEqual(SpeakButton.Mode(isSpeaking: true, canSpeak: true), .stop)
        expectEqual(SpeakButton.Mode(isSpeaking: true, canSpeak: false), .stop)
        expectEqual(SpeakButton.Mode(isSpeaking: false, canSpeak: false), .off)
    }

    test("the spoken text splits at the current word") {
        let text = "Can we go to the garden?"
        let parts = SpokenText.parts(of: text, word: NSRange(location: 7, length: 2))
        expectEqual(parts.spoken, "Can we ")
        expectEqual(parts.now, "go")
        expectEqual(parts.later, " to the garden?")

        let start = SpokenText.parts(of: text, word: nil)
        expectEqual(start.spoken, "")
        expectEqual(start.now, "")
        expectEqual(start.later, text)

        let outside = SpokenText.parts(of: "Hi", word: NSRange(location: 5, length: 2))
        expectEqual(outside.later, "Hi")
    }

    // The macOS voices

    test("the voice list shows Personal Voice first, then the English voices, best first") {
        let voices = [
            SystemVoice(id: "sam", name: "Samantha", language: "en-US", quality: .standard),
            SystemVoice(id: "ava", name: "Ava", language: "en-US", quality: .premium),
            SystemVoice(id: "zoe", name: "Zoe", language: "en-US", quality: .enhanced),
            SystemVoice(id: "amelie", name: "Amélie", language: "fr-CA", quality: .premium),
            SystemVoice(id: "bells", name: "Bells", language: "en-US", quality: .standard, isNovelty: true),
            SystemVoice(id: "me", name: "My Voice", language: "en-US", quality: .standard, isPersonal: true),
        ]
        let listed = SystemVoice.listed(voices)
        expectEqual(listed.personal.map(\.id), ["me"])
        expectEqual(listed.system.map(\.id), ["ava", "zoe", "sam"])
    }
}
