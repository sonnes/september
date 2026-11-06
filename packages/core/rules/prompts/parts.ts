/** Parts that more than one prompt uses. */

export const TAG_DESCRIBES_VOICE =
  "A tag must describe the voice. Do not use tags for music or sound effects.";

/** The rules for audio tags, as one block of a prompt. */
export const audioTagsBlock = (rules: readonly string[]): string =>
  `<audio_tags>\n${rules.map((rule) => `- ${rule}`).join("\n")}\n</audio_tags>`;

/** The sections of a prompt, with a blank line between each one. Empty sections are left out. */
export const promptOf = (sections: readonly (string | false | undefined)[]): string =>
  sections.filter(Boolean).join("\n\n");
