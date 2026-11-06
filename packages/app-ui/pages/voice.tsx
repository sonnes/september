import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Mic, Play, Plus, Volume2 } from "lucide-react";
import { Button } from "@september/ui/components/button";
import { ChoiceKey, PickList } from "@september/app-ui/blocks/pick-list";
import { Skeleton } from "@september/ui/components/skeleton";
import { navFor } from "@september/core/rules/navigation";
import type { Voice } from "@september/app-ui/platform";
import { useConnections, useVoices } from "@september/app-ui/services/connections";
import { heardVoices as heardSetting } from "@september/app-ui/services/settings";
import { matchesWords } from "@september/core/rules/pick";
import { heardVoices, VOICE_SAMPLE_TEXT, voiceRows } from "@september/core/rules/voice";
import { play } from "@september/app-ui/services/player";
import { type CreatedVoice, keepCreatedVoice, recentCreatedVoice, rememberCreatedVoice } from "@september/app-ui/services/cloning";
import { Screen } from "@september/app-ui/blocks/screen";
import { speak, type SpeechSettings, speechSettings, updateSpeech, useSpeechSettings, type VoiceService } from "@september/app-ui/services/speech";
import { useVoiceCloneDraft, VoiceCloneForm } from "@september/app-ui/blocks/voice-clone";

/** A voice made a moment ago, before ElevenLabs lists it. */
function optimisticCreatedVoice(): Voice | null {
  const created = recentCreatedVoice();
  return created
    ? { ...created, preview_url: null, category: "cloned", is_owner: true }
    : null;
}

/**
 * The voice screen: which voice speaks, and making one of your own.
 *
 * The service, the model, and the sliders moved into the Voice tab of the
 * rail beside a space, where a change is heard next to the sentence being
 * written. The voices stayed here: an account holds a hundred of them, each
 * one worth hearing before it is chosen, and that list wants a whole screen.
 */
export function VoiceScreen() {
  const speech = useSpeechSettings();
  const { provider } = speech;
  const voiceId = speech.voiceId ?? "";
  const { connections, checking } = useConnections();
  const connected = checking ? null : connections.elevenlabs.connected;
  // The order is read once. A voice heard now joins Heard lately on the next
  // visit, so a row never moves under a user who is scanning the list.
  const [heardBefore] = useState(() => heardSetting.get());
  const [problem, setProblem] = useState("");
  // Both ElevenLabs services speak with a voice from the same list.
  const cloud = provider !== "system";
  const listed = useVoices(cloud && connected === true);
  const voices = listed.data ? keepCreatedVoice(listed.data, optimisticCreatedVoice()) : null;

  const show = (reason: unknown) =>
    setProblem(reason instanceof Error ? reason.message : String(reason));

  // One field of the setting changes at a time. The rest comes from the
  // store, so a slider moved in the rail card is not written back over.
  const change = (patch: Partial<SpeechSettings>) => {
    setProblem("");
    updateSpeech(patch).catch(show);
  };

  const hear = (voice: Voice) => {
    if (!voice.preview_url) return;
    setProblem("");
    play(voice.preview_url).catch(show);
    heardSetting.set(heardVoices(heardSetting.get(), voice.id)).catch(show);
  };

  return (
    <Screen
      title="Voice"
      description={navFor("/voice").description}
      action={
        <Button type="button" onClick={() => void speak(VOICE_SAMPLE_TEXT)}>
          <Volume2 aria-hidden />
          Hear it
        </Button>
      }
    >
      {problem ? (
        <p role="alert" className="text-destructive text-sm">
          {problem}
        </p>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Who speaks</h2>
        <div role="radiogroup" aria-label="Who speaks" className="grid gap-2">
          {VOICE_SERVICES.map((service) => (
            <ChoiceKey
              key={service.value}
              value={service.value}
              checked={provider === service.value}
              tabbable={provider === service.value}
              onChoose={() => change({ provider: service.value })}
            >
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-sm font-medium">{service.title}</span>
                <span className="text-muted-foreground block text-sm">{service.body}</span>
              </span>
            </ChoiceKey>
          ))}
        </div>

        {cloud && connected === false ? (
          <p className="text-muted-foreground text-sm">
            No ElevenLabs key is stored, so this device speaks instead.{" "}
            <Link to="/settings" className="text-brand underline">
              Add a key in Settings
            </Link>
            .
          </p>
        ) : null}
      </section>

      {cloud && connected ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Which voice</h2>
          {listed.error ? (
            <p role="alert" className="text-destructive text-sm">
              {listed.error.message}
            </p>
          ) : voices === null ? (
            <Skeleton className="h-24 w-full" />
          ) : voices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No voices came back from ElevenLabs.
            </p>
          ) : (
            <div role="group" aria-label="Voices">
              <PickList
                rows={voiceRows(voices, heardBefore)}
                value={voiceId}
                onPick={(next) => change({ voiceId: next })}
                label="Search voices"
                name="Voices"
                layout="list"
                filter={(rows, query) =>
                  rows.filter((row) =>
                    matchesWords(`${row.name} ${row.detail ?? ""}`, query),
                  )
                }
                // The button sits inside the row, so it always reads as part
                // of the voice beside it.
                after={({ voice }) => (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0 rounded-full"
                    aria-label={`Hear ${voice.name}`}
                    aria-disabled={!voice.preview_url}
                    // The sample is public, so it needs no key and no speech
                    // call.
                    onClick={() => hear(voice)}
                  >
                    <Play aria-hidden />
                  </Button>
                )}
              />
            </div>
          )}
        </section>
      ) : cloud ? null : (
        <p className="text-muted-foreground text-sm">
          This device controls the available system voices.
        </p>
      )}

      <Link
        to="/voice/clone"
        className="focus-attention hover:bg-accent flex min-h-16 w-full items-center gap-3 rounded-surface border border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-left transition-colors"
      >
        <span className="text-brand flex size-11 shrink-0 items-center justify-center rounded-control border bg-background">
          <Mic className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Clone your voice</span>
          <span className="text-muted-foreground block text-sm">
            Record or upload a few samples to make a personal voice.
          </span>
        </span>
        <span className="text-brand flex shrink-0 items-center gap-2 text-sm font-semibold">
          <Plus className="size-4" aria-hidden />
          Clone
        </span>
      </Link>

      <p className="text-muted-foreground text-sm">
        The model and the sound are in the Voice tab of the rail beside a
        space, so a change is heard next to the sentence you are writing.{" "}
        <Link to="/spaces" className="text-brand underline">
          Open a space
        </Link>
        .
      </p>
    </Screen>
  );
}

export function VoiceCloneScreen() {
  const navigate = useNavigate();
  const { connections, checking } = useConnections();
  const connected = checking ? null : connections.elevenlabs.connected;
  const draft = useVoiceCloneDraft();

  const handleCreated = async (created: CreatedVoice) => {
    rememberCreatedVoice(created);
    const current = speechSettings();
    await updateSpeech({
      // A new clone speaks through the ElevenLabs service in use.
      provider: current.provider === "dialogue" ? "dialogue" : "elevenlabs",
      voiceId: created.id,
    });
    await navigate({ to: "/voice", replace: true });
  };

  return (
    <Screen
      title="Clone your voice"
      description="Add clear samples with only your voice. September sends them to ElevenLabs when you create the voice."
      action={
        <Button asChild variant="outline" className="h-11">
          <Link to="/voice">
            <ChevronLeft aria-hidden />
            Back to Voice
          </Link>
        </Button>
      }
    >
      <VoiceCloneForm
        connected={connected}
        draft={draft}
        onCreated={handleCreated}
      />
    </Screen>
  );
}

/** The services that can speak, in the order of the choice. */
const VOICE_SERVICES: readonly { value: VoiceService; title: string; body: string }[] = [
  {
    value: "system",
    title: "System voice",
    body: "Built into this device. It needs no account.",
  },
  {
    value: "elevenlabs",
    title: "ElevenLabs",
    body: "Natural voices from a cloud service. It needs your key.",
  },
  {
    value: "dialogue",
    title: "ElevenLabs Dialogue",
    body: "Eleven v3 voices that can laugh, sigh, and whisper. It needs your ElevenLabs key.",
  },
];
