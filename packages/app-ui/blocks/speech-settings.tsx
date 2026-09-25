import { useEffect, useState } from "react";

import { Volume2 } from "lucide-react";

import { Button } from "@september/ui/components/button";
import { Label } from "@september/ui/components/label";
import { Slider } from "@september/ui/components/slider";

import { PickList } from "@september/app-ui/blocks/pick-list";
import { readConnections, saveSpeech } from "@platform/services/os";
import {
  DEFAULT_SPEECH,
  speak,
  speechSettings,
  type SpeechSettings as Speech,
} from "@platform/services/speech";
import {
  EXPRESSIONS,
  expressionOf,
  expressionSound,
  hasSimilarity,
  stabilityFor,
  V3_STABILITY,
  VOICE_MODELS,
} from "@september/core/rules/voice";

const TRY_IT = "This is how I sound today.";

const SPEED = { min: 0.7, max: 1.2 } as const;

/**
 * The sound of the voice, in the card of the right rail.
 *
 * The sound is heard in the next sentence, so it belongs beside the
 * conversation: a voice that reads too fast is heard while talking, and a user
 * who must leave the space to mend it loses the words they were writing.
 * Every change is kept as it is made, so there is no Save button to forget.
 *
 * Speed comes first, because every voice has it. An ElevenLabs voice then
 * shows its model, and three presets and Custom. A preset sets the stability
 * and the similarity, and keeps the model. Custom shows each of them. The
 * service and the list of voices live on `/voice`, which has the room.
 */
export function SpeechSettings() {
  const [settings, setSettings] = useState<Speech>(speechSettings);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [custom, setCustom] = useState(
    () => expressionOf(speechSettings()) === "custom",
  );

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

  const cloud = settings.provider === "elevenlabs" && connected === true;
  const preset = custom ? "custom" : expressionOf(settings);

  return (
    <div className="space-y-5 p-4">
      <p className="text-muted-foreground text-xs">
        How your voice sounds in every space. A change is kept as you make it.
      </p>

      <Range
        id="speed"
        label="Speed"
        low="Slower"
        high="Faster"
        min={SPEED.min}
        max={SPEED.max}
        value={settings.speed}
        onChange={(speed) => change({ speed })}
      />

      {cloud ? (
        <Group title="Voice model">
          <PickList
            rows={VOICE_MODELS.map((model) => ({ ...model }))}
            columns={1}
            value={settings.modelId}
            onPick={(modelId) =>
              change({
                modelId,
                ...(preset === "custom"
                  ? { stability: stabilityFor(modelId, settings.stability) }
                  : expressionSound(preset, modelId)),
              })
            }
            label="Search models"
          />
        </Group>
      ) : null}

      {cloud ? (
        <Group title="Expression">
          <div className="flex flex-wrap gap-2">
            {EXPRESSIONS.map(({ key, label }) => (
              <Chip
                key={key}
                on={preset === key}
                onClick={() => {
                  setCustom(false);
                  change(expressionSound(key, settings.modelId));
                }}
              >
                {label}
              </Chip>
            ))}
            <Chip on={preset === "custom"} onClick={() => setCustom(true)}>
              Custom
            </Chip>
          </div>

          {preset === "custom" ? (
            <CustomSound settings={settings} change={change} />
          ) : null}
        </Group>
      ) : null}

      {/* The change is heard here, so the user never sends a message to find
          out what it did. */}
      <Button
        type="button"
        className="h-11 w-full"
        onClick={() => void speak(TRY_IT)}
      >
        <Volume2 aria-hidden />
        Hear it
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={() => {
          setCustom(false);
          change({
            modelId: DEFAULT_SPEECH.modelId,
            ...expressionSound("natural"),
            speed: DEFAULT_SPEECH.speed,
          });
        }}
      >
        Reset to default sound
      </Button>
    </div>
  );
}

/**
 * The stability and the similarity. Eleven v3 has no similarity setting and takes
 * three stability modes, so it shows three choices in place of two sliders.
 */
function CustomSound({
  settings,
  change,
}: {
  settings: Speech;
  change: (next: Partial<Speech>) => void;
}) {
  const v3 = !hasSimilarity(settings.modelId);

  return (
    <div className="space-y-4 pt-1">
      {v3 ? (
        <div className="space-y-2">
          <span className="text-sm font-medium">Steadiness</span>
          <div className="flex flex-wrap gap-2">
            {V3_STABILITY.map(({ label, value }) => (
              <Chip
                key={label}
                on={settings.stability === value}
                onClick={() => change({ stability: value })}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>
      ) : (
        <>
          <Range
            id="stability"
            label="Steadiness"
            low="Expressive"
            high="Consistent"
            min={0}
            max={1}
            value={settings.stability}
            onChange={(stability) => change({ stability })}
          />
          <Range
            id="similarity"
            label="Likeness"
            low="Natural"
            high="Exact"
            min={0}
            max={1}
            value={settings.similarity}
            onChange={(similarity) => change({ similarity })}
          />
        </>
      )}
    </div>
  );
}

/** One slider with its words at both ends. */
function Range({
  id,
  label,
  low,
  high,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  label: string;
  low: string;
  high: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={`panel-${id}`}>{label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">
          {Number(value).toFixed(2)}
        </span>
      </div>
      <Slider
        id={`panel-${id}`}
        min={min}
        max={max}
        step={0.05}
        value={[Number(value)]}
        aria-label={label}
        onValueChange={([next]) => onChange(next)}
      />
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

/** A choice that stays pressed while it is in use. */
function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={on ? "default" : "outline"}
      aria-pressed={on}
      onClick={onClick}
      className="h-11 rounded-full px-4"
    >
      {children}
    </Button>
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
