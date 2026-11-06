//! The two cloud services September can borrow: OpenRouter for AI Assistance,
//! and ElevenLabs for a voice. A key persists in the macOS Keychain, is cached
//! in Rust for one run, and never reaches the WebView.

use std::{sync::RwLock, time::Duration};

use base64::Engine as _;
use futures_util::{SinkExt, StreamExt};
use reqwest::StatusCode;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::Value;
use tokio_tungstenite::tungstenite::{self, client::IntoClientRequest, Message};

use crate::speech::{VoiceSettings, STREAM_SAMPLE_RATE};

const OPEN_ROUTER: &str = "https://openrouter.ai";
const ELEVEN_LABS: &str = "https://api.elevenlabs.io";

/// An ElevenLabs file that does not arrive in this time does not answer. The
/// system voice then speaks, so the user never waits long in silence.
const FIRST_FILE_AUDIO: Duration = Duration::from_secs(15);
/// A Dialogue voice that sends no sound in this time does not answer. The
/// system voice then speaks. Eleven v3 starts to speak late, so the wait is long.
const FIRST_DIALOGUE_AUDIO: Duration = Duration::from_secs(10);

/// The realtime Eleven v3 model. ElevenLabs serves it on the dialogue socket
/// only.
const CONVERSATIONAL_MODEL: &str = "eleven_v3_conversational";

/// The answer to a voice request when no ElevenLabs key is stored.
pub(crate) const NO_ELEVEN_LABS_KEY: &str = "Connect ElevenLabs in Settings first.";

/// One Keychain service holds both accounts, so the Mac shows them together.
const KEYCHAIN_SERVICE: &str = "com.september.desktop";

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    OpenRouter,
    ElevenLabs,
}

impl Provider {
    pub const ALL: [Provider; 2] = [Provider::OpenRouter, Provider::ElevenLabs];

    fn account(self) -> &'static str {
        match self {
            Self::OpenRouter => "openrouter",
            Self::ElevenLabs => "elevenlabs",
        }
    }

    fn index(self) -> usize {
        match self {
            Self::OpenRouter => 0,
            Self::ElevenLabs => 1,
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    #[error("That key did not work. Copy it and try again.")]
    Rejected,
    #[error("This account has no characters left this month.")]
    QuotaEmpty,
    #[error("Could not reach the service. Check the internet and try again. ({0})")]
    Unreachable(#[from] reqwest::Error),
    #[error("The service sent a reply September could not read. ({0})")]
    Unexpected(String),
    #[error("The key could not be saved on this Mac. ({0})")]
    Keychain(String),
    #[error("The key could not be read on this Mac. ({0})")]
    Cache(String),
    #[error("Could not read the reply. ({0})")]
    Encoding(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, ProviderError>;

/// What the step shows about one service. It holds no key.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ProviderStatus {
    pub provider: Provider,
    pub connected: bool,
    pub label: Option<String>,
    pub detail: Option<String>,
}

impl ProviderStatus {
    pub fn absent(provider: Provider) -> Self {
        Self {
            provider,
            connected: false,
            label: None,
            detail: None,
        }
    }

    pub fn broken(provider: Provider, detail: impl Into<String>) -> Self {
        Self {
            provider,
            connected: false,
            label: None,
            detail: Some(detail.into()),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct Voice {
    // ElevenLabs sends `voice_id`. The screens read `id`, so the rename works
    // on the way in only. A two-way rename gives the screen no `id` at all.
    #[serde(rename(deserialize = "voice_id"))]
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub preview_url: Option<String>,
    /// The ElevenLabs category. `packages/core/rules/voice.ts` groups the
    /// voices by it.
    #[serde(default)]
    pub category: Option<String>,
    /// True for a voice the user made. A library voice they added is false.
    #[serde(default)]
    pub is_owner: Option<bool>,
}

/// The account voice that an ElevenLabs cloning request created.
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct CreatedVoice {
    #[serde(rename(deserialize = "voice_id"))]
    pub id: String,
}

// ---------------------------------------------------------------- keychain

fn entry(provider: Provider) -> Result<keyring::Entry> {
    keyring::Entry::new(KEYCHAIN_SERVICE, provider.account())
        .map_err(|error| ProviderError::Keychain(error.to_string()))
}

fn store_key(provider: Provider, key: &str) -> Result<()> {
    entry(provider)?
        .set_password(key)
        .map_err(|error| ProviderError::Keychain(error.to_string()))
}

fn stored_key(provider: Provider) -> Result<Option<String>> {
    match entry(provider)?.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(ProviderError::Keychain(error.to_string())),
    }
}

fn forget_key(provider: Provider) -> Result<bool> {
    match entry(provider)?.delete_credential() {
        Ok(()) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(ProviderError::Keychain(error.to_string())),
    }
}

/// The API keys read from the Keychain when the backend starts.
///
/// Commands clone a key from this process-local cache. Connecting or
/// forgetting a provider changes the Keychain and this cache together.
pub(crate) struct ProviderKeys {
    values: RwLock<[std::result::Result<Option<String>, String>; Provider::ALL.len()]>,
}

impl ProviderKeys {
    pub(crate) fn load() -> Self {
        Self::load_with(stored_key)
    }

    fn load_with(mut read: impl FnMut(Provider) -> Result<Option<String>>) -> Self {
        let mut values = [Ok(None), Ok(None)];
        for provider in Provider::ALL {
            values[provider.index()] = read(provider).map_err(|error| match error {
                ProviderError::Keychain(detail) => detail,
                error => error.to_string(),
            });
        }
        Self {
            values: RwLock::new(values),
        }
    }

    pub(crate) fn get(&self, provider: Provider) -> Result<Option<String>> {
        let cached = self
            .values
            .read()
            .map(|values| values[provider.index()].clone())
            .map_err(|error| ProviderError::Cache(error.to_string()))?;
        cached.map_err(ProviderError::Keychain)
    }

    pub(crate) fn store(&self, provider: Provider, key: &str) -> Result<()> {
        let mut values = self
            .values
            .write()
            .map_err(|error| ProviderError::Cache(error.to_string()))?;
        store_key(provider, key)?;
        values[provider.index()] = Ok(Some(key.to_owned()));
        Ok(())
    }

    pub(crate) fn forget(&self, provider: Provider) -> Result<bool> {
        let mut values = self
            .values
            .write()
            .map_err(|error| ProviderError::Cache(error.to_string()))?;
        let deleted = forget_key(provider)?;
        values[provider.index()] = Ok(None);
        Ok(deleted)
    }
}

// ------------------------------------------------------------------ network

#[derive(Clone)]
pub struct Providers {
    client: reqwest::Client,
    open_router: String,
    eleven_labs: String,
    first_file_audio: Duration,
    first_dialogue_audio: Duration,
}

impl Default for Providers {
    fn default() -> Self {
        Self::with_bases(OPEN_ROUTER, ELEVEN_LABS)
    }
}

impl Providers {
    /// The services at these addresses, instead of the public ones.
    pub fn with_bases(open_router: &str, eleven_labs: &str) -> Self {
        Self {
            client: reqwest::Client::new(),
            open_router: open_router.trim_end_matches('/').to_owned(),
            eleven_labs: eleven_labs.trim_end_matches('/').to_owned(),
            first_file_audio: FIRST_FILE_AUDIO,
            first_dialogue_audio: FIRST_DIALOGUE_AUDIO,
        }
    }

    /// The services with this wait for the first sound.
    pub fn first_audio_within(mut self, limit: Duration) -> Self {
        self.first_file_audio = limit;
        self.first_dialogue_audio = limit;
        self
    }

    /// The OpenRouter address that every OpenRouter call of this app uses.
    pub(crate) fn open_router(&self) -> &str {
        &self.open_router
    }

    /// The HTTP client every request of this app shares.
    pub(crate) fn client(&self) -> &reqwest::Client {
        &self.client
    }

    /// The longest wait for the file of the ElevenLabs voice.
    pub fn first_file_audio(&self) -> Duration {
        self.first_file_audio
    }

    pub async fn check(&self, provider: Provider, key: &str) -> Result<ProviderStatus> {
        match provider {
            Provider::OpenRouter => self.check_open_router(key).await,
            Provider::ElevenLabs => self.check_eleven_labs(key).await,
        }
    }

    async fn check_open_router(&self, key: &str) -> Result<ProviderStatus> {
        let response = self
            .client
            .get(format!("{}/api/v1/key", self.open_router))
            .bearer_auth(key)
            .send()
            .await?;
        let body: OpenRouterEnvelope = decode(response).await?;

        Ok(ProviderStatus {
            provider: Provider::OpenRouter,
            connected: true,
            label: Some(body.data.label.clone()),
            detail: Some(open_router_detail(&body.data)),
        })
    }

    async fn check_eleven_labs(&self, key: &str) -> Result<ProviderStatus> {
        let body = self.quota(key).await?;
        let left = body.character_limit.saturating_sub(body.character_count);
        if left == 0 {
            return Err(ProviderError::QuotaEmpty);
        }

        Ok(ProviderStatus {
            provider: Provider::ElevenLabs,
            connected: true,
            label: body.tier,
            detail: Some(format!("{} characters left this month", thousands(left))),
        })
    }

    /// The current ElevenLabs character allowance. It carries counts, never
    /// the key that was used to read them.
    pub async fn quota(&self, key: &str) -> Result<ElevenLabsQuota> {
        let response = self
            .client
            .get(format!("{}/v1/user/subscription", self.eleven_labs))
            .header("xi-api-key", key)
            .send()
            .await?;
        decode(response).await
    }

    /// The sound of one sentence, as MP3 bytes.
    pub async fn speak(&self, key: &str, voice: &VoiceSettings, text: &str) -> Result<Vec<u8>> {
        let response = self
            .client
            .post(format!(
                "{}/v1/text-to-speech/{}?output_format=mp3_44100_128",
                self.eleven_labs, voice.voice_id
            ))
            .header("xi-api-key", key)
            .json(&serde_json::json!({
                "text": text,
                "model_id": voice.model_id,
                "voice_settings": {
                    "stability": voice.stability,
                    "similarity_boost": voice.similarity,
                    "speed": voice.speed,
                },
            }))
            .send()
            .await?;

        Ok(accepted(response).await?.bytes().await?.to_vec())
    }

    /// Speaks the parts of one sentence in the Dialogue voice. Each chunk of
    /// sound goes to `on_samples` as it arrives: 16-bit mono samples at
    /// `STREAM_SAMPLE_RATE`.
    pub async fn speak_dialogue(
        &self,
        key: &str,
        voice: &VoiceSettings,
        parts: &[String],
        mut on_samples: impl FnMut(&[i16]),
    ) -> Result<()> {
        if voice.model_id == CONVERSATIONAL_MODEL {
            return self
                .speak_dialogue_socket(key, voice, parts, on_samples)
                .await;
        }
        for part in parts {
            self.speak_dialogue_stream(key, voice, part, &mut on_samples)
                .await?;
        }
        Ok(())
    }

    /// Speaks the parts of one sentence through the ElevenLabs dialogue socket.
    ///
    /// The first message registers the one voice, then each part goes as one
    /// `inputs` frame, and `close_socket` asks for the rest of the sound and
    /// the final mark.
    async fn speak_dialogue_socket(
        &self,
        key: &str,
        voice: &VoiceSettings,
        parts: &[String],
        on_samples: impl FnMut(&[i16]),
    ) -> Result<()> {
        let voice_id = voice.voice_id.as_str();
        let mut messages = vec![serde_json::json!({
            "voices": [voice_id],
            "voice_settings": { "stability": voice.stability },
        })];
        messages.extend(
            parts.iter().map(
                |part| serde_json::json!({ "inputs": [{ "text": part, "voice_id": voice_id }] }),
            ),
        );
        messages.push(serde_json::json!({ "close_socket": true }));
        self.socket_stream(
            &format!(
                "/v1/text-to-dialogue/stream-input?model_id={}&output_format=pcm_{STREAM_SAMPLE_RATE}",
                voice.model_id
            ),
            key,
            messages,
            self.first_dialogue_audio,
            on_samples,
        )
        .await
    }

    /// Sends the messages through the ElevenLabs dialogue socket. Each chunk of
    /// sound goes to `on_samples` as it arrives. The call returns at the final
    /// mark.
    async fn socket_stream(
        &self,
        path: &str,
        key: &str,
        messages: Vec<serde_json::Value>,
        first_audio: Duration,
        mut on_samples: impl FnMut(&[i16]),
    ) -> Result<()> {
        let base = self
            .eleven_labs
            .replacen("https://", "wss://", 1)
            .replacen("http://", "ws://", 1);
        let mut request = format!("{base}{path}")
            .into_client_request()
            .map_err(unexpected)?;
        request.headers_mut().insert(
            "xi-api-key",
            key.parse()
                .map_err(|_| ProviderError::Unexpected("the key is not a header value".into()))?,
        );

        let (mut socket, _) = tokio_tungstenite::connect_async(request)
            .await
            .map_err(|error| match error {
                tungstenite::Error::Http(response)
                    if matches!(response.status().as_u16(), 401 | 403) =>
                {
                    ProviderError::Rejected
                }
                other => unexpected(other),
            })?;

        for message in messages {
            socket
                .send(Message::Text(message.to_string().into()))
                .await
                .map_err(unexpected)?;
        }

        let mut carry: Option<u8> = None;
        let mut heard = false;
        loop {
            let next = if heard {
                socket.next().await
            } else {
                tokio::time::timeout(first_audio, socket.next())
                    .await
                    .map_err(|_| {
                        ProviderError::Unexpected("ElevenLabs sent no sound in time".into())
                    })?
            };
            let text = match next {
                Some(Ok(Message::Text(text))) => text,
                Some(Ok(Message::Close(_))) | None => {
                    return Err(ProviderError::Unexpected(
                        "ElevenLabs closed the voice before the end".into(),
                    ))
                }
                Some(Ok(_)) => continue,
                Some(Err(error)) => return Err(unexpected(error)),
            };

            let reply: StreamReply = serde_json::from_str(&text)?;
            if let Some(problem) = reply.message.or(reply.error) {
                return Err(ProviderError::Unexpected(problem));
            }
            if let Some(audio) = reply.audio {
                let samples = samples_from(&audio, &mut carry)?;
                if !samples.is_empty() {
                    heard = true;
                    on_samples(&samples);
                }
            }
            if reply.is_final == Some(true) {
                return Ok(());
            }
        }
    }

    /// Speaks one part of a sentence through the ElevenLabs Dialogue stream.
    ///
    /// The stream sends one JSON object after the other, with or without a
    /// line break between them. The call returns when the stream ends.
    async fn speak_dialogue_stream(
        &self,
        key: &str,
        voice: &VoiceSettings,
        text: &str,
        mut on_samples: impl FnMut(&[i16]),
    ) -> Result<()> {
        let deadline = tokio::time::Instant::now() + self.first_dialogue_audio;
        let late = || ProviderError::Unexpected("ElevenLabs sent no sound in time".into());
        let request = self
            .client
            .post(format!(
                "{}/v1/text-to-dialogue/stream/with-timestamps?output_format=pcm_{STREAM_SAMPLE_RATE}",
                self.eleven_labs
            ))
            .header("xi-api-key", key)
            .json(&serde_json::json!({
                "inputs": [{ "text": text, "voice_id": voice.voice_id }],
                "model_id": voice.model_id,
                "settings": { "stability": voice.stability },
            }))
            .send();
        let response = tokio::time::timeout_at(deadline, request)
            .await
            .map_err(|_| late())??;

        let mut body = accepted(response).await?.bytes_stream();
        let mut waiting: Vec<u8> = Vec::new();
        let mut carry: Option<u8> = None;
        let mut heard = false;
        loop {
            let next = if heard {
                body.next().await
            } else {
                tokio::time::timeout_at(deadline, body.next())
                    .await
                    .map_err(|_| late())?
            };
            let Some(bytes) = next else { break };
            waiting.extend_from_slice(&bytes?);

            let (objects, used) = complete_objects(&waiting);
            for (start, end) in objects {
                let reply: DialogueReply = serde_json::from_slice(&waiting[start..end])?;
                if let Some(audio) = reply.audio_base64 {
                    let samples = samples_from(&audio, &mut carry)?;
                    if !samples.is_empty() {
                        heard = true;
                        on_samples(&samples);
                    }
                }
            }
            waiting.drain(..used);
        }

        if !waiting.iter().all(u8::is_ascii_whitespace) {
            return Err(ProviderError::Unexpected(
                "ElevenLabs ended the voice inside a reply".into(),
            ));
        }
        Ok(())
    }

    /// Creates one account voice from an already encoded multipart request.
    ///
    /// The WebView owns the files and their names, so it encodes the body. Rust
    /// adds the native key here; the key never crosses back to React.
    pub async fn clone_voice(
        &self,
        key: &str,
        content_type: &str,
        body: Vec<u8>,
    ) -> Result<CreatedVoice> {
        let response = self
            .client
            .post(format!("{}/v1/voices/add", self.eleven_labs))
            .header("xi-api-key", key)
            .header("content-type", content_type)
            .body(body)
            .send()
            .await?;

        decode(response).await
    }

    /// Every voice of the account and every stock voice, each with its
    /// category.
    pub async fn voices(&self, key: &str) -> Result<Vec<Voice>> {
        // The v2 list gives 10 voices a page without `page_size`, and at most
        // 100 with it. `next_page_token` names the next page.
        let mut voices = Vec::new();
        let mut page: Option<String> = None;
        loop {
            let mut url = reqwest::Url::parse(&format!("{}/v2/voices", self.eleven_labs))
                .map_err(unexpected)?;
            url.query_pairs_mut().append_pair("page_size", "100");
            if let Some(token) = &page {
                url.query_pairs_mut().append_pair("next_page_token", token);
            }
            let response = self
                .client
                .get(url)
                .header("xi-api-key", key)
                .send()
                .await?;
            let body: VoiceList = decode(response).await?;
            voices.extend(body.voices);
            match body.next_page_token {
                Some(token) if body.has_more => page = Some(token),
                _ => return Ok(voices),
            }
        }
    }
}

/// The response when the service accepted the request. A refusal becomes
/// the error that says why, with the message of the service when it sent one.
async fn accepted(response: reqwest::Response) -> Result<reqwest::Response> {
    let status = response.status();
    if matches!(status, StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN) {
        return Err(ProviderError::Rejected);
    }
    if status == StatusCode::TOO_MANY_REQUESTS {
        return Err(ProviderError::QuotaEmpty);
    }
    if status.is_success() {
        return Ok(response);
    }

    let bytes = response.bytes().await?;
    let message = serde_json::from_slice::<Value>(&bytes)
        .ok()
        .and_then(|body| {
            body.pointer("/detail/message")
                .or_else(|| body.get("detail"))
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        .or_else(|| {
            let text = String::from_utf8_lossy(&bytes).trim().to_owned();
            (!text.is_empty()).then_some(text)
        })
        .unwrap_or_else(|| format!("HTTP {}", status.as_u16()));
    Err(ProviderError::Unexpected(message))
}

async fn decode<T: DeserializeOwned>(response: reqwest::Response) -> Result<T> {
    let bytes = accepted(response).await?.bytes().await?;
    serde_json::from_slice(&bytes).map_err(|error| ProviderError::Unexpected(error.to_string()))
}

fn open_router_detail(data: &OpenRouterKey) -> String {
    if data.is_free_tier {
        return "Free models only".into();
    }
    match data.limit {
        Some(limit) => format!("${:.2} left", limit - data.usage),
        None => "No spend limit".into(),
    }
}

/// `9412` becomes `9,412`. A quota reads faster with the separator.
fn thousands(value: u64) -> String {
    let digits = value.to_string();
    let mut grouped = String::with_capacity(digits.len() + digits.len() / 3);
    for (index, digit) in digits.char_indices() {
        if index > 0 && (digits.len() - index).is_multiple_of(3) {
            grouped.push(',');
        }
        grouped.push(digit);
    }
    grouped
}

#[derive(Deserialize)]
struct OpenRouterEnvelope {
    data: OpenRouterKey,
}

#[derive(Deserialize)]
struct OpenRouterKey {
    #[serde(default)]
    label: String,
    #[serde(default)]
    is_free_tier: bool,
    #[serde(default)]
    usage: f64,
    #[serde(default)]
    limit: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct ElevenLabsQuota {
    #[serde(default)]
    pub tier: Option<String>,
    #[serde(default)]
    pub character_count: u64,
    #[serde(default)]
    pub character_limit: u64,
    #[serde(default, rename(deserialize = "next_character_count_reset_unix"))]
    pub resets_at: Option<u64>,
}

#[derive(Deserialize)]
struct VoiceList {
    voices: Vec<Voice>,
    #[serde(default)]
    has_more: bool,
    #[serde(default)]
    next_page_token: Option<String>,
}

/// One object of the Dialogue stream. The timing fields are not read.
#[derive(Deserialize)]
struct DialogueReply {
    #[serde(default)]
    audio_base64: Option<String>,
}

/// The complete JSON objects at the start of `bytes`, as ranges, and the
/// number of bytes they use. Braces inside a string do not count.
fn complete_objects(bytes: &[u8]) -> (Vec<(usize, usize)>, usize) {
    let mut objects = Vec::new();
    let (mut depth, mut start, mut used) = (0_usize, 0_usize, 0_usize);
    let (mut quoted, mut escaped) = (false, false);
    for (index, &byte) in bytes.iter().enumerate() {
        if quoted {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == b'"' {
                quoted = false;
            }
            continue;
        }
        match byte {
            b'"' => quoted = true,
            b'{' => {
                if depth == 0 {
                    start = index;
                }
                depth += 1;
            }
            b'}' if depth > 0 => {
                depth -= 1;
                if depth == 0 {
                    objects.push((start, index + 1));
                    used = index + 1;
                }
            }
            _ => {}
        }
    }
    (objects, used)
}

/// The 16-bit samples of one base64 chunk. A chunk can end inside a sample,
/// so the odd byte waits in `carry` for the next chunk.
fn samples_from(audio: &str, carry: &mut Option<u8>) -> Result<Vec<i16>> {
    let mut bytes = Vec::with_capacity(audio.len());
    bytes.extend(carry.take());
    bytes.extend(
        base64::engine::general_purpose::STANDARD
            .decode(audio)
            .map_err(unexpected)?,
    );
    if bytes.len() % 2 == 1 {
        *carry = bytes.pop();
    }
    Ok(bytes
        .as_chunks::<2>()
        .0
        .iter()
        .map(|pair| i16::from_le_bytes(*pair))
        .collect())
}

/// One message from the ElevenLabs dialogue socket.
#[derive(Deserialize)]
struct StreamReply {
    #[serde(default)]
    audio: Option<String>,
    #[serde(default)]
    is_final: Option<bool>,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    error: Option<String>,
}

fn unexpected(error: impl std::fmt::Display) -> ProviderError {
    ProviderError::Unexpected(error.to_string())
}

#[cfg(test)]
mod tests {
    use std::cell::Cell;

    use super::{thousands, Provider, ProviderKeys, Voice, CONVERSATIONAL_MODEL};

    #[test]
    fn the_conversational_model_is_the_one_the_web_view_names() {
        let rules = include_str!("../../../../packages/core/rules/voice.ts");
        assert!(rules.contains(&format!(
            "export const CONVERSATIONAL_MODEL = \"{CONVERSATIONAL_MODEL}\";"
        )));
    }

    #[test]
    fn provider_keys_are_loaded_once_and_then_read_from_memory() {
        let reads = Cell::new(0);
        let keys = ProviderKeys::load_with(|provider| {
            reads.set(reads.get() + 1);
            Ok(Some(match provider {
                Provider::OpenRouter => "openrouter-key".into(),
                Provider::ElevenLabs => "elevenlabs-key".into(),
            }))
        });

        assert_eq!(reads.get(), Provider::ALL.len());
        assert_eq!(
            keys.get(Provider::OpenRouter).unwrap().as_deref(),
            Some("openrouter-key")
        );
        assert_eq!(
            keys.get(Provider::OpenRouter).unwrap().as_deref(),
            Some("openrouter-key")
        );
        assert_eq!(
            keys.get(Provider::ElevenLabs).unwrap().as_deref(),
            Some("elevenlabs-key")
        );
        assert_eq!(reads.get(), Provider::ALL.len());
    }

    #[test]
    fn a_keychain_read_error_is_cached_without_stopping_startup() {
        let reads = Cell::new(0);
        let keys = ProviderKeys::load_with(|provider| {
            reads.set(reads.get() + 1);
            match provider {
                Provider::OpenRouter => Err(super::ProviderError::Keychain("locked".into())),
                Provider::ElevenLabs => Ok(None),
            }
        });

        assert_eq!(reads.get(), Provider::ALL.len());
        assert!(matches!(
            keys.get(Provider::OpenRouter),
            Err(super::ProviderError::Keychain(detail)) if detail == "locked"
        ));
        assert_eq!(reads.get(), Provider::ALL.len());
    }

    #[test]
    fn the_screen_reads_a_voice_by_id() {
        // ElevenLabs names it `voice_id`. The screens read
        // `id`, so the rename must work one way only.
        let voice: Voice = serde_json::from_value(serde_json::json!({
            "voice_id": "v1",
            "name": "Ravi",
            "preview_url": null,
        }))
        .unwrap();
        assert_eq!(voice.id, "v1");
        assert_eq!(serde_json::to_value(&voice).unwrap()["id"], "v1");
    }

    #[test]
    fn a_quota_reads_with_separators() {
        assert_eq!(thousands(0), "0");
        assert_eq!(thousands(999), "999");
        assert_eq!(thousands(9_412), "9,412");
        assert_eq!(thousands(1_000_000), "1,000,000");
    }
}
