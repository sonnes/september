import { useEffect, useState } from "react";

import { SettingsTitle } from "@september/app-ui/blocks/setup-fields";
import { sectionFor } from "@september/core/rules/navigation";
import { Button } from "@september/ui/components/button";
import { Label } from "@september/ui/components/label";
import { Switch } from "@september/ui/components/switch";

import { exportNotes, panelFloat, setPanelFloat } from "@/window";

/**
 * The panel section of Settings, on the desktop only.
 *
 * The switch shows the saved value, not the value it asked for, so a failed
 * write never leaves a switch that says one thing and does another.
 */
export function PanelSettings() {
  return (
    <div className="flex flex-col gap-8">
      <FloatSetting />
      <CopyNotes />
    </div>
  );
}

function FloatSetting() {
  const [float, setFloat] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    panelFloat()
      .then(setFloat)
      .catch((reason: unknown) => {
        console.error("September could not read the panel setting.", reason);
        setError("September could not read the setting.");
      });
  }, []);

  const toggle = async () => {
    if (pending || float === null) return;
    setPending(true);
    setError("");
    try {
      await setPanelFloat(!float);
      setFloat(!float);
    } catch {
      setError("September did not save the setting. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <SettingsTitle
        title={sectionFor("/settings/panel").title}
        description="The panel shows Talk, Notes, and Agent beside your other apps."
      />
      <div className="flex flex-col gap-1.5">
        <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border px-4 py-3">
          <Label
            htmlFor="setting-panel-float"
            className="flex flex-1 cursor-pointer flex-col items-start gap-1"
          >
            <span className="text-sm font-medium">Float on top</span>
            <span
              id="setting-panel-float-description"
              className="text-muted-foreground text-xs leading-relaxed font-normal"
            >
              The panel stays above other apps, also an app in full screen, and
              shows on each desktop. Turn it off to use the panel as a normal
              window.
            </span>
          </Label>
          <Switch
            id="setting-panel-float"
            checked={float === true}
            disabled={float === null}
            aria-describedby="setting-panel-float-description"
            aria-disabled={pending}
            onCheckedChange={() => void toggle()}
          />
        </div>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}

/**
 * One key that copies every note into the folder of the Write documents of
 * September Keyboard. The notes stay in this app too.
 */
function CopyNotes() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const copy = async () => {
    if (pending) return;
    setPending(true);
    setResult("");
    setError("");
    try {
      const { count, folder } = await exportNotes();
      setResult(
        count === 0
          ? "You have no notes to copy."
          : `Copied ${count} ${
              count === 1 ? "note" : "notes"
            } to ${folder}. Open Write in September Keyboard to see them.`
      );
    } catch (reason) {
      console.error("September could not copy the notes.", reason);
      setError("September could not copy the notes. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Notes for September Keyboard</h2>
        <p
          id="copy-notes-description"
          className="text-muted-foreground text-xs leading-relaxed"
        >
          Copies each note into the September folder of Documents as a Markdown
          file, with the name of its space at the start of the file name.
          September Keyboard shows the files in Write. A file that is already
          there does not change, and your notes stay here.
        </p>
      </div>
      <Button
        type="button"
        className="h-11 self-start px-4"
        aria-describedby="copy-notes-description"
        aria-disabled={pending}
        onClick={() => void copy()}
      >
        {pending ? "Copying notes…" : "Copy notes to September Keyboard"}
      </Button>
      <p role="status" className="text-sm">
        {result}
      </p>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
