import { defineConfig } from 'vite';

import tauri from './src-tauri/tauri.conf.json';
import { appConfig } from '../../vite.shared.ts';

// Tauri opens the dev server at `devUrl`, so the port comes from there.
export default defineConfig(appConfig(Number(new URL(tauri.build.devUrl).port)));
