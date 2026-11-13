import Foundation

/// An ElevenLabs request that failed. No message holds the key or the text.
public enum ElevenLabsError: Error, Equatable, Sendable {
    /// ElevenLabs did not accept the key.
    case rejected
    /// The account has no credits left.
    case quotaEmpty
    /// The keyboard has no key or no voice.
    case notConnected
    case badResponse
    case unreachable
    /// ElevenLabs refused the request with this message.
    case service(String)

    public var message: String {
        switch self {
        case .rejected: "ElevenLabs did not accept the key."
        case .quotaEmpty: "ElevenLabs has no credits left on this account."
        case .notConnected: "ElevenLabs is not connected."
        case .badResponse: "ElevenLabs sent a reply that the keyboard cannot read."
        case .unreachable: "The keyboard cannot reach ElevenLabs."
        case .service(let message): message
        }
    }
}

/// A voice of the ElevenLabs account.
public struct ElevenLabsVoice: Equatable, Sendable, Identifiable {
    public enum Group: Equatable, Sendable, CaseIterable {
        /// The voices that the user cloned or designed.
        case mine
        /// The voices that the user added from the voice library.
        case library
        /// The stock voices of ElevenLabs.
        case elevenLabs

        public var title: String {
            switch self {
            case .mine: "My Voices"
            case .library: "From the Library"
            case .elevenLabs: "ElevenLabs Voices"
            }
        }
    }

    public let id: String
    /// The short name. ElevenLabs names many voices "Name - description".
    public let name: String
    /// The line under the name: the description, the labels, or the category.
    public let detail: String?
    public let group: Group
    /// The sample of the voice. It plays with no credits.
    public let previewURL: URL?

    /// The groups in the order of the Voice page, each sorted by name.
    public static func grouped(_ voices: [ElevenLabsVoice]) -> [(group: Group, voices: [ElevenLabsVoice])] {
        Group.allCases.compactMap { group in
            let members = voices.filter { $0.group == group }
                .sorted { $0.name.localizedCompare($1.name) == .orderedAscending }
            return members.isEmpty ? nil : (group, members)
        }
    }
}

/// The character allowance of the account.
public struct ElevenLabsSubscription: Equatable, Sendable {
    public let tier: String?
    public let characterCount: Int
    public let characterLimit: Int
    public let resetsAt: Date?

    public var creditsLeft: Int { max(characterLimit - characterCount, 0) }

    /// "Creator plan. 61,200 credits left. Resets on December 1."
    public func summary(timeZone: TimeZone = .current) -> String {
        var parts: [String] = []
        if let tier, !tier.isEmpty { parts.append("\(tier.prefix(1).uppercased())\(tier.dropFirst()) plan.") }
        parts.append("\(creditsLeft.formatted()) credits left.")
        if let resetsAt {
            let formatter = DateFormatter()
            formatter.timeZone = timeZone
            formatter.setLocalizedDateFormatFromTemplate("MMMMd")
            parts.append("Resets on \(formatter.string(from: resetsAt)).")
        }
        return parts.joined(separator: " ")
    }
}

/// The audio of one text and the time of each word.
public struct ElevenLabsSpeechAudio: Sendable {
    /// MP3 bytes.
    public let audio: Data
    public let words: WordTimes
}

/// The ElevenLabs API, as the September desktop app calls it.
public struct ElevenLabsClient: Sendable {
    public static let defaultBaseURL = URL(string: "https://api.elevenlabs.io")!
    /// Eleven v3 starts to speak late, so the wait is long.
    static let timeout: TimeInterval = 20

    private let baseURL: URL
    private let session: URLSession

    public init(baseURL: URL = Self.defaultBaseURL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    public func voices(key: String) async throws -> [ElevenLabsVoice] {
        let list: VoiceList = try await decode(request("v1/voices", key: key))
        return list.voices.map(\.voice)
    }

    public func subscription(key: String) async throws -> ElevenLabsSubscription {
        let body: SubscriptionBody = try await decode(request("v1/user/subscription", key: key))
        return ElevenLabsSubscription(
            tier: body.tier,
            characterCount: body.character_count ?? 0,
            characterLimit: body.character_limit ?? 0,
            resetsAt: body.next_character_count_reset_unix.map { Date(timeIntervalSince1970: $0) })
    }

    /// The speech of `text` in the voice, the model, and the Expression of
    /// `settings`, with the start time of each word.
    public func speech(_ text: String, settings: VoiceSettings, key: String) async throws -> ElevenLabsSpeechAudio {
        guard let voiceID = settings.elevenLabsVoiceID else { throw ElevenLabsError.notConnected }
        var request = request(
            "v1/text-to-speech/\(voiceID)/with-timestamps", key: key,
            query: [URLQueryItem(name: "output_format", value: "mp3_44100_128")])
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let sound = settings.sound
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "text": text,
            "model_id": settings.modelID,
            "voice_settings": [
                "stability": sound.stability,
                "similarity_boost": sound.similarity,
                "speed": settings.speed,
            ],
        ])
        let body: TimestampsBody = try await decode(request)
        guard let audio = Data(base64Encoded: body.audio_base64) else { throw ElevenLabsError.badResponse }
        let alignment = body.alignment
        return ElevenLabsSpeechAudio(
            audio: audio,
            words: WordTimes(
                text: text, characters: alignment?.characters ?? [],
                starts: alignment?.character_start_times_seconds ?? []))
    }

    // MARK: - Requests

    private func request(_ path: String, key: String, query: [URLQueryItem] = []) -> URLRequest {
        var url = baseURL.appending(path: path)
        if !query.isEmpty { url.append(queryItems: query) }
        var request = URLRequest(url: url, timeoutInterval: Self.timeout)
        request.setValue(key, forHTTPHeaderField: "xi-api-key")
        return request
    }

    private func decode<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError where error.code != .cancelled {
            throw ElevenLabsError.unreachable
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        switch status {
        case 200..<300:
            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw ElevenLabsError.badResponse
            }
        case 401, 403: throw ElevenLabsError.rejected
        case 429: throw ElevenLabsError.quotaEmpty
        default: throw ElevenLabsError.service(Self.message(in: data) ?? "ElevenLabs answered HTTP \(status).")
        }
    }

    /// The message of an ElevenLabs refusal: `detail.message`, or `detail`.
    private static func message(in data: Data) -> String? {
        guard let body = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        if let detail = body["detail"] as? [String: Any], let message = detail["message"] as? String {
            return message
        }
        return body["detail"] as? String
    }
}

// MARK: - Bodies

private struct VoiceList: Decodable {
    let voices: [VoiceBody]
}

private struct VoiceBody: Decodable {
    let voice_id: String
    let name: String
    let category: String?
    let is_owner: Bool?
    let preview_url: String?
    let description: String?
    let labels: [String: String]?

    var voice: ElevenLabsVoice {
        let parts = name.components(separatedBy: " - ")
        let short = parts.count > 1 ? parts[0] : name
        let described = parts.count > 1 ? parts.dropFirst().joined(separator: " - ") : nil
        return ElevenLabsVoice(
            id: voice_id, name: short,
            detail: (described ?? labelDetail ?? category).map(Self.sentenceCase),
            group: group, previewURL: preview_url.flatMap(URL.init(string:)))
    }

    /// ElevenLabs sets `is_owner` on a voice that the user made. An older
    /// reply has no `is_owner`, so the category decides.
    private var group: ElevenLabsVoice.Group {
        if is_owner ?? ["cloned", "generated"].contains(category ?? "") { return .mine }
        return category == "premade" ? .elevenLabs : .library
    }

    /// "Soft, young, American", from the labels of a stock voice.
    private var labelDetail: String? {
        guard let labels else { return nil }
        let words = [labels["description"], labels["age"], labels["accent"]?.capitalized]
            .compactMap { $0 }.filter { !$0.isEmpty }
        return words.isEmpty ? nil : words.joined(separator: ", ")
    }

    private static func sentenceCase(_ text: String) -> String {
        text.prefix(1).uppercased() + text.dropFirst()
    }
}

private struct SubscriptionBody: Decodable {
    let tier: String?
    let character_count: Int?
    let character_limit: Int?
    let next_character_count_reset_unix: Double?
}

private struct TimestampsBody: Decodable {
    struct Alignment: Decodable {
        let characters: [String]
        let character_start_times_seconds: [Double]
    }

    let audio_base64: String
    let alignment: Alignment?
}
