import { type ChangeEvent, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@september/ui/components/alert-dialog";
import { Button } from "@september/ui/components/button";
import { downloadBackup, importBackup } from "@september/app-ui/services/backup";
import { backupProblem, type BackupSummary, backupSummary, parseBackup, type SeptemberBackup } from "@september/core/rules/backup";
import { Section, SettingsTitle } from "@september/app-ui/blocks/setup-fields";

function BackupPreview({
  fileName,
  summary,
  skipped,
}: {
  fileName: string;
  summary: BackupSummary;
  skipped: number;
}) {
  const source = summary.source === "desktop" ? "Desktop app" : "Web app";
  const counts = [
    ["Spaces", summary.spaces],
    ["Messages", summary.messages],
    ["Agent messages", summary.agentMessages],
    ["Notes", summary.notes],
    ["Saved phrases", summary.savedPhrases],
    ["Usage events", summary.usageEvents],
  ] as const;

  return (
    <div className="rounded-surface border p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold break-all">{fileName}</p>
        <p className="text-muted-foreground text-sm">
          {source} · {new Date(summary.exportedAt).toLocaleString()}
        </p>
      </div>
      {skipped > 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          {skipped === 1
            ? "One entry has an error. September will leave it out."
            : `${skipped} entries have errors. September will leave them out.`}
        </p>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {counts.map(([label, count]) => (
          <div key={label} className="bg-muted rounded-control p-3">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-1 text-base font-semibold">{count}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Download or restore one portable, validated September backup. */
export function DataSettings() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SeptemberBackup | null>(null);
  const [fileName, setFileName] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const busy = reading || exporting || importing;

  const chooseBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || busy) return;

    setReading(true);
    setProgress(["Reading backup file."]);
    setProblem(null);
    setSelected(null);
    setSkipped(0);
    try {
      const source = await file.text();
      setProgress((lines) => [...lines, "Checking backup contents."]);
      const { backup, skipped: withErrors } = parseBackup(source);
      setFileName(file.name);
      setSelected(backup);
      setSkipped(withErrors);
      setProgress((lines) => [
        ...lines,
        withErrors > 0
          ? `Backup checked. ${withErrors} entries will be skipped. Review the counts before import.`
          : "Backup checked. Review the counts before import.",
      ]);
    } catch (error) {
      setProblem(backupProblem(error));
    } finally {
      setReading(false);
      input.value = "";
    }
  };

  const exportData = async () => {
    if (busy) return;
    setExporting(true);
    setProgress(["Preparing backup from saved settings and data."]);
    setProblem(null);
    try {
      await downloadBackup();
      setProgress((lines) => [...lines, "Backup ready. Download requested."]);
    } catch (error) {
      setProblem(backupProblem(error));
    } finally {
      setExporting(false);
    }
  };

  const replaceData = async () => {
    if (!selected || busy) return;
    setImporting(true);
    setProgress(["Restoring settings and data. The app will reload when complete."]);
    setProblem(null);
    try {
      await importBackup(selected);
    } catch (error) {
      setProblem(backupProblem(error));
      setImporting(false);
    }
  };

  const summary = selected ? backupSummary(selected) : null;

  return (
    <div className="flex flex-col gap-8">
      <SettingsTitle
        title="Data"
        description="Keep a private copy of your September settings and data."
      />

      <div role="log" aria-label="Backup activity" aria-live="polite" className="empty:hidden">
        {progress.length > 0 ? (
          <div className="rounded-surface border p-5 text-sm shadow-sm">
            <p className="font-semibold">Backup activity</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 leading-relaxed">
              {progress.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ol>
            {problem ? (
              <p role="alert" className="text-destructive mt-2 break-words leading-relaxed">
                Error: {problem}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-primary/20 bg-primary/5 rounded-surface border p-5">
        <p className="text-sm font-semibold">Keep the file private</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Backups contain your Talk and Agent conversations and notes in plain
          text. Store them securely. API keys are not included.
        </p>
      </div>

      <Section
        title="Download a backup"
        description="Creates one JSON file with your settings, spaces, Talk and Agent messages, notes, saved phrases, and usage history."
      >
        <Button
          type="button"
          className="h-11 self-start px-4"
          aria-disabled={busy}
          onClick={() => void exportData()}
        >
          <Download aria-hidden />
          {exporting ? "Preparing backup…" : "Download backup"}
        </Button>
      </Section>

      <Section
        title="Restore a backup"
        description="Choose a September JSON backup. You can review its contents before anything changes."
      >
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void chooseBackup(event)}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 self-start px-4"
          aria-disabled={busy}
          onClick={() => {
            if (!busy) fileInput.current?.click();
          }}
        >
          <Upload aria-hidden />
          Choose backup file
        </Button>

        {summary ? (
          <>
            <BackupPreview
              fileName={fileName}
              summary={summary}
              skipped={skipped}
            />
            <p className="text-muted-foreground text-sm leading-relaxed">
              Importing replaces your current settings and data. It does not
              change your API keys or this device&apos;s audio settings.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 self-start px-4"
                  aria-disabled={busy}
                  onClick={(event) => {
                    if (busy) event.preventDefault();
                  }}
                >
                  {importing ? "Importing…" : "Import and replace"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Replace your September data?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This replaces your current settings and data with the
                    selected backup. You cannot undo this action unless you have
                    another backup.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep current data</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => void replaceData()}
                  >
                    Replace data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </Section>
    </div>
  );
}
