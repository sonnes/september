import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Link, useNavigate } from '@tanstack/react-router';

import { Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useAccount } from '@/packages/account';
import {
  AI_PROVIDERS,
  completeOpenRouterAuth,
  isOpenRouterOAuthAvailable,
  startOpenRouterAuth,
} from '@/packages/ai';
import {
  ModeBadge,
  SETUP_MODES,
  buildFreeModeUpdate,
  buildPrivacyModeUpdate,
  inferSetupMode,
  type SetupMode,
} from '@/packages/onboarding';
import { cn, type AIProvider } from '@/packages/shared';
import { Button } from '@/packages/ui/components/button';
import { LoadingState } from '@/packages/ui/components/loading-state';
import { ProviderSpendChip } from '@/packages/usage';

import { Route } from './index';

const MODE_SWITCH_TOAST: Record<SetupMode, string> = {
  privacy: 'Privacy mode — everything now runs on this device.',
  free: 'Free AI mode — connect OpenRouter below to finish.',
  advanced: 'Your own services — connect them below.',
};

// What each key-based provider does for the user, in user vocabulary.
const PROVIDER_PURPOSE: Record<string, string> = {
  elevenlabs: 'Natural voices and voice cloning.',
  gemini: 'Writing help and listening.',
  openrouter: 'Writing help — one connection, many models.',
};

const ADVANCED_PROVIDERS = ['elevenlabs', 'gemini', 'openrouter'] as const;

export default function SetupForm() {
  const { account, updateAccount } = useAccount();
  const navigate = useNavigate();
  const { code: oauthCode } = Route.useSearch();
  const exchangedRef = useRef(false);
  const [switching, setSwitching] = useState(false);
  const oauthAvailable = isOpenRouterOAuthAvailable();

  // Finish "Connect with OpenRouter": on return from the OAuth redirect,
  // exchange the code for a user API key, save it locally, and strip the code
  // from the URL.
  useEffect(() => {
    if (!oauthAvailable || !oauthCode || exchangedRef.current || !account) return;
    exchangedRef.current = true;

    (async () => {
      try {
        const key = await completeOpenRouterAuth(oauthCode);
        await updateAccount({
          ai_providers: { ...account.ai_providers, openrouter: { api_key: key } },
        });
        toast.success('Connected to OpenRouter');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to connect to OpenRouter');
      } finally {
        navigate({ to: '/settings', search: {}, replace: true });
      }
    })();
  }, [oauthAvailable, oauthCode, account, updateAccount, navigate]);

  if (!account) {
    return <LoadingState variant="inline" label="Loading account settings..." />;
  }

  const mode = inferSetupMode(account);

  const selectMode = async (next: SetupMode) => {
    if (switching || next === mode) return;
    setSwitching(true);

    try {
      const update =
        next === 'privacy'
          ? buildPrivacyModeUpdate({
              currentSpeech: account.ai_speech,
              currentSuggestions: account.ai_suggestions,
              currentTranscription: account.ai_transcription,
              currentProviders: account.ai_providers,
            })
          : next === 'free'
            ? buildFreeModeUpdate({
                currentSpeech: account.ai_speech,
                currentSuggestions: account.ai_suggestions,
                currentProviders: account.ai_providers,
              })
            : {};

      await updateAccount({ ...update, setup_mode: next });
      toast.success(MODE_SWITCH_TOAST[next]);
    } catch (error) {
      console.error('Error switching setup mode:', error);
      toast.error('Could not switch modes. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">How September runs</h2>
          <p className="text-sm text-muted-foreground">
            This decides where your words are processed and which services you need.
          </p>
        </div>
        <div className="grid gap-3 @xl:grid-cols-3" role="radiogroup" aria-label="Setup mode">
          {SETUP_MODES.map(option => {
            const selected = option.id === mode;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={switching}
                onClick={() => selectMode(option.id)}
                className={cn(
                  'relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-muted-foreground/40'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-3 right-3 flex size-5 items-center justify-center rounded-full border',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background'
                  )}
                >
                  {selected && <Check className="size-3" />}
                </span>
                <ModeBadge accent={option.accent}>{option.badge}</ModeBadge>
                <span className="text-sm font-semibold text-foreground">{option.title}</span>
                <span className="text-sm leading-snug text-muted-foreground">{option.body}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Connections</h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'privacy'
              ? 'Nothing to connect — everything runs on this device.'
              : mode === 'free'
                ? 'One free connection powers writing help. Voice stays on this device.'
                : 'Connect the services you want to use. Each row tells you its next step.'}
          </p>
        </div>
        {mode === 'privacy' && <PrivacyConnections />}
        {mode === 'free' && <FreeConnections />}
        {mode === 'advanced' && <AdvancedConnections />}
      </section>
    </div>
  );
}

function ConnectionRow({
  name,
  state,
  action,
  spend,
}: {
  name: string;
  state: ReactNode;
  action?: ReactNode;
  /** Optional running cost for this connection, shown beside its action. */
  spend?: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{name}</div>
        <div className="text-sm text-muted-foreground">{state}</div>
      </div>
      {spend}
      {action}
    </div>
  );
}

function ConnectionList({ children }: { children: ReactNode }) {
  return <div className="divide-y border-y">{children}</div>;
}

function KeyTail({ apiKey }: { apiKey: string }) {
  return (
    <>
      <span className="font-medium text-foreground">Connected</span> with a key ending in …
      {apiKey.slice(-4)}.
    </>
  );
}

function PrivacyConnections() {
  const { user } = useAccount();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-950">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Nothing you write or say leaves this device.</span>{' '}
          The models below download once and work offline.
        </p>
      </div>
      <ConnectionList>
        <ConnectionRow
          name="On-device voice"
          state="Downloads once (~90 MB) the first time it speaks. Works offline after."
          spend={<ProviderSpendChip provider="kokoro" userId={user?.id} />}
          action={<span className="text-sm font-medium text-muted-foreground">On this device</span>}
        />
        <ConnectionRow
          name="On-device listening"
          state="Downloads once (~80 MB) when you turn on Listening."
          spend={<ProviderSpendChip provider="whisper" userId={user?.id} />}
          action={<span className="text-sm font-medium text-muted-foreground">On this device</span>}
        />
        <ConnectionRow
          name="On-device writing help"
          state="Downloads once (~880 MB) when you turn on Writing help."
          spend={<ProviderSpendChip provider="webllm" userId={user?.id} />}
          action={<span className="text-sm font-medium text-muted-foreground">On this device</span>}
        />
      </ConnectionList>
    </div>
  );
}

function FreeConnections() {
  const { account, user } = useAccount();
  const openRouterKey = account?.ai_providers?.openrouter?.api_key;
  const oauthAvailable = isOpenRouterOAuthAvailable();

  return (
    <ConnectionList>
      <ConnectionRow
        name="OpenRouter"
        state={
          openRouterKey ? (
            <KeyTail apiKey={openRouterKey} />
          ) : (
            'Powers writing help with free models. No card required.'
          )
        }
        spend={<ProviderSpendChip provider="openrouter" userId={user?.id} />}
        action={
          openRouterKey ? (
            <Button asChild type="button" variant="outline">
              <Link to="/settings/connections/$provider" params={{ provider: 'openrouter' }}>
                Manage ›
              </Link>
            </Button>
          ) : oauthAvailable ? (
            <Button
              type="button"
              onClick={() => startOpenRouterAuth(`${window.location.origin}/settings`)}
            >
              Connect
            </Button>
          ) : (
            <Button asChild type="button">
              <Link to="/settings/connections/$provider" params={{ provider: 'openrouter' }}>
                Add key ›
              </Link>
            </Button>
          )
        }
      />
      <ConnectionRow
        name="Browser voice"
        state="Built into this device. Nothing to set up."
        spend={<ProviderSpendChip provider="browser" userId={user?.id} />}
        action={<span className="text-sm font-medium text-muted-foreground">Ready</span>}
      />
    </ConnectionList>
  );
}

function AdvancedConnections() {
  const { account, user } = useAccount();

  return (
    <ConnectionList>
      {ADVANCED_PROVIDERS.map(id => {
        const apiKey = account?.ai_providers?.[id]?.api_key;
        return (
          <ConnectionRow
            key={id}
            name={AI_PROVIDERS[id as AIProvider].name}
            state={
              apiKey ? (
                <>
                  <KeyTail apiKey={apiKey} /> {PROVIDER_PURPOSE[id]}
                </>
              ) : (
                `Not set up yet. ${PROVIDER_PURPOSE[id]}`
              )
            }
            spend={<ProviderSpendChip provider={id} userId={user?.id} />}
            action={
              <Button asChild type="button" variant={apiKey ? 'outline' : 'default'}>
                <Link to="/settings/connections/$provider" params={{ provider: id }}>
                  {apiKey ? 'Manage ›' : 'Set up ›'}
                </Link>
              </Button>
            }
          />
        );
      })}
    </ConnectionList>
  );
}
