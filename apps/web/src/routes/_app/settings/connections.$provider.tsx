import { useState } from 'react';

import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

import { ExternalLink, LogIn } from 'lucide-react';
import { toast } from 'sonner';

import { useAccount } from '@/packages/account';
import { AI_PROVIDERS, startOpenRouterAuth } from '@/packages/ai';
import { Button } from '@/packages/ui/components/button';
import { Input } from '@/packages/ui/components/input';
import { Label } from '@/packages/ui/components/label';
import { LoadingState } from '@/packages/ui/components/loading-state';

import { PageTitle } from '@/components/layout';

import { pageTitle } from '@/lib/seo';

type ConnectionProviderId = 'gemini' | 'elevenlabs' | 'openrouter';

interface ConnectionContent {
  lede: string;
  steps: readonly string[];
  keyUrlLabel: string;
}

// Per-provider setup instructions live inside settings (not in external docs),
// written in user vocabulary.
const CONNECTIONS: Record<ConnectionProviderId, ConnectionContent> = {
  gemini: {
    lede: "Google's AI service. In September it powers writing help and listening. The free tier is enough for everyday use — no card needed.",
    steps: [
      'Open Google AI Studio and sign in with any Google account.',
      'Click "Get API key", then "Create API key".',
      'Copy the key and paste it below.',
    ],
    keyUrlLabel: 'Open Google AI Studio',
  },
  elevenlabs: {
    lede: 'Natural, realistic voices — including a clone of your own voice. In September it powers your speaking voice.',
    steps: [
      'Open the ElevenLabs keys page and sign in.',
      'Click "Create API key" and copy it.',
      'Paste the key below.',
    ],
    keyUrlLabel: 'Open ElevenLabs',
  },
  openrouter: {
    lede: 'One connection that powers writing help, with free models available. Connecting takes one click — no key to copy.',
    steps: [],
    keyUrlLabel: 'Open OpenRouter',
  },
};

function isConnectionProvider(value: string): value is ConnectionProviderId {
  return value === 'gemini' || value === 'elevenlabs' || value === 'openrouter';
}

export const Route = createFileRoute('/_app/settings/connections/$provider')({
  beforeLoad: ({ params }) => {
    if (!isConnectionProvider(params.provider)) {
      throw redirect({ to: '/settings', replace: true });
    }
  },
  head: ({ params }) => ({
    meta: [
      {
        title: pageTitle(
          isConnectionProvider(params.provider) ? AI_PROVIDERS[params.provider].name : 'Connections'
        ),
      },
    ],
  }),
  component: ConnectionDetailPage,
});

function ConnectionDetailPage() {
  const { provider } = Route.useParams();
  const providerId = provider as ConnectionProviderId;
  const { account, updateAccount } = useAccount();
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!account) {
    return <LoadingState variant="inline" label="Loading account settings..." />;
  }

  const info = AI_PROVIDERS[providerId];
  const content = CONNECTIONS[providerId];
  const existingKey = account.ai_providers?.[providerId]?.api_key;

  const saveKey = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setIsSaving(true);

    try {
      await updateAccount({
        ai_providers: { ...account.ai_providers, [providerId]: { api_key: trimmed } },
      });
      toast.success(`${info.name} connected`);
      navigate({ to: '/settings' });
    } catch (error) {
      console.error('Error saving provider key:', error);
      toast.error('Could not save the key. Please try again.');
      setIsSaving(false);
    }
  };

  const removeKey = async () => {
    setIsSaving(true);

    try {
      await updateAccount({
        ai_providers: { ...account.ai_providers, [providerId]: {} },
      });
      toast.success(`${info.name} disconnected`);
      navigate({ to: '/settings' });
    } catch (error) {
      console.error('Error removing provider key:', error);
      toast.error('Could not disconnect. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-muted-foreground">
        <Link to="/settings" className="hover:text-foreground">
          ‹ Setup
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="font-medium text-foreground">{info.name}</span>
      </nav>

      <PageTitle title={info.name} description={content.lede} />

      {existingKey && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Connected</span> with a key ending in …
          {existingKey.slice(-4)}. Saving a new key replaces it.
        </p>
      )}

      {providerId === 'openrouter' && (
        <div className="flex flex-col items-start gap-3">
          <Button
            type="button"
            size="lg"
            onClick={() => startOpenRouterAuth(`${window.location.origin}/settings`)}
          >
            <LogIn className="size-4" />
            {existingKey ? 'Reconnect OpenRouter' : 'Connect OpenRouter'}
          </Button>
          <p className="text-sm text-muted-foreground">
            You will be sent to OpenRouter to approve, then brought back here. Or paste a key
            manually below.
          </p>
        </div>
      )}

      {content.steps.length > 0 && (
        <ol className="flex flex-col gap-2">
          {content.steps.map((step, index) => (
            <li key={step} className="flex items-baseline gap-3 text-sm text-foreground">
              <span className="flex size-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}

      <div className="flex max-w-md flex-col gap-2">
        <Label htmlFor="connection-key">API key</Label>
        <Input
          id="connection-key"
          type="password"
          autoComplete="off"
          placeholder="Paste your key here"
          value={key}
          onChange={event => setKey(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Stored only on this device. Never sent anywhere except to {info.name}.
        </p>
      </div>

      <div className="flex items-center gap-3 border-t pt-6">
        {info.api_key_url && (
          <Button asChild type="button" variant="outline" size="lg">
            <a href={info.api_key_url} target="_blank" rel="noreferrer">
              {content.keyUrlLabel}
              <ExternalLink className="size-4" />
            </a>
          </Button>
        )}
        <div className="flex-1" />
        {existingKey && (
          <Button type="button" variant="outline" size="lg" disabled={isSaving} onClick={removeKey}>
            Disconnect
          </Button>
        )}
        <Button type="button" size="lg" disabled={!key.trim() || isSaving} onClick={saveKey}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
