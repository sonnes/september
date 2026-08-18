import { type ChangeEvent, useRef, useState } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { PageTitle } from '@/components/layout';

import { pageTitle } from '@/lib/seo';
import {
  type AccountSettingsImportMode,
  type AccountUpdate,
  parseAccountSettingsExport,
  resolveAccountSettingsImport,
  serializeAccountSettingsExport,
  useAccount,
} from '@/packages/account';
import { saveFile } from '@/packages/shared/lib/data';
import { SpeechProvider } from '@/packages/speech';
import { GoogleSyncControl, SYNC_ENABLED } from '@/packages/sync';
import { Button } from '@/packages/ui/components/button';
import { Callout } from '@/packages/ui/components/callout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/packages/ui/components/dialog';

import SettingsForm from './-settings-form';

export const Route = createFileRoute('/_app/settings/account')({
  head: () => ({
    meta: [
      { title: pageTitle('Account') },
      { name: 'description', content: 'Manage your September account and preferences.' },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Account"
        description="Your personal information and preferences."
        actions={<SettingsTransferActions />}
      />
      <Callout tone="warning" title="Settings export includes API keys">
        Keep exported JSON private. Import replaces current account, provider, suggestion,
        transcription, and speech settings.
      </Callout>
      {SYNC_ENABLED && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Cloud sync</h2>
          <p className="text-muted-foreground text-sm">
            Sign in to back up and sync your spaces, phrases, and notes across devices.
          </p>
          <GoogleSyncControl />
        </div>
      )}
      <SpeechProvider>
        <SettingsForm />
      </SpeechProvider>
    </div>
  );
}

export function SettingsTransferActions() {
  const { account, updateAccount } = useAccount();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<AccountUpdate | null>(null);

  const exportSettings = async () => {
    if (!account) return;

    try {
      const saved = await saveFile(
        new Blob([serializeAccountSettingsExport(account)], { type: 'application/json' }),
        `september-settings-${new Date().toISOString().slice(0, 10)}.json`
      );
      if (saved) toast.success('Settings exported');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export settings.');
    }
  };

  const importSettings = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) return;

    setIsImporting(true);

    try {
      setPendingImport(parseAccountSettingsExport(await file.text()));
    } catch (error) {
      console.error('Error importing settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import settings.');
    } finally {
      setIsImporting(false);
    }
  };

  const applyImport = async (mode: AccountSettingsImportMode) => {
    if (!account || !pendingImport) return;

    setIsImporting(true);

    try {
      await updateAccount(
        resolveAccountSettingsImport({
          current: account,
          imported: pendingImport,
          mode,
        })
      );
      setPendingImport(null);
      toast.success(mode === 'merge' ? 'Settings merged' : 'Settings overwritten');
    } catch (error) {
      console.error('Error importing settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import settings.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Button type="button" size="lg" disabled={!account} onClick={exportSettings}>
        <Download className="size-4" />
        Export JSON
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={!account || isImporting}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" />
        {isImporting ? 'Importing...' : 'Import JSON'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Import settings JSON"
        onChange={importSettings}
      />
      <Dialog open={pendingImport !== null} onOpenChange={open => !open && setPendingImport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import settings</DialogTitle>
            <DialogDescription>
              Merge keeps current settings that are not in the file. Overwrite replaces current
              account, provider, suggestion, transcription, and speech settings with the file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isImporting}
              onClick={() => setPendingImport(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={isImporting}
              onClick={() => applyImport('merge')}
            >
              Merge
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={isImporting}
              onClick={() => applyImport('overwrite')}
            >
              Overwrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
