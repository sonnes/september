'use client';

import { useSyncExternalStore } from 'react';

import {
  getKokoroModelStatus,
  subscribeKokoroModelStatus,
  type KokoroModelStatus,
} from '../lib/providers/kokoro-status';

// Stable server snapshot — useSyncExternalStore requires referential equality.
const IDLE: KokoroModelStatus = { state: 'idle' };
const getServerSnapshot = () => IDLE;

/** Live download/load status of the on-device Kokoro model. */
export function useKokoroModelStatus(): KokoroModelStatus {
  return useSyncExternalStore(subscribeKokoroModelStatus, getKokoroModelStatus, getServerSnapshot);
}
