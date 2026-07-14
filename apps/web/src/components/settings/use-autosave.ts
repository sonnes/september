'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

export type AutosaveStatus = 'idle' | 'saving' | 'saved';

export interface UseAutosaveReturn<T> {
  status: AutosaveStatus;
  /** Save now — for discrete controls (toggles, selects, voice picks). */
  save: (value: T) => void;
  /** Debounced save — for continuous controls (sliders, text). */
  scheduleSave: (value: T) => void;
}

// Feature pages save on change instead of a Save button — fewer steps for
// motor-impaired users. Failures surface as a toast; the page keeps the edited
// value so retrying is just touching the control again.
export function useAutosave<T>(
  onSave: (value: T) => Promise<void>,
  debounceMs = 600
): UseAutosaveReturn<T> {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (settleRef.current) clearTimeout(settleRef.current);
    },
    []
  );

  const save = useCallback((value: T) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (settleRef.current) clearTimeout(settleRef.current);
    setStatus('saving');

    void (async () => {
      try {
        await onSaveRef.current(value);
        setStatus('saved');
        settleRef.current = setTimeout(() => setStatus('idle'), 2000);
      } catch (error) {
        console.error('Error saving settings:', error);
        setStatus('idle');
        toast.error('Could not save. Please try again.');
      }
    })();
  }, []);

  const scheduleSave = useCallback(
    (value: T) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(value), debounceMs);
    },
    [save, debounceMs]
  );

  return { status, save, scheduleSave };
}
