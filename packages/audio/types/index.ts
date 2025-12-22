export interface Audio {
  id?: string;
  text?: string;
  path?: string;
  blob?: string;
  alignment?: Alignment;
  duration?: number;
  utterance?: SpeechSynthesisUtterance;
}

export interface Alignment {
  characters: string[];
  start_times: number[];
  end_times: number[];
}

/**
 * ElevenLabs-compatible character alignment format.
 * Use `toCharacterAlignment` to convert from `Alignment`.
 */
export interface CharacterAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

/**
 * Convert internal Alignment format to ElevenLabs-compatible CharacterAlignment.
 */
export function toCharacterAlignment(alignment: Alignment): CharacterAlignment {
  return {
    characters: alignment.characters,
    characterStartTimesSeconds: alignment.start_times,
    characterEndTimesSeconds: alignment.end_times,
  };
}

