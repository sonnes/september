/**
 * The phrases a first space starts with, so the stripe is never empty.
 * They are pinned, so a regeneration never takes them away.
 */
export const STARTER_PACK: { text: string; code: string }[] = [
  { text: "Thank you", code: "ty" },
  { text: "I want to go to the bathroom", code: "iwb" },
  { text: "How are you?", code: "hru" },
];
