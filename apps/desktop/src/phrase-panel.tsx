import { useMemo, useState } from "react";

import { Pin, PinOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  useDeletePhrase,
  useMessages,
  usePhrases,
  usePutPhrase,
} from "./data";
import { dismissedIdeas, rememberDismissed } from "./os";
import {
  generateCode,
  mineShortcuts,
  normalizeMinedText,
  rowKind,
  validateCode,
  type SavedPhrase,
} from "./phrases";

/**
 * The phrases of one space, and the shortcut ideas that come from repeated
 * messages.
 *
 * The web app keeps this in a right rail. The desktop app has no rail, so it
 * opens from the header of the Talk screen.
 */
export function PhrasePanel({
  spaceId,
  open,
  onClose,
}: {
  spaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: phrases } = usePhrases(spaceId);
  const { data: allPhrases } = usePhrases();
  const { data: messages } = useMessages(spaceId);
  const putPhrase = usePutPhrase();
  const deletePhrase = useDeletePhrase();

  const [dismissed, setDismissed] = useState<string[]>(dismissedIdeas);

  const ideas = useMemo(
    () =>
      mineShortcuts(messages ?? [], {
        existingPhrases: allPhrases ?? [],
        dismissed: new Set(dismissed),
      }),
    [messages, allPhrases, dismissed],
  );

  const keep = (text: string, code: string) => {
    const at = Date.now();
    putPhrase.mutate({
      id: crypto.randomUUID(),
      space_id: spaceId,
      text,
      kind: "phrase",
      code,
      pinned: true,
      created_at: at,
      updated_at: at,
    });
  };

  const dismiss = (text: string) => {
    const next = [...dismissed, normalizeMinedText(text)];
    setDismissed(next);
    void rememberDismissed(next);
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-[26rem] gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Phrases</SheetTitle>
          <SheetDescription>
            A phrase you keep stays. A phrase a model wrote is replaced as the
            conversation grows.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          <section className="space-y-2">
            {(phrases ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                This space has no phrases yet.
              </p>
            ) : null}

            {(phrases ?? []).map((row) => (
              <PhraseRow
                key={row.id}
                row={row}
                allPhrases={allPhrases ?? []}
                onChange={(next) => putPhrase.mutate(next)}
                onRemove={() => deletePhrase.mutate(row.id)}
              />
            ))}
          </section>

          {ideas.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Shortcut ideas</h3>
              <p className="text-muted-foreground text-sm">
                Words you say often. Keep one to give it a short code.
              </p>
              {ideas.map((idea) => (
                <div key={idea.text} className="rounded-xl border p-3">
                  <p className="text-sm font-medium">{idea.text}</p>
                  <p className="text-muted-foreground text-xs">
                    Typed {idea.count} times. Code{" "}
                    <span className="font-mono">{idea.code}</span>.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => keep(idea.text, idea.code)}
                    >
                      Keep
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => dismiss(idea.text)}
                    >
                      No thanks
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PhraseRow({
  row,
  allPhrases,
  onChange,
  onRemove,
}: {
  row: SavedPhrase;
  allPhrases: SavedPhrase[];
  onChange: (next: SavedPhrase) => void;
  onRemove: () => void;
}) {
  const [code, setCode] = useState(row.code ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  const saveCode = () => {
    if (!code.trim()) {
      setProblem(null);
      onChange({ ...row, code: undefined });
      return;
    }

    const others = allPhrases
      .filter((one) => one.id !== row.id && one.code)
      .map((one) => one.code as string);
    const checked = validateCode(code, { existingCodes: others });

    if (!checked.ok) {
      setProblem(REASONS[checked.reason](checked.suggestion));
      setCode(row.code ?? "");
      return;
    }

    setProblem(null);
    // A code the user sets is a code the user relies on, so the row is kept.
    onChange({ ...row, code: checked.code, pinned: true });
  };

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-medium">{row.text}</p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={row.pinned ? "Let a model replace this" : "Keep this"}
          onClick={() => onChange({ ...row, pinned: !row.pinned })}
        >
          {row.pinned ? <Pin aria-hidden /> : <PinOff aria-hidden />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Remove ${row.text}`}
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Input
          value={code}
          aria-label={`Code for ${row.text}`}
          placeholder="code"
          maxLength={5}
          onChange={(event) => setCode(event.target.value)}
          onBlur={saveCode}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="h-9 w-24 font-mono"
        />
        <span className="text-muted-foreground text-xs">
          {rowKind(row) === "starter" ? "an opening" : "a whole sentence"}
        </span>
      </div>

      {problem ? (
        <p className="text-destructive mt-1 text-xs">{problem}</p>
      ) : null}
    </div>
  );
}

const REASONS: Record<
  "format" | "dictionary" | "duplicate",
  (suggestion?: string) => string
> = {
  format: () => "A code is 2 to 5 letters or numbers.",
  dictionary: (suggestion) =>
    `That is a word you might type. ${suggestion ? `Try ${suggestion}.` : ""}`,
  duplicate: (suggestion) =>
    `Another phrase has that code. ${suggestion ? `Try ${suggestion}.` : ""}`,
};
