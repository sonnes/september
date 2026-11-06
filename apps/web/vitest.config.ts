import { defineConfig } from 'vitest/config';

import { testConfig } from '../../vite.shared.ts';

export default defineConfig(
  testConfig({ platform: '@september/app-ui/test/platform', setupFiles: ['./src/test/setup.ts'] })
);
