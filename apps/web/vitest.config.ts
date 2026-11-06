import { defineConfig } from 'vitest/config';

import { testConfig } from '../../vite.shared.ts';

export default defineConfig(
  testConfig({ platform: '/src/test/platform.ts', setupFiles: ['./src/test/setup.ts'] })
);
