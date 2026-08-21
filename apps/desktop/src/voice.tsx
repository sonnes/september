import { useEffect, useState } from "react";

import { Link } from "@tanstack/react-router";
import { Play, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";

import { navFor } from "./app-nav";
import { listVoices, readConnections, saveSpeech, type Voice } from "./os";
import { play } from "./player";
import { Screen } from "./shell";
import {
  DEFAULT_SPEECH,
  speak,
  speechSettings,
  type SpeechSettings,
  type VoiceService,
} from "./speech";

const TRY_IT = "This is how I sound today.";

const SLIDERS = [
  {
    key: "speed",
    label: "Speed",
    low: "Slower",
    high: "Faster",
    min: 0.7,
    max: 1.2,
  },
  {
    key: "stability",
    label: "Steadiness",
    low: "More variable",
    high: "More steady",
    min: 0,
    max: 1,
  },
  {
    key: "similarity",
    label: "Likeness",
    low: "Lower",
    high: "Higher",
    min: 0,
    max: 1,
  },
] as const satisfies readonly {
  key: keyof SpeechSettings;
  label: string;
  low: string;
  high: string;
  min: number;
  max: number;
}[];

export function VoiceScreen() {
  const [settings, setSettings] = useState<SpeechSettings>(speechSettings);
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  // Every change is kept. There is no Save button to forget.
  const change = (next: Partial<SpeechSettings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    void saveSpeech(merged);
  };

  useEffect(() => {
    void readConnections().then((connections) =>
      setConnected(connections.elevenlabs.connected),
    );
  }, []);

  useEffect(() => {
    if (settings.provider !== "elevenlabs") return;
    void listVoices()
      .then(setVoices)
      .catch(() => setVoices([]));
  }, [settings.provider]);

  const cloud = settings.provider === "elevenlabs";

  return (
    <Screen
      title="Voice"
      description={navFor("/voice").description}
      action={
        <Button type="button" onClick={() => void speak(TRY_IT)}>
          <Volume2 aria-hidden />
          Try it
        </Button>
      }
    >
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Who speaks</h2>
        <RadioGroup
          value={settings.provider}
          onValueChange={(value) =>
            change({ provider: value as VoiceService })
          }
          className="grid gap-2"
        >
          <ServiceChoice
            value="system"
            title="This Mac"
            body="The voice of the operating system. It needs no account."
          />
          <ServiceChoice
            value="elevenlabs"
            title="ElevenLabs"
            body="Natural voices from a cloud service. It needs your key."
          />
        </RadioGroup>

        {cloud && connected === false ? (
          <p className="text-muted-foreground text-sm">
            No ElevenLabs key is stored, so this Mac speaks instead.{" "}
            <Link to="/settings" className="text-primary underline">
              Add a key in Settings
            </Link>
            .
          </p>
        ) : null}
      </section>

      {cloud ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Which voice</h2>
          {voices === null ? (
            <Skeleton className="h-24 w-full" />
          ) : voices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No voices came back from ElevenLabs.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {voices.map((voice) => (
                <li key={voice.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-current={voice.id === settings.voiceId || undefined}
                    onClick={() => change({ voiceId: voice.id })}
                    className={`focus-visible:ring-ring min-h-11 flex-1 rounded-xl border px-4 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                      voice.id === settings.voiceId
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    {voice.name}
                  </button>
                  {/* The button stays in every row, so it always reads as
                      part of the voice on its left. */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Hear ${voice.name}`}
                    disabled={!voice.preview_url}
                    // The sample is public, so it needs no key and no speech
                    // call.
                    onClick={() => void play(voice.preview_url!)}
                  >
                    <Play aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="space-y-5">
        <h2 className="text-sm font-semibold">How it sounds</h2>
        {SLIDERS.map((slider) => (
          <div key={slider.key} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor={slider.key}>{slider.label}</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {Number(settings[slider.key]).toFixed(2)}
              </span>
            </div>
            <Slider
              id={slider.key}
              min={slider.min}
              max={slider.max}
              step={0.05}
              value={[Number(settings[slider.key])]}
              aria-label={slider.label}
              onValueChange={([value]) => change({ [slider.key]: value })}
            />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{slider.low}</span>
              <span>{slider.high}</span>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            change({
              speed: DEFAULT_SPEECH.speed,
              stability: DEFAULT_SPEECH.stability,
              similarity: DEFAULT_SPEECH.similarity,
            })
          }
        >
          Back to the usual sound
        </Button>
      </section>
    </Screen>
  );
}

function ServiceChoice({
  value,
  title,
  body,
}: {
  value: VoiceService;
  title: string;
  body: string;
}) {
  return (
    <Label
      htmlFor={value}
      className="hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-xl border p-4"
    >
      <RadioGroupItem id={value} value={value} className="mt-1" />
      <span className="space-y-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block text-sm">{body}</span>
      </span>
    </Label>
  );
}
