import { useEffect, useState } from "react";

import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";

import { PickList } from "@/blocks/pick-list";
import {
  listModels,
  readConnections,
  saveSpeech,
  type Model,
} from "@/services/os";
import {
  DEFAULT_SPEECH,
  speak,
  speechSettings,
  type SpeechSettings as Speech,
} from "@/services/speech";

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
  key: keyof Speech;
  label: string;
  low: string;
  high: string;
  min: number;
  max: number;
}[];

/**
 * The model and the sound, in the card of the right rail.
 *
 * These two are heard in the next sentence, so they belong beside the
 * conversation: a voice that reads too fast is heard while talking, and a
 * user who must leave the space to mend it loses the words they were writing.
 * Every change is kept as it is made, so there is no Save button to forget.
 *
 * The service and the list of voices are not here. A service is chosen once,
 * and an account holds a hundred voices, each one to be heard before it is
 * taken. Both live on `/voice`, which has the room.
 *
 * The model repeats the choice on the key screen. A message sounds like the
 * model as much as the voice, and the card is where the sound is judged.
 */
export function SpeechSettings() {
  const [settings, setSettings] = useState<Speech>(speechSettings);
  const [models, setModels] = useState<Model[] | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  const change = (next: Partial<Speech>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    void saveSpeech(merged);
  };

  useEffect(() => {
    void readConnections()
      .then((connections) => setConnected(connections.elevenlabs.connected))
      .catch(() => setConnected(false));
  }, []);

  const cloud = settings.provider === "elevenlabs";

  useEffect(() => {
    if (!cloud || !connected) return;

    void listModels()
      .then(setModels)
      .catch(() => setModels([]));
  }, [cloud, connected]);

  const chosenModel = models?.find((model) => model.id === settings.modelId);

  return (
    <div className="space-y-5 p-4">
      <p className="text-muted-foreground text-xs">
        The sound of every space. A change is kept as you make it.
      </p>

      {cloud && connected ? (
        <Group title="Which model">
          {models === null ? (
            <Skeleton className="h-24 w-full" />
          ) : models.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No models came back from ElevenLabs.
            </p>
          ) : (
            <>
              <PickList
                rows={models}
                columns={1}
                value={settings.modelId}
                onPick={(modelId) => change({ modelId })}
                label="Search models"
              />
              {/* A model name says little. The service supplies the sentence
                  that tells a user what the choice costs and gives. */}
              {chosenModel?.description ? (
                <p className="text-muted-foreground text-xs">
                  {chosenModel.description}
                </p>
              ) : null}
            </>
          )}
        </Group>
      ) : null}

      <Group title="How it sounds">
        {SLIDERS.map((slider) => (
          <div key={slider.key} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor={`panel-${slider.key}`}>{slider.label}</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {Number(settings[slider.key]).toFixed(2)}
              </span>
            </div>
            <Slider
              id={`panel-${slider.key}`}
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
          className="h-11 w-full"
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
      </Group>

      {/* The change is heard here, so the user never sends a message to find
          out what it did. */}
      <Button
        type="button"
        className="h-11 w-full"
        onClick={() => void speak(TRY_IT)}
      >
        <Volume2 aria-hidden />
        Try it
      </Button>
    </div>
  );
}

/** One titled part of the card. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
