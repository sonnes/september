import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Mic, Plus, Volume2 } from "lucide-react";
import { Button } from "@september/ui/components/button";
import { ChoiceKey } from "@september/app-ui/blocks/pick-list";
import { Skeleton } from "@september/ui/components/skeleton";
import { navFor } from "@september/core/rules/navigation";
import { platform } from "@platform/adapter";
import type { Voice } from "@september/app-ui/platform";
import { useConnections, useKeepCreatedVoice, useVoices } from "@september/app-ui/services/connections";
import { heardVoices as heardSetting } from "@september/app-ui/services/settings";
import { heardVoices, speechServices, VOICE_SAMPLE_TEXT, type SpeechSettings } from "@september/core/rules/voice";
import { play } from "@september/app-ui/services/player";
import type { CreatedVoice } from "@september/app-ui/services/cloning";
import { Screen } from "@september/app-ui/blocks/screen";
import { speak, speechSettings, updateSpeech, useSpeechSettings } from "@september/app-ui/services/speech";
import { useVoiceCloneDraft, VoiceCloneForm } from "@september/app-ui/blocks/voice-clone";
import { VoicePicker } from "@september/app-ui/blocks/voice-picker";

/**
 * The voice screen: which service and which voice speak, and making a voice
 * of your own.
 *
 * The model and the sliders are in the Voice tab of the rail beside a space,
 * where the user hears a change next to the sentence being written. The
 * voices are here: an account holds a hundred of them, each one worth hearing
 * before it is chosen, and that list wants a whole screen.
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
  const voices = listed.data ?? null;

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
          {speechServices(platform.voice.systemDescription).map((service) => (
            <ChoiceKey
              key={service.value}
              value={service.value}
              checked={provider === service.value}
              tabbable={provider === service.value}
              onChoose={() => change({ provider: service.value })}
            >
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-sm font-medium">{service.label}</span>
                <span className="text-muted-foreground block text-sm">{service.description}</span>
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
              <VoicePicker
                voices={voices}
                heard={heardBefore}
                value={voiceId}
                onPick={(next) => change({ voiceId: next })}
                onHear={hear}
                name="Voices"
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
  const keepCreatedVoice = useKeepCreatedVoice();

  const handleCreated = async (created: CreatedVoice) => {
    const current = speechSettings();
    await updateSpeech({
      // A new clone speaks through the ElevenLabs service in use.
      provider: current.provider === "dialogue" ? "dialogue" : "elevenlabs",
      voiceId: created.id,
    });
    await keepCreatedVoice(created);
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
