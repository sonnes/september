import { useMemo, useState } from "react";

import {
  Check,
  Hash,
  Lightbulb,
  Pin,
  Plus,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@september/ui/components/button";
import { Input } from "@september/ui/components/input";
import { cn } from "@september/ui";

import {
  useDeletePhrase,
  useMessages,
  usePhrases,
  usePutPhrase,
} from "@platform/services/data";
import { dismissedIdeas, rememberDismissed } from "@platform/services/os";
import {
  CODE_MAX_LENGTH,
  mineShortcuts,
  normalizeMinedText,
  rowKind,
  validateCode,
  type SavedPhrase,
} from "@september/core/rules/phrases";

/**
 * The phrases of one space, and the shortcut ideas that come from repeated
 * messages. The layout is the layout of the web app: one line for one phrase,
 * the kept rows first, and a form above them both.
 *
 * The targets are 44px, where the web app uses 36px. DESIGN.md asks for 44,
 * and a user of September points with less accuracy than a user of a browser.
 */
export function Phrases({
  spaceId,
  onInsert,
}: {
  spaceId: string;
  onInsert: (text: string) => void;
}) {
  const { data: phrases } = usePhrases(spaceId);
  const { data: allPhrases } = usePhrases();
  const { data: messages } = useMessages(spaceId);
  const putPhrase = usePutPhrase();
  const deletePhrase = useDeletePhrase();

  const [dismissed, setDismissed] = useState<string[]>(dismissedIdeas);
  const [draft, setDraft] = useState("");
  const [draftCode, setDraftCode] = useState("");

  const rows = phrases ?? [];

  // A code works in every space, so a new one is measured against them all.
  const everyCode = useMemo(
    () =>
      (allPhrases ?? [])
        .map((row) => row.code)
        .filter((code): code is string => Boolean(code)),
    [allPhrases],
  );

  const checked = draftCode.trim()
    ? validateCode(draftCode, { existingCodes: everyCode })
    : undefined;
  const problem =
    checked && !checked.ok ? REASONS[checked.reason](checked.suggestion) : null;

  const ideas = useMemo(
    () =>
      mineShortcuts(messages ?? [], {
        existingPhrases: allPhrases ?? [],
        dismissed: new Set(dismissed),
      }),
    [messages, allPhrases, dismissed],
  );

  const keep = (text: string, code?: string) => {
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

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || problem) return;

    keep(text, checked?.ok ? checked.code : undefined);
    setDraft("");
    setDraftCode("");
  };

  const dismiss = (text: string) => {
    const next = [...dismissed, normalizeMinedText(text)];
    setDismissed(next);
    void rememberDismissed(next);
  };

  const kept = rows.filter((row) => row.pinned);
  const written = rows.filter((row) => !row.pinned);

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground text-xs">
        Press a phrase to put it in the composer. A phrase you keep stays. A
        phrase September wrote is replaced as the conversation grows. A code
        brings its phrase up while you type.
      </p>

      <form onSubmit={add} className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            aria-label="Add a phrase"
            placeholder="Add a phrase"
            className="h-11 min-w-0 flex-1"
            onChange={(event) => setDraft(event.target.value)}
          />
          <Input
            value={draftCode}
            aria-label="Code (optional)"
            placeholder="code"
            maxLength={CODE_MAX_LENGTH}
            className={cn(
              "h-11 w-16 font-mono",
              problem && "border-destructive",
            )}
            onChange={(event) => setDraftCode(event.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            variant="secondary"
            aria-label="Add phrase"
            className="size-11 shrink-0"
            disabled={!draft.trim() || Boolean(problem)}
          >
            <Plus aria-hidden />
          </Button>
        </div>
        {problem ? <p className="text-destructive text-xs">{problem}</p> : null}
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Phrases show here after your first message.
        </p>
      ) : (
        <div className="space-y-4">
          {kept.length > 0 ? (
            <PhraseGroup
              label="Kept"
              icon={Pin}
              rows={kept}
              allPhrases={allPhrases ?? []}
              onInsert={onInsert}
              onChange={(next) => putPhrase.mutate(next)}
              onRemove={(id) => deletePhrase.mutate(id)}
            />
          ) : null}
          {written.length > 0 ? (
            <PhraseGroup
              label="Suggested"
              icon={Sparkles}
              rows={written}
              allPhrases={allPhrases ?? []}
              onInsert={onInsert}
              onChange={(next) => putPhrase.mutate(next)}
              onRemove={(id) => deletePhrase.mutate(id)}
            />
          ) : null}
        </div>
      )}

      {ideas.length > 0 ? (
        <section className="space-y-2">
          <GroupLabel icon={Lightbulb} label="Code ideas" />
          <ul className="space-y-1.5">
            {ideas.map((idea) => (
              <li
                key={idea.text}
                className="border-primary/20 bg-primary/5 rounded-control flex items-center gap-1 border"
              >
                <div className="min-w-0 flex-1 px-3 py-2">
                  <p className="truncate text-sm" title={idea.text}>
                    {idea.text}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Typed {idea.count} times. Code <CodeBadge code={idea.code} />
                  </p>
                </div>
                <RowButton
                  label={`Keep ${idea.text}`}
                  className="text-primary"
                  onClick={() => keep(idea.text, idea.code)}
                >
                  <Check className="size-4" aria-hidden />
                </RowButton>
                <RowButton
                  label={`Do not offer ${idea.text} again`}
                  className="hover:text-destructive"
                  onClick={() => dismiss(idea.text)}
                >
                  <X className="size-4" aria-hidden />
                </RowButton>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** The small label above a group of rows. */
function GroupLabel({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
      <Icon className="size-3.5" aria-hidden />
      {label}
    </div>
  );
}

function PhraseGroup({
  label,
  icon,
  rows,
  allPhrases,
  onInsert,
  onChange,
  onRemove,
}: {
  label: string;
  icon: LucideIcon;
  rows: SavedPhrase[];
  allPhrases: SavedPhrase[];
  onInsert: (text: string) => void;
  onChange: (next: SavedPhrase) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="space-y-2">
      <GroupLabel icon={icon} label={label} />
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <PhraseRow
            key={row.id}
            row={row}
            allPhrases={allPhrases}
            onInsert={onInsert}
            onChange={onChange}
            onRemove={() => onRemove(row.id)}
          />
        ))}
      </ul>
    </section>
  );
}

/** The code of a phrase, as a badge. A model wrote the muted ones. */
function CodeBadge({ code, muted }: { code: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-xs font-semibold",
        muted
          ? "border-border bg-muted text-muted-foreground"
          : "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      {code}
    </span>
  );
}

/** One control of a row. Every one holds the 44px target of DESIGN.md. */
function RowButton({
  label,
  className,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-control flex size-11 shrink-0 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

function PhraseRow({
  row,
  allPhrases,
  onInsert,
  onChange,
  onRemove,
}: {
  row: SavedPhrase;
  allPhrases: SavedPhrase[];
  onInsert: (text: string) => void;
  onChange: (next: SavedPhrase) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="bg-card rounded-control flex items-center gap-1 border">
      <button
        type="button"
        title={row.text}
        onClick={() => onInsert(row.text)}
        className="focus-visible:ring-ring rounded-control flex min-h-11 min-w-0 flex-1 items-center truncate px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
      >
        {row.text}
      </button>

      {rowKind(row) === "starter" ? (
        <span className="border-primary/40 text-primary/70 shrink-0 rounded-md border border-dashed px-1.5 py-0.5 text-xs">
          opening
        </span>
      ) : null}

      {editing ? (
        <CodeField
          row={row}
          allPhrases={allPhrases}
          onChange={onChange}
          onDone={() => setEditing(false)}
        />
      ) : row.code ? (
        <button
          type="button"
          aria-label={`Change the code ${row.code}`}
          title={
            row.pinned
              ? "Change the code"
              : "September can replace this code. Keep the phrase to hold it."
          }
          onClick={() => setEditing(true)}
          className="focus-visible:ring-ring shrink-0 rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <CodeBadge code={row.code} muted={!row.pinned} />
        </button>
      ) : row.pinned ? (
        <RowButton
          label={`Add a code for ${row.text}`}
          onClick={() => setEditing(true)}
        >
          <Hash className="size-4" aria-hidden />
        </RowButton>
      ) : null}

      <RowButton
        label={row.pinned ? "Let September replace this" : "Keep this"}
        className={row.pinned ? "text-primary" : undefined}
        onClick={() => onChange({ ...row, pinned: !row.pinned })}
      >
        <Pin className={cn("size-4", row.pinned && "fill-current")} aria-hidden />
      </RowButton>

      <RowButton
        label={`Remove ${row.text}`}
        className="hover:text-destructive"
        onClick={onRemove}
      >
        <X className="size-4" aria-hidden />
      </RowButton>
    </li>
  );
}

/**
 * The small field that a code badge opens. Enter keeps it, Escape leaves it,
 * and a press somewhere else keeps it too.
 */
function CodeField({
  row,
  allPhrases,
  onChange,
  onDone,
}: {
  row: SavedPhrase;
  allPhrases: SavedPhrase[];
  onChange: (next: SavedPhrase) => void;
  onDone: () => void;
}) {
  const [value, setValue] = useState(row.code ?? "");

  // The row keeps its own code, so a change that keeps it is not a duplicate.
  const others = allPhrases
    .filter((one) => one.id !== row.id && one.code)
    .map((one) => one.code as string);
  const checked = value.trim()
    ? validateCode(value, { existingCodes: others })
    : undefined;
  const problem =
    checked && !checked.ok ? REASONS[checked.reason](checked.suggestion) : null;

  const save = () => {
    if (problem) return;
    if (!checked) {
      onChange({ ...row, code: undefined });
      onDone();
      return;
    }

    // A code the user sets is a code the user relies on, so the row is kept.
    onChange({
      ...row,
      code: checked.ok ? checked.code : row.code,
      pinned: true,
    });
    onDone();
  };

  return (
    <Input
      autoFocus
      value={value}
      aria-label={`Code for ${row.text}`}
      aria-invalid={Boolean(problem)}
      title={problem ?? undefined}
      maxLength={CODE_MAX_LENGTH}
      className={cn(
        "h-8 w-16 shrink-0 px-1.5 font-mono text-xs",
        problem && "border-destructive",
      )}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          save();
        }
        if (event.key === "Escape") onDone();
      }}
    />
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
