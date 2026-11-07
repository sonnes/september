import { Play } from "lucide-react";

import { Button } from "@september/ui/components/button";
import { voiceList, voiceRows } from "@september/core/rules/voice";

import { PickList } from "@september/app-ui/blocks/pick-list";
import type { Voice } from "@september/app-ui/platform";

/**
 * The voices of the account, to pick one. Each row has a button that plays
 * the public sample of its voice, so a voice is heard before it is chosen.
 */
export function VoicePicker({
  voices,
  heard = [],
  value,
  onPick,
  onHear,
  name,
  compact = false,
}: {
  voices: Voice[];
  /** The voices heard lately, newest first. */
  heard?: readonly string[];
  value: string;
  onPick: (id: string) => void;
  onHear: (voice: Voice) => void;
  /** The name of the radio group. */
  name: string;
  /** One column in a box of one height, for a screen with other lists. */
  compact?: boolean;
}) {
  return (
    <PickList
      rows={voiceRows(voices, heard)}
      value={value}
      onPick={onPick}
      label="Search voices"
      name={name}
      columns={compact ? 1 : 2}
      fixedHeight={compact}
      filter={(_, query) => voiceList(voices, heard, query, value)}
      after={({ voice }) => (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          aria-label={`Hear ${voice.name}`}
          aria-disabled={!voice.preview_url}
          onClick={() => {
            if (voice.preview_url) onHear(voice);
          }}
        >
          <Play aria-hidden />
        </Button>
      )}
    />
  );
}
