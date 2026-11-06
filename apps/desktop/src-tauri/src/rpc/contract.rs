//! Reads `contract/commands.json`, the examples that `src/commands.test.ts`
//! types with `Commands`, into the Rust types of each command.

use serde::{de::DeserializeOwned, Serialize};
use serde_json::{to_value, Value};

use super::*;
use crate::{
    apfel::ApfelStatus,
    audio::{AudioDevice, VirtualMicrophoneStatus},
    providers::{CreatedVoice, ElevenLabsQuota, Provider, ProviderStatus, Voice},
    proxy::Endpoint,
};

/// The command that `Commands` does not type, because it takes a channel.
const UNTYPED: &str = "gaze_start";

fn examples() -> Value {
    serde_json::from_str(include_str!("../../../contract/commands.json")).unwrap()
}

fn request<T: DeserializeOwned>(command: &str) -> T {
    serde_json::from_value(examples()[command]["args"]["request"].clone())
        .unwrap_or_else(|error| panic!("{command}: {error}"))
}

fn result(command: &str) -> Value {
    examples()[command]["result"].clone()
}

/// A row the WebView sends, read and written again without a change.
fn round_trip<T: DeserializeOwned + Serialize>(command: &str) {
    let sent = examples()[command]["args"]["request"].clone();
    let row: T = request(command);
    assert_eq!(to_value(row).unwrap(), sent, "{command}");
}

/// An answer the WebView reads, read from the example and written again.
fn same_answer<T: DeserializeOwned + Serialize>(command: &str) {
    let answer: T = serde_json::from_value(result(command))
        .unwrap_or_else(|error| panic!("{command}: {error}"));
    assert_eq!(to_value(answer).unwrap(), result(command), "{command}");
}

fn answers(command: &str, answer: impl Serialize) {
    assert_eq!(to_value(answer).unwrap(), result(command), "{command}");
}

/// The command names in `generate_handler!` of `lib.rs`.
fn handlers() -> Vec<&'static str> {
    let source = include_str!("../lib.rs");
    let start = source.find("generate_handler![").unwrap();
    let end = start + source[start..].find("])").unwrap();
    source[start..end]
        .lines()
        .skip(1)
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            line.trim()
                .trim_end_matches(',')
                .rsplit_once("::")
                .unwrap_or_else(|| panic!("cannot read the handler line {line:?}"))
                .1
        })
        .collect()
}

#[test]
fn every_command_has_an_example() {
    let examples = examples();
    let handlers = handlers();
    for name in &handlers {
        if *name != UNTYPED {
            assert!(examples.get(name).is_some(), "{name} has no example");
        }
    }
    for name in examples.as_object().unwrap().keys() {
        assert!(
            handlers.contains(&name.as_str()),
            "{name} has an example but no Rust command"
        );
    }
}

#[test]
fn the_rows_cross_unchanged() {
    round_trip::<Space>("space_put");
    round_trip::<SpacePatch>("space_patch");
    round_trip::<Message>("message_put");
    round_trip::<AgentMessage>("agent_message_put");
    round_trip::<Note>("note_put");
    round_trip::<SavedPhrase>("phrase_put");
    round_trip::<AnalyticsEvent>("analytics_put");

    same_answer::<Space>("space_put");
    same_answer::<Vec<Space>>("space_list");
    same_answer::<Message>("message_get");
    same_answer::<Vec<Message>>("message_list");
    same_answer::<Vec<AgentMessage>>("agent_message_list");
    same_answer::<AgentMessage>("agent_tool_state");
    same_answer::<Vec<Note>>("note_list");
    same_answer::<Vec<SavedPhrase>>("phrase_list");
    same_answer::<Vec<AnalyticsEvent>>("analytics_list");
    same_answer::<BackupContents>("backup_export");
}

#[test]
fn the_requests_name_every_field() {
    assert_eq!(request::<KeyRequest>("setting_get").key, "speech");
    let put: SettingPutRequest = request("setting_put");
    assert_eq!(
        (put.key.as_str(), &put.value),
        ("speech", &result("setting_put"))
    );

    let export: BackupExportRequest = request("backup_export");
    assert_eq!(
        (export.setting_keys, export.usage_since),
        (vec!["speech".into()], 4)
    );
    let import: BackupImportRequest = request("backup_import");
    assert_eq!(import.setting_keys, vec!["speech".to_string()]);
    assert_eq!(to_value(import.contents).unwrap(), result("backup_export"));

    assert_eq!(request::<SpaceListRequest>("space_list").user_id, "ravi");
    for (command, id) in [
        ("space_get", "s1"),
        ("space_delete", "s1"),
        ("message_get", "m1"),
        ("message_delete", "m1"),
        ("note_get", "n1"),
        ("note_delete", "n1"),
        ("phrase_delete", "p1"),
    ] {
        assert_eq!(request::<EntityIdRequest>(command).id, id, "{command}");
    }
    for command in ["message_list", "note_list", "phrase_list"] {
        let filter: SpaceFilterRequest = request(command);
        assert_eq!(filter.space_id.as_deref(), Some("s1"), "{command}");
    }
    assert_eq!(request::<SpaceRequest>("agent_message_list").space_id, "s1");

    let tool: AgentToolStateRequest = request("agent_tool_state");
    assert_eq!(
        (
            tool.id.as_str(),
            tool.expected.as_str(),
            tool.state.as_str()
        ),
        ("a1", "pending", "applied")
    );
    assert_eq!((tool.content.as_str(), tool.updated_at), ("{}", 2));

    let replace: PhraseReplaceRequest = request("phrase_replace_ai");
    assert_eq!(
        (replace.space_id.as_str(), replace.phrases.len()),
        ("s1", 1)
    );

    let list: AnalyticsListRequest = request("analytics_list");
    assert_eq!(
        (
            list.user_id.as_str(),
            list.start_at,
            list.end_at,
            list.since
        ),
        ("ravi", 1, 9, 0)
    );

    let system: SystemSpeechRequest = request("speech_system");
    assert_eq!((system.text.as_str(), system.speed), ("Hello", 1.0));

    let stream: SpeakRequest = request("speech_stream");
    assert_eq!(stream.text, "Hello");
    assert_eq!(stream.dialogue_parts, Some(vec!["Hello".to_string()]));
    let voice = request::<SpeakRequest>("speech_synthesize").voice;
    assert_eq!(
        (voice.voice_id.as_str(), voice.model_id.as_str()),
        ("v1", "eleven_v3")
    );
    assert_eq!(
        (voice.stability, voice.similarity, voice.speed),
        (0.5, 0.75, 1.0)
    );

    let connect: ProviderConnectRequest = request("provider_connect");
    assert_eq!(
        (connect.provider, connect.key.as_str()),
        (Provider::ElevenLabs, "xi")
    );
    assert_eq!(
        request::<ProviderRequest>("provider_forget").provider,
        Provider::OpenRouter
    );
    assert_eq!(
        request::<AudioOutputRequest>("audio_output_set").uid,
        "speakers"
    );

    for command in ["openrouter_connect", "openrouter_cancel"] {
        assert_eq!(
            request::<SignInRequest>(command).request_id,
            "r1",
            "{command}"
        );
    }
    for command in ["panel_setup", "panel_set_float", "panel_present"] {
        assert!(request::<SwitchRequest>(command).on, "{command}");
    }
}

#[test]
fn the_answers_carry_the_names_the_webview_reads() {
    answers(
        "speech_stream",
        StreamedAudio {
            from_cache: false,
            latency_ms: 120,
            interrupted: Some("The output changed.".into()),
        },
    );
    answers(
        "speech_synthesize",
        SpokenAudio {
            path: "/audio/a.mp3".into(),
        },
    );
    answers(
        "apfel_status",
        ApfelStatus {
            supported: true,
            available: false,
            reason: Some("Off".into()),
        },
    );
    answers(
        "writing_proxy",
        Endpoint {
            base_url: "http://127.0.0.1:1/v1".into(),
            apple_url: "http://127.0.0.1:1/apple".into(),
            token: "t".into(),
        },
    );
    let status = ProviderStatus {
        provider: Provider::ElevenLabs,
        connected: true,
        label: Some("Pro".into()),
        detail: None,
    };
    answers("provider_connect", &status);
    answers("provider_status", vec![&status]);
    answers(
        "provider_voices",
        vec![Voice {
            id: "v1".into(),
            name: "Mine".into(),
            preview_url: Some("https://x/v1.mp3".into()),
            category: Some("cloned".into()),
            is_owner: Some(true),
        }],
    );
    answers("provider_clone_voice", CreatedVoice { id: "v1".into() });
    answers(
        "provider_quota",
        ElevenLabsQuota {
            tier: Some("starter".into()),
            character_count: 10,
            character_limit: 100,
            resets_at: Some(99),
        },
    );
    answers(
        "audio_outputs",
        vec![AudioDevice {
            uid: "speakers".into(),
            name: "Speakers".into(),
        }],
    );
    answers(
        "virtual_microphone_status",
        VirtualMicrophoneStatus {
            active: true,
            name: "September".into(),
            uid: "mic".into(),
            detail: None,
        },
    );
}
