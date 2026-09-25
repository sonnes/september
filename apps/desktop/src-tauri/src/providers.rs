//! The two cloud services September can borrow: OpenRouter for AI Assistance,
//! and ElevenLabs for a voice. A key persists in the macOS Keychain, is cached
//! in Rust for one run, and never reaches the WebView.

use std::{sync::RwLock, time::Duration};

use base64::Engine as _;
use futures_util::{SinkExt, StreamExt};
use reqwest::StatusCode;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use tokio_tungstenite::tungstenite::{self, client::IntoClientRequest, Message};

pub(crate) const OPEN_ROUTER: &str = "https://openrouter.ai";

/// Free models, best first. OpenRouter takes the whole list and uses the
/// first one that answers, so one bad day for one model is not one bad day
/// for the user. Refresh the ids when they rotate.
pub(crate) const OPEN_ROUTER_MODELS: [&str; 4] = [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "openai/gpt-oss-20b:free",
];
const ELEVEN_LABS: &str = "https://api.elevenlabs.io";

/// A voice that sends no sound in this time does not answer. The system voice
/// then speaks, so the user never waits long in silence.
const FIRST_AUDIO: Duration = Duration::from_secs(5);

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
    /// `cloned`, `professional`, `premade`, or `similar`. It sets the order,
    /// and the Voice screen groups the voices of the user by it.
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

/// One OpenRouter model the user can choose.
///
/// September promises that the user needs no card, so the picker shows the
/// free rows until the user searches. `free` tells the screen which rows those
/// are, and which rows to mark. It carries no price: a user who cannot pay
/// needs the answer, not the number.
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct WritingModel {
    pub id: String,
    pub name: String,
    /// True when a prompt token and a completion token both cost zero.
    pub free: bool,
}

/// One row of the OpenRouter model list, before the price decides.
#[derive(Debug, Clone, Deserialize)]
struct OpenRouterModelRow {
    id: String,
    name: String,
    #[serde(default)]
    pricing: OpenRouterPricing,
}

#[derive(Debug, Clone, Default, Deserialize)]
struct OpenRouterPricing {
    #[serde(default)]
    prompt: String,
    #[serde(default)]
    completion: String,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenRouterModelList {
    data: Vec<OpenRouterModelRow>,
}

/// OpenRouter gives a price as a string of dollars for one token. A free
/// model reads `0`. An absent price is not known to be free, so it is paid.
fn costs_nothing(price: &str) -> bool {
    price
        .trim()
        .parse::<f64>()
        .is_ok_and(|dollars| dollars == 0.0)
}

/// One ElevenLabs model. It decides the quality, the speed, and the languages.
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct Model {
    #[serde(rename(deserialize = "model_id"))]
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    /// Some models only listen. The screen shows the models that speak.
    #[serde(
        default,
        rename(deserialize = "can_do_text_to_speech"),
        skip_serializing
    )]
    pub speaks: bool,
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

pub struct Providers {
    client: reqwest::Client,
    open_router: String,
    eleven_labs: String,
    first_audio: Duration,
}

impl Default for Providers {
    fn default() -> Self {
        Self::with_bases(OPEN_ROUTER, ELEVEN_LABS)
    }
}

impl Providers {
    /// A test points both bases at loopback. Nothing else calls this.
    pub fn with_bases(open_router: &str, eleven_labs: &str) -> Self {
        Self {
            client: reqwest::Client::new(),
            open_router: open_router.trim_end_matches('/').to_owned(),
            eleven_labs: eleven_labs.trim_end_matches('/').to_owned(),
            first_audio: FIRST_AUDIO,
        }
    }

    /// A test shortens the wait for the first sound. Nothing else calls this.
    pub fn first_audio_within(mut self, limit: Duration) -> Self {
        self.first_audio = limit;
        self
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

    /// Text from OpenRouter, in the shape that the local model answers in.
    /// The sound of one sentence, as MP3 bytes.
    pub async fn speak(
        &self,
        key: &str,
        settings: &crate::speech::SpeechSettings,
        text: &str,
    ) -> Result<Vec<u8>> {
        let voice = settings.voice_id.as_deref().unwrap_or_default();
        let response = self
            .client
            .post(format!(
                "{}/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
                self.eleven_labs
            ))
            .header("xi-api-key", key)
            .json(&serde_json::json!({
                "text": text,
                "model_id": settings.model_id,
                "voice_settings": {
                    "stability": settings.stability,
                    "similarity_boost": settings.similarity,
                    "speed": settings.speed,
                },
            }))
            .send()
            .await?;

        let status = response.status();
        if matches!(status, StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN) {
            return Err(ProviderError::Rejected);
        }
        if !status.is_success() {
            return Err(ProviderError::Unexpected(format!(
                "ElevenLabs answered {status}"
            )));
        }

        Ok(response.bytes().await?.to_vec())
    }

    /// Speaks one sentence through the ElevenLabs socket.
    ///
    /// Each chunk of sound goes to `on_samples` as it arrives: 16-bit mono
    /// samples at 24 kHz. A chunk can end inside a sample, so the odd byte
    /// waits for the next chunk. The call returns when the service marks the
    /// sentence final.
    pub async fn speak_stream(
        &self,
        key: &str,
        settings: &crate::speech::SpeechSettings,
        text: &str,
        mut on_samples: impl FnMut(&[i16]),
    ) -> Result<()> {
        let base = self
            .eleven_labs
            .replacen("https://", "wss://", 1)
            .replacen("http://", "ws://", 1);
        let voice = settings.voice_id.as_deref().unwrap_or_default();
        let mut request = format!(
            "{base}/v1/text-to-speech/{voice}/stream-input?model_id={}&output_format=pcm_24000",
            settings.model_id
        )
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

        for message in [
            serde_json::json!({
                "text": " ",
                "voice_settings": {
                    "stability": settings.stability,
                    "similarity_boost": settings.similarity,
                    "speed": settings.speed,
                },
            }),
            serde_json::json!({ "text": format!("{text} "), "flush": true }),
            serde_json::json!({ "text": "" }),
        ] {
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
                tokio::time::timeout(self.first_audio, socket.next())
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
                let mut bytes = Vec::with_capacity(audio.len());
                bytes.extend(carry.take());
                bytes.extend(
                    base64::engine::general_purpose::STANDARD
                        .decode(audio)
                        .map_err(unexpected)?,
                );
                if bytes.len() % 2 == 1 {
                    carry = bytes.pop();
                }
                let samples: Vec<i16> = bytes
                    .chunks_exact(2)
                    .map(|pair| i16::from_le_bytes([pair[0], pair[1]]))
                    .collect();
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

        decode_eleven_labs(response).await
    }

    pub async fn voices(&self, key: &str) -> Result<Vec<Voice>> {
        // The web app asks the same way. `non-default` leaves out the stock
        // voices, so the list holds the voices of this account only. The v2
        // list counts a page with `page_size`, and gives 10 without it.
        let response = self
            .client
            .get(format!(
                "{}/v2/voices?page_size=100&voice_type=non-default",
                self.eleven_labs
            ))
            .header("xi-api-key", key)
            .send()
            .await?;
        let body: VoiceList = decode(response).await?;

        let mut voices = body.voices;
        voices.sort_by_key(|voice| rank(voice.category.as_deref()));
        Ok(voices)
    }

    /// Every OpenRouter model, the free ones first and then by name.
    ///
    /// The search of the picker reaches every model, so the price sorts the
    /// list here instead of cutting it. The screen shows the free rows until
    /// the user types, and marks a paid row that a search finds.
    pub async fn writing_models(&self, key: &str) -> Result<Vec<WritingModel>> {
        let response = self
            .client
            .get(format!("{}/api/v1/models", self.open_router))
            .bearer_auth(key)
            .send()
            .await?;
        let body: OpenRouterModelList = decode(response).await?;

        let mut models: Vec<WritingModel> = body
            .data
            .into_iter()
            .map(|row| WritingModel {
                free: costs_nothing(&row.pricing.prompt) && costs_nothing(&row.pricing.completion),
                id: row.id,
                name: row.name,
            })
            .collect();
        models.sort_by(|left, right| {
            right
                .free
                .cmp(&left.free)
                .then_with(|| left.name.cmp(&right.name))
        });
        Ok(models)
    }

    /// The ElevenLabs models that can speak. A model that only listens is not
    /// a choice the Voice screen can offer.
    pub async fn models(&self, key: &str) -> Result<Vec<Model>> {
        let response = self
            .client
            .get(format!("{}/v1/models", self.eleven_labs))
            .header("xi-api-key", key)
            .send()
            .await?;
        let models: Vec<Model> = decode(response).await?;
        Ok(models.into_iter().filter(|model| model.speaks).collect())
    }
}

/// The order of the web app. A voice that the user made comes first, and a
/// stock voice comes last.
fn rank(category: Option<&str>) -> u8 {
    match category {
        Some("cloned") => 1,
        Some("professional") => 2,
        Some("premade") => 3,
        Some("similar") => 4,
        _ => 5,
    }
}

async fn decode<T: DeserializeOwned>(response: reqwest::Response) -> Result<T> {
    let status = response.status();
    if matches!(status, StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN) {
        return Err(ProviderError::Rejected);
    }
    if status == StatusCode::TOO_MANY_REQUESTS {
        return Err(ProviderError::QuotaEmpty);
    }
    if !status.is_success() {
        return Err(ProviderError::Unexpected(format!(
            "HTTP {}",
            status.as_u16()
        )));
    }
    response
        .json()
        .await
        .map_err(|error| ProviderError::Unexpected(error.to_string()))
}

/// Reads the provider's useful failure sentence before the response is lost.
async fn decode_eleven_labs<T: DeserializeOwned>(response: reqwest::Response) -> Result<T> {
    let status = response.status();
    if matches!(status, StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN) {
        return Err(ProviderError::Rejected);
    }
    if status == StatusCode::TOO_MANY_REQUESTS {
        return Err(ProviderError::QuotaEmpty);
    }

    let bytes = response.bytes().await?;
    if !status.is_success() {
        let message = serde_json::from_slice::<serde_json::Value>(&bytes)
            .ok()
            .and_then(|body| {
                body.pointer("/detail/message")
                    .or_else(|| body.get("detail"))
                    .and_then(|value| value.as_str())
                    .map(str::to_owned)
            })
            .or_else(|| {
                let text = String::from_utf8_lossy(&bytes).trim().to_owned();
                (!text.is_empty()).then_some(text)
            })
            .unwrap_or_else(|| format!("ElevenLabs answered {status}"));
        return Err(ProviderError::Unexpected(message));
    }

    serde_json::from_slice(&bytes).map_err(ProviderError::Encoding)
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
}

/// One message from the ElevenLabs voice socket.
#[derive(Deserialize)]
struct StreamReply {
    #[serde(default)]
    audio: Option<String>,
    #[serde(default, rename = "isFinal")]
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

    use super::{thousands, Model, Provider, ProviderKeys, Voice};

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
    fn the_screen_reads_the_category_and_owner_of_a_voice() {
        // The Voice screen puts a voice the user made in its own group.
        let voice: Voice = serde_json::from_value(serde_json::json!({
            "voice_id": "v1",
            "name": "My voice",
            "category": "cloned",
            "is_owner": true,
        }))
        .unwrap();
        let sent = serde_json::to_value(&voice).unwrap();
        assert_eq!(sent["category"], "cloned");
        assert_eq!(sent["is_owner"], true);
    }

    #[test]
    fn the_screen_reads_a_voice_and_a_model_by_id() {
        // ElevenLabs names them `voice_id` and `model_id`. The screens read
        // `id`, so the rename must work one way only.
        let voice: Voice = serde_json::from_value(serde_json::json!({
            "voice_id": "v1",
            "name": "Ravi",
            "preview_url": null,
        }))
        .unwrap();
        assert_eq!(voice.id, "v1");
        assert_eq!(serde_json::to_value(&voice).unwrap()["id"], "v1");

        let model: Model = serde_json::from_value(serde_json::json!({
            "model_id": "eleven_turbo_v2_5",
            "name": "Turbo v2.5",
            "can_do_text_to_speech": true,
        }))
        .unwrap();
        assert_eq!(model.id, "eleven_turbo_v2_5");
        assert_eq!(
            serde_json::to_value(&model).unwrap()["id"],
            "eleven_turbo_v2_5"
        );
    }

    #[test]
    fn each_provider_owns_one_keychain_account() {
        assert_eq!(Provider::OpenRouter.account(), "openrouter");
        assert_eq!(Provider::ElevenLabs.account(), "elevenlabs");
        assert_eq!(Provider::ALL.len(), 2);
    }

    #[test]
    fn a_quota_reads_with_separators() {
        assert_eq!(thousands(0), "0");
        assert_eq!(thousands(999), "999");
        assert_eq!(thousands(9_412), "9,412");
        assert_eq!(thousands(1_000_000), "1,000,000");
    }
}
