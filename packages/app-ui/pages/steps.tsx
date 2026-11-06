import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Button } from "@september/ui/components/button";
import { Input } from "@september/ui/components/input";
import { RadioGroup } from "@september/ui/components/radio-group";

import { useDraft } from "@september/app-ui/blocks/onboarding-draft";
import { AccessForm } from "@september/app-ui/blocks/access-form";
import { PickList } from "@september/app-ui/blocks/pick-list";
import { Section, SpeakingStyle } from "@september/app-ui/blocks/setup-fields";
import {
  CloudStatus,
  ElevenLabsImpactLink,
  KeyPanel,
  ServiceChoice,
  Status,
} from "@september/app-ui/blocks/services";
import { INPUT_METHODS } from "@september/core/rules/access";
import { withProvider } from "@september/core/rules/model-config";
import {
  defaultServices,
  nextStep,
  previousStep,
  SPEAKING_STYLES,
  stepFor,
  voiceServices,
  WRITING_SERVICES,
  type StepPath,
} from "@september/core/rules/onboarding";
import { shownVoices, voiceRows } from "@september/core/rules/voice";
import { documentTitle } from "@september/core/rules/titles";
import { platform } from "@platform/adapter";
import { APP_NAV } from "@september/app-ui/navigation";
import { useConnections, useVoices } from "@september/app-ui/services/connections";
import { play } from "@september/app-ui/services/player";
import { saveSetup } from "@september/app-ui/services/settings";
import { updateSpeech } from "@september/app-ui/services/speech";

// DESIGN.md asks for a 44px target on primary actions; `lg` is 40px.
// Below `sm` it takes the whole row, which is the widest target available.
const ACTION = "h-11 w-full px-6 font-semibold sm:w-auto";

function Step({
  path,
  children,
  footer,
}: {
  path: StepPath;
  children: ReactNode;
  footer: ReactNode;
}) {
  const navigate = useNavigate();
  const step = stepFor(path);
  const back = previousStep(path);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6">
      {/* The step indicator's short label, not the heading, which is a
          sentence and does not fit a tab. */}
      <title>{documentTitle(step.label, "Setup")}</title>
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl leading-tight font-bold md:text-3xl lg:text-4xl">
            {step.title}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {step.subtitle}
          </p>
        </div>
        {back && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            title="Go back"
            onClick={() => navigate({ to: back })}
            aria-label="Go back"
            className="h-11 shrink-0 px-3 sm:px-4"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Back</span>
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>

      <div className="flex shrink-0 flex-col gap-4 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
        <p className="text-xs text-muted-foreground">{step.helper}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {footer}
        </div>
      </div>
    </div>
  );
}

export function WelcomeStep() {
  const navigate = useNavigate();

  return (
    <Step
      path="/welcome"
      footer={
        <Button
          type="button"
          size="lg"
          className={ACTION}
          onClick={() => navigate({ to: nextStep("/welcome")! })}
        >
          {stepFor("/welcome").action}
        </Button>
      }
    >
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed md:text-base">
        <h3 className="text-xl font-semibold">Terms &amp; privacy</h3>
        <ul className="list-disc space-y-3 pl-5">
          <li><strong>Your words stay yours.</strong> Data stays on your device unless you use cloud features. Keep backups.</li>
          <li><strong>You choose cloud services.</strong> They receive relevant text or recordings and may charge you. Website hosting and analytics process visit information.</li>
          <li><strong>Free and open source.</strong> A personal project in India, under the MIT License, with no warranty or guaranteed support. Your legal rights remain.</li>
          <li><strong>Keep another way to communicate urgent needs.</strong> September can fail.</li>
        </ul>
        <p>Continuing does not give consent to optional data processing.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" className="min-h-11"
            onClick={() => void platform.device.openInBrowser("https://september.to/terms-of-service")}>
            Terms of Service
          </Button>
          <Button type="button" variant="outline" className="min-h-11"
            onClick={() => void platform.device.openInBrowser("https://september.to/privacy-policy")}>
            Privacy Policy
          </Button>
        </div>
      </div>
    </Step>
  );
}

/**
 * How the person chooses things. It comes first after Welcome, so a person
 * who uses a switch or their eyes meets a screen that fits them from here on.
 * The answers apply when the person continues, so an arrow key that passes
 * Switch does not start the scan.
 */
export function ChooseStep() {
  const navigate = useNavigate();
  const { draft, setDraft } = useDraft();
  const [access, setAccess] = useState(draft.access);

  return (
    <Step
      path="/choose"
      footer={
        <Button
          type="button"
          size="lg"
          className={ACTION}
          onClick={() => {
            const next = { ...draft, access };
            setDraft(() => next);
            navigate({ to: nextStep("/choose")! });
          }}
        >
          {stepFor("/choose").action}
        </Button>
      }
    >
      <AccessForm value={access} onChange={setAccess} />
    </Step>
  );
}

export function ProfileStep() {
  const navigate = useNavigate();
  const { draft, setDraft } = useDraft();
  const [name, setName] = useState(draft.name);
  const [speakingStyle, setSpeakingStyle] = useState(draft.speakingStyle);
  const nameId = useId();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setDraft((current) => ({
      ...current,
      name: name.trim(),
      speakingStyle,
    }));
    navigate({ to: nextStep("/profile")! });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <Step
        path="/profile"
        footer={
          <Button
            type="submit"
            size="lg"
            className={ACTION}
            disabled={!name.trim()}
          >
            {stepFor("/profile").action}
          </Button>
        }
      >
        <div className="space-y-8">
          <Section
            title="Name"
            description="Used in September's profile on this device."
            htmlFor={nameId}
          >
            <Input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
              className="h-11 max-w-md"
            />
          </Section>

          <SpeakingStyle
            value={speakingStyle}
            onChange={setSpeakingStyle}
            description="Choose a style, or write a brief note about how you speak."
          />
        </div>
      </Step>
    </form>
  );
}

export function FinishStep() {
  const { draft } = useDraft();
  const navigate = useNavigate();
  const style = SPEAKING_STYLES.find(
    (option) => option.value === draft.speakingStyle,
  );

  return (
    <Step
      path="/finish"
      footer={
        <Button
          type="button"
          size="lg"
          className={ACTION}
          onClick={() => {
            saveSetup(draft).then(() => navigate({ to: APP_NAV[0].path }));
          }}
        >
          {stepFor("/finish").action}
        </Button>
      }
    >
      <div className="grid gap-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:grid-cols-[auto_1fr] sm:p-8">
        <span
          aria-hidden="true"
          className="grid size-11 place-items-center rounded-full bg-indigo-600 text-xl text-white sm:size-13 sm:text-2xl"
        >
          ✓
        </span>
        <div>
          <p className="text-xs font-bold text-indigo-600">Your setup</p>
          <dl className="mt-5 grid gap-3">
            <SummaryRow label="Name" value={draft.name} />
            <SummaryRow
              label="How you choose"
              value={
                INPUT_METHODS.find((one) => one.value === draft.access.input)?.label ?? ""
              }
            />
            <SummaryRow
              label="Speaking style"
              value={style?.label ?? "Custom"}
            />
            <SummaryRow label="Services" value="Change anytime in Settings" />
          </dl>
        </div>
      </div>
    </Step>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

export function ConnectStep() {
  const navigate = useNavigate();
  const { draft, setDraft } = useDraft();
  const { connections, checking } = useConnections();
  const appleAvailable = connections.apple.available;
  const openrouterConnected = connections.openrouter.connected;
  const elevenlabsConnected = connections.elevenlabs.connected;
  const voices = useVoices(elevenlabsConnected);
  const voiceList = elevenlabsConnected ? (voices.data ?? []) : [];
  const [picked, setPicked] = useState("");
  const voiceId = voiceList.some((voice) => voice.id === picked)
    ? picked
    : (voiceRows(shownVoices(voiceList, ""), [])[0]?.id ?? "");
  const [problem, setProblem] = useState("");
  const voiceOptions = voiceServices(platform.voice.systemDescription);

  // The step answers itself, so a supported Mac needs no action.
  useEffect(() => {
    if (checking) return;
    setDraft((current) =>
      defaultServices(current, { appleAvailable, openrouterConnected, elevenlabsConnected }),
    );
  }, [checking, appleAvailable, openrouterConnected, elevenlabsConnected, setDraft]);

  function submit() {
    setProblem("");
    // `/voice` owns the voice, in the `speech` setting. Setup seeds it, so the
    // voice chosen here is the voice that speaks the first message.
    updateSpeech({
      provider: draft.voiceService,
      voiceId: draft.voiceService === "elevenlabs" ? voiceId || null : null,
    }).then(
      () => navigate({ to: nextStep("/connect")! }),
      (reason: unknown) =>
        setProblem(reason instanceof Error ? reason.message : String(reason)),
    );
  }

  function hear(url: string) {
    setProblem("");
    play(url).catch((reason: unknown) =>
      setProblem(reason instanceof Error ? reason.message : String(reason)),
    );
  }

  return (
    <Step
      path="/connect"
      footer={
        <Button type="button" size="lg" className={ACTION} onClick={submit}>
          {stepFor("/connect").action}
        </Button>
      }
    >
      <div className="space-y-8">
        {problem ? (
          <p role="alert" className="text-destructive text-sm">
            {problem}
          </p>
        ) : null}
        <Section
          title="AI Assistance"
          description="September suggests words and finishes sentences while you type."
        >
          <RadioGroup
            aria-label="AI Assistance"
            className="gap-3"
            value={draft.defaultModel.service}
            onValueChange={(value) => {
              const service = WRITING_SERVICES.find((option) => option.value === value)?.value;
              if (service) setDraft((current) => ({ ...current, ...withProvider(current, service) }));
            }}
          >
            {WRITING_SERVICES.filter(
              // A Mac that cannot run it never shows a control it must disable.
              (option) => option.value !== "apple" || connections.apple.supported,
            ).map((option) => (
              <ServiceChoice
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                selected={draft.defaultModel.service === option.value}
                disabled={option.value === "apple" && !appleAvailable}
                badge={
                  option.value === "apple" ? (
                    <Status
                      tone={appleAvailable ? "ready" : "warn"}
                      text={appleAvailable ? "Ready" : "Turn it on in System Settings"}
                    />
                  ) : option.value === "openrouter" ? (
                    <CloudStatus checking={checking} status={connections.openrouter} />
                  ) : null
                }
              >
                {option.value === "apple" && !appleAvailable && connections.apple.reason ? (
                  <p className="text-foreground text-xs leading-relaxed">
                    {connections.apple.reason}
                  </p>
                ) : null}
                {option.value === "openrouter" ? (
                  <KeyPanel provider="openrouter" name="OpenRouter" />
                ) : null}
              </ServiceChoice>
            ))}
          </RadioGroup>
        </Section>

        <Section title="Voice" description="The voice that speaks your messages out loud.">
          <RadioGroup
            aria-label="Voice"
            className="gap-3"
            value={draft.voiceService}
            onValueChange={(value) => {
              const voiceService = voiceOptions.find((option) => option.value === value)?.value;
              if (voiceService) setDraft((current) => ({ ...current, voiceService }));
            }}
          >
            {voiceOptions.map((option) => (
              <ServiceChoice
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                selected={draft.voiceService === option.value}
                badge={
                  option.value === "system" ? (
                    <Status tone="ready" text="Ready" />
                  ) : (
                    <CloudStatus checking={checking} status={connections.elevenlabs} />
                  )
                }
              >
                {option.value === "elevenlabs" ? (
                  <>
                    <KeyPanel provider="elevenlabs" name="ElevenLabs" />
                    <ElevenLabsImpactLink />
                    {voices.error ? (
                      <p role="alert" className="text-destructive text-sm">
                        {voices.error.message}
                      </p>
                    ) : null}
                    {voiceList.length > 0 ? (
                      <PickList
                        rows={voiceRows(voiceList, [])}
                        filter={(rows, query) => {
                          const shown = shownVoices(voiceList, query, voiceId);
                          return rows.filter((row) => shown.includes(row.voice));
                        }}
                        value={voiceId}
                        onPick={setPicked}
                        label="Search voices"
                        name="Voice"
                        columns={1}
                        fixedHeight
                        after={(row) =>
                          row.voice.preview_url ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 px-4"
                              aria-label={`Hear ${row.name}`}
                              onClick={() => hear(row.voice.preview_url!)}
                            >
                              ▶ Hear it
                            </Button>
                          ) : null
                        }
                      />
                    ) : null}
                  </>
                ) : null}
              </ServiceChoice>
            ))}
          </RadioGroup>
        </Section>
      </div>
    </Step>
  );
}
