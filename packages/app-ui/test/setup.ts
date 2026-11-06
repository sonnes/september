import { beforeEach } from 'vitest';

import { loadSettings } from '@september/app-ui/services/settings';

import { resetPlatform } from './platform';

beforeEach(async () => {
  resetPlatform();
  await loadSettings();
});
