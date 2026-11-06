import { useState } from "react";
import { Button } from "@september/ui/components/button";
import { AccessForm } from "@september/app-ui/blocks/access-form";
import { INPUT_METHODS, type InputMethod, parseAccess } from "@september/core/rules/access";
import { SaveFailed, SettingsTitle, useSetupAnswers } from "@september/app-ui/blocks/setup-fields";

/**
 * The access profile: how the person chooses things, the size of the text,
 * the theme, the contrast, the motion, and the click. Each answer saves at
 * once, but a new input method waits for its Use key. A new method changes
 * how every key responds, so an arrow key that passes it must not start it.
 */
export function AccessSettings() {
  const { setup, change, failed, retry } = useSetupAnswers();
  const saved = parseAccess(setup.access);
  const [pending, setPending] = useState<InputMethod | null>(null);
  const input = pending ?? saved.input;
  const method = INPUT_METHODS.find((one) => one.value === input);

  return (
    <div className="flex flex-col gap-8">
      <SettingsTitle
        title="Access"
        description="How you choose things, and how September looks for you."
      />
      {failed ? <SaveFailed retry={retry} /> : null}
      <AccessForm
        value={{ ...saved, input }}
        onChange={(next) => {
          if (next.input !== input) {
            setPending(next.input === saved.input ? null : next.input);
            return;
          }
          change({ access: { ...next, input: saved.input } });
        }}
        confirm={
          pending && method ? (
            <div className="flex flex-wrap items-center gap-[var(--reach-gap,0.75rem)]">
              <Button
                type="button"
                size="lg"
                onClick={() => {
                  change({ access: { ...saved, input: pending } });
                  setPending(null);
                }}
              >
                Use {method.label}
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={() => setPending(null)}>
                Keep {INPUT_METHODS.find((one) => one.value === saved.input)?.label}
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  );
}

// ------------------------------------------------------------ the services

// ------------------------------------------------------------ AI Assistance

// --------------------------------------------------------------------- data
