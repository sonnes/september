import { Label } from "@september/ui/components/label";
import { RadioGroup } from "@september/ui/components/radio-group";
import { Switch } from "@september/ui/components/switch";
import { DEFAULT_ANSWERS, type SetupAnswers } from "@september/core/rules/onboarding";
import { useConnections } from "@september/app-ui/services/connections";
import { useSetup } from "@september/app-ui/services/settings";
import { AGENT_MODELS, type CuratedModel, modelChoices, SUGGESTIONS_MODELS, withProvider } from "@september/core/rules/model-config";
import { PickList } from "@september/app-ui/blocks/pick-list";
import { appleState, ManageLink, offeredWritingServices, ServiceChoice, writingServiceOf } from "@september/app-ui/blocks/services";
import { SaveFailed, Section, SettingsTitle, SpeakingStyle, useSetupAnswers } from "@september/app-ui/blocks/setup-fields";
import { sectionFor } from "@september/core/rules/navigation";

type WritingServiceId = SetupAnswers["defaultModel"]["service"];
type SwitchField = "autoSuggestions" | "autoPhrases" | "agentEnabled";

/**
 * One saved switch of the setup.
 *
 * The switch shows the saved value, not the value it asked for, so a failed
 * write never leaves a switch that says one thing and does another. The whole
 * row is the label, so it gives a 44px target around the small switch.
 */
function SetupSwitch({
  field,
  asked,
  onChange,
  label,
  description,
}: {
  field: SwitchField;
  /** The value of the last change, which the store can still be writing. */
  asked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  const saved = (useSetup() ?? DEFAULT_ANSWERS)[field] !== false;
  const id = `setting-${field}`;

  return (
    <div className="flex min-h-12 items-center justify-between gap-4 rounded-xl border px-4 py-3">
      <Label htmlFor={id} className="flex flex-1 cursor-pointer flex-col items-start gap-1">
        <span className="text-sm font-medium">{label}</span>
        <span
          id={`${id}-description`}
          className="text-muted-foreground text-xs leading-relaxed font-normal"
        >
          {description}
        </span>
      </Label>
      <Switch
        id={id}
        checked={saved}
        aria-describedby={`${id}-description`}
        onCheckedChange={() => onChange(!asked)}
      />
    </div>
  );
}

/** A curated model list, with Automatic first. An empty id is Automatic. */
function ModelList({
  models,
  value,
  onPick,
}: {
  models: readonly CuratedModel[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Model</span>
      <PickList
        rows={modelChoices(models, value)}
        value={value}
        onPick={onPick}
        label="Search models"
        name="Model"
        fixedHeight
      />
    </div>
  );
}

/** Apple Intelligence has one model, so there is nothing to choose. */
function AppleModel() {
  return (
    <p className="text-muted-foreground text-sm">
      Apple Intelligence runs on this Mac with one model.
    </p>
  );
}

/**
 * The provider first, then one section for each feature.
 *
 * `defaultModel` holds the provider and the model of the agent and phrases.
 * `suggestionsModel` holds the model of suggestions. A provider change moves
 * both, so a feature can never point at a provider the user left.
 */
export function WritingSettings() {
  const { setup, change, failed, retry } = useSetupAnswers();
  const { connections } = useConnections();
  const provider = setup.defaultModel.service;

  const ready: Record<WritingServiceId, boolean> = {
    apple: connections.apple.available,
    openrouter: connections.openrouter.connected,
    none: true,
  };

  const chooseProvider = (value: string) => {
    const service = writingServiceOf(value);
    if (!service || !ready[service] || service === provider) return;
    change(withProvider(setup, service));
  };

  const suggestionsValue = (setup.suggestionsModel ?? setup.defaultModel).model;

  return (
    <div className="flex flex-col gap-8">
      <SettingsTitle
        title={sectionFor("/settings/writing").title}
        description="September finishes your sentences while you type."
      />
      {failed ? <SaveFailed retry={retry} /> : null}

      <Section
        title="Provider"
        description="Every feature below uses this provider."
      >
        <RadioGroup
          aria-label="Provider"
          className="gap-3"
          value={provider}
          onValueChange={chooseProvider}
        >
          {offeredWritingServices(connections).map((option) => (
            <ServiceChoice
              key={option.value}
              value={option.value}
              label={option.label}
              description={
                ready[option.value]
                  ? option.description
                  : option.value === "apple"
                    ? appleState(connections)
                    : "Not connected yet."
              }
              selected={provider === option.value}
              unready={!ready[option.value]}
            >
              {option.value === "openrouter" ? (
                <ManageLink provider="openrouter" status={connections.openrouter} />
              ) : null}
            </ServiceChoice>
          ))}
        </RadioGroup>
      </Section>

      {provider === "none" ? (
        <p className="text-muted-foreground text-sm">
          Choose a provider to turn on suggestions, phrases, and the agent.
        </p>
      ) : (
        <>
          <Section
            title="Suggestions"
            description="Words as you type, after a space or punctuation."
          >
            <SetupSwitch
              field="autoSuggestions"
              asked={setup.autoSuggestions !== false}
              onChange={(autoSuggestions) => change({ autoSuggestions })}
              label="Suggest as I type"
              description="Off waits for a press of Suggest."
            />
            {provider === "openrouter" ? (
              <ModelList
                models={SUGGESTIONS_MODELS}
                value={suggestionsValue}
                onPick={(model) =>
                  change({ suggestionsModel: { service: provider, model } })
                }
              />
            ) : (
              <AppleModel />
            )}
          </Section>

          <Section
            title="Agent and phrases"
            description="One model writes phrases and runs the agent."
          >
            <SetupSwitch
              field="autoPhrases"
              asked={setup.autoPhrases !== false}
              onChange={(autoPhrases) => change({ autoPhrases })}
              label="Phrases"
              description="Phrases and starters for each space, made in the background."
            />
            <SetupSwitch
              field="agentEnabled"
              asked={setup.agentEnabled !== false}
              onChange={(agentEnabled) => change({ agentEnabled })}
              label="Agent"
              description="Changes a space when you ask. Off hides Agent in every space."
            />
            {provider === "openrouter" ? (
              <ModelList
                models={AGENT_MODELS}
                value={setup.defaultModel.model}
                onPick={(model) =>
                  change({ defaultModel: { service: provider, model } })
                }
              />
            ) : (
              <AppleModel />
            )}
          </Section>

          <SpeakingStyle
            value={setup.speakingStyle}
            onChange={(speakingStyle) => change({ speakingStyle })}
          />
        </>
      )}
    </div>
  );
}
