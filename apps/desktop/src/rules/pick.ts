/**
 * The rules of the writing-model picker.
 *
 * OpenRouter has hundreds of models, and September shows the free ones first,
 * because the app promises that the user needs no card. The search reaches
 * every model: a user with credit can find the model they pay for, and a user
 * without credit never meets one by accident.
 */

/** One row of the picker. Rust sends the free rows first. */
export interface ModelRow {
  id: string;
  name: string;
  free: boolean;
}

/**
 * True when each word of the query is in the text, in any letter case.
 *
 * No words match everything, so a picker that has not been searched shows its
 * resting list.
 */
export function matchesWords(text: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const target = text.toLowerCase();
  return words.every((word) => target.includes(word));
}

/**
 * The rows the picker draws.
 *
 * With no words, the free rows only. With words, every row where each word is
 * in the name or in the id. `chosenId` keeps the model in use, because Radix
 * reads the name of the closed picker from the row, and a filtered-out row
 * leaves the picker blank.
 */
export function searchModels<Row extends ModelRow>(
  rows: Row[],
  query: string,
  chosenId?: string,
): Row[] {
  const found =
    query.trim() === ""
      ? rows.filter((row) => row.free)
      : rows.filter((row) => matchesWords(`${row.name} ${row.id}`, query));

  if (!chosenId || found.some((row) => row.id === chosenId)) return found;

  const chosen = rows.find((row) => row.id === chosenId);
  return chosen ? [...found, chosen] : found;
}
