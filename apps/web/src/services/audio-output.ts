import { SETTINGS } from '@september/core/rules/settings';

import { browserRepository } from './repository';

/** The output the user chose, or the default output as an empty id. */
export async function audioOutput(): Promise<string> {
  return (await browserRepository.getSetting<string>(SETTINGS.audioOutput)) ?? '';
}

export const chooseAudioOutput = (uid: string): Promise<void> =>
  browserRepository.putSetting(SETTINGS.audioOutput, uid);
