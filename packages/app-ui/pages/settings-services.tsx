import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@september/ui/components/button";
import { platform } from "@platform/adapter";
import { useConnections } from "@september/app-ui/services/connections";
import { CONNECTION_GUIDES, type ConnectionId, sectionFor } from "@september/core/rules/navigation";
import { SERVICE_NAMES, type ServiceId } from "@september/core/rules/services";
import {
  appleState,
  CloudStatus,
  ElevenLabsImpactLink,
  KeyPanel,
  ManageLink,
  Mark,
  Status,
} from "@september/app-ui/blocks/services";
import { Section, SettingsTitle } from "@september/app-ui/blocks/setup-fields";

/**
 * The services, and nothing more.
 *
 * The setup steps ask how September runs. This screen only shows the services
 * that answer gives, so a user comes here to add a key or to change one.
 */
export function SetupSettings() {
  const { connections, checking } = useConnections();

  return (
    <div className="flex flex-col gap-8">
      <SettingsTitle
        title={sectionFor("/settings").title}
        description="The services September uses, and the keys they need."
      />

      <Section
        title="Connect a service"
        description="Each row says what comes next."
      >
        <div className="divide-y border-y">
          <ConnectionRow
            service="apple"
            state={appleState(connections)}
            badge={
              connections.apple.available ? (
                <Status tone="ready" text="Ready" />
              ) : (
                <Status tone="warn" text="Not available" />
              )
            }
            action={
              <span className="text-muted-foreground text-sm font-medium">
                Device support
              </span>
            }
          />
          <ConnectionRow
            service="openrouter"
            state={
              connections.openrouter.connected
                ? `Connected. ${connections.openrouter.detail ?? ""}`
                : "Gives AI Assistance. Free models are available."
            }
            badge={
              <CloudStatus
                checking={checking}
                status={connections.openrouter}
              />
            }
            action={
              <ManageLink
                provider="openrouter"
                status={connections.openrouter}
              />
            }
          />
          <ConnectionRow
            service="elevenlabs"
            state={
              connections.elevenlabs.connected
                ? "Connected. Choose a voice on the Voice screen."
                : "Speaks your messages with a natural voice."
            }
            badge={
              <CloudStatus
                checking={checking}
                status={connections.elevenlabs}
              />
            }
            action={
              <ManageLink
                provider="elevenlabs"
                status={connections.elevenlabs}
              />
            }
          />
        </div>
      </Section>
    </div>
  );
}

function ConnectionRow({
  service,
  state,
  badge,
  action,
}: {
  service: ServiceId;
  state: string;
  badge: ReactNode;
  action: ReactNode;
}) {
  return (
    // On a narrow screen the badge and the action move under the words, so
    // the words keep their width.
    <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-3 py-4">
      <Mark service={service} />
      <div className="min-w-0 flex-1 basis-40">
        <div className="text-sm font-semibold">{SERVICE_NAMES[service]}</div>
        <div className="text-muted-foreground text-sm">{state}</div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {badge}
        {action}
      </div>
    </div>
  );
}

// ----------------------------------------------------------- one connection

export function ConnectionScreen({ provider }: { provider: ConnectionId }) {
  const guide = CONNECTION_GUIDES[provider];

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="lg" className="-ml-4 self-start">
        <Link to="/settings">
          <ArrowLeft aria-hidden="true" />
          All settings
        </Link>
      </Button>

      <SettingsTitle title={guide.name} description={guide.lede} />

      <ol className="flex flex-col gap-2">
        {guide.steps.map((step, index) => (
          <li key={step} className="flex items-baseline gap-3 text-sm">
            <span className="bg-muted text-muted-foreground flex size-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full text-xs font-semibold">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <KeyPanel provider={provider} />

      {provider === "elevenlabs" ? <ElevenLabsImpactLink /> : null}

      <p className="text-muted-foreground text-xs">
        The key stays on this device. September sends it only to {guide.name}.
      </p>

      <div className="flex flex-wrap gap-3 border-t pt-6">
        {provider === "openrouter" ? (
          <Button asChild type="button" className="h-11 px-4">
            <Link to="/settings/writing">Go to AI Assistance</Link>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4"
          onClick={() => void platform.device.openInBrowser(guide.url)}
        >
          Open {guide.name}
          <ExternalLink aria-hidden />
        </Button>
      </div>
    </div>
  );
}
