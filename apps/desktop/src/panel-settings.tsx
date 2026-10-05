import { useEffect, useState } from "react";

import { Label } from "@september/ui/components/label";
import { Switch } from "@september/ui/components/switch";

import { panelFloat, setPanelFloat } from "@/services/os";

/**
 * The panel section of Settings, on the desktop only.
 *
 * The switch shows the saved value, not the value it asked for, so a failed
 * write never leaves a switch that says one thing and does another.
 */
export function PanelSettings() {
  const [float, setFloat] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void panelFloat()
      .then(setFloat)
      .catch(() => setFloat(true));
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
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
        <p className="text-muted-foreground text-sm">
          The panel shows Talk, Notes, and Agent beside your other apps.
        </p>
      </div>
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
            checked={float !== false}
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
    </div>
  );
}
