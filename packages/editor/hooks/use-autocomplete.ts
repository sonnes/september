'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAccount } from '@september/account';
import { useMessages } from '@september/chats';

import {
  Autocomplete,
  AutocompletePersistence,
  type AnyEngineSnapshot,
} from '@september/shared/autocomplete';
import { tokenize } from '@september/shared/autocomplete';

// Module-level caches. The base corpus is ~2 MB and shared across all users;
// fetching once per tab is enough.
let cachedDictionary: Record<string, number> | null = null;
let cachedCorpus: string | null = null;
let loadStaticDataPromise: Promise<void> | null = null;

// One persistence instance per tab — opening IDB connections is non-trivial.
const persistence = new AutocompletePersistence();

const PERSIST_DEBOUNCE_MS = 3000;

/**
 * Cheap fingerprint of the seed corpus — lengths catch version bumps and
 * user-corpus edits without the cost of hashing ~2 MB on every render. If
 * this differs from the stored snapshot's digest, we retrain the base
 * layer but keep the user / chat layers (they represent personal history,
 * orthogonal to the shared corpus).
 */
function seedDigest(base: string, userCorpus: string): string {
  return `${base.length}|${userCorpus.length}|${userCorpus.slice(0, 64)}`;
}

interface UseAutocompleteOptions {
  /** Include the user's message history in the engine on mount. */
  includeMessages?: boolean;
  /**
   * Scope observations and predictions to this chat. When provided, new
   * messages observed via `useMessages` are attributed to both the global
   * user layer *and* this chat's layer, and `getNextWords` consult it first.
   */
  chatId?: string;
}

interface UseAutocompleteReturn {
  isReady: boolean;
  getSpellings: (query: string) => string[];
  getNextWords: (query: string) => string[];
}

export function useAutocomplete(options: UseAutocompleteOptions = {}): UseAutocompleteReturn {
  const { includeMessages = false, chatId } = options;
  const { account } = useAccount();
  const { messages } = useMessages();

  const [autocomplete, setAutocomplete] = useState<Autocomplete>(() => new Autocomplete());
  const [isInitialized, setIsInitialized] = useState(false);

  // Track which messages we've already folded into the engine, so `observe()`
  // truly is incremental when `messages` updates. A Set of ids survives
  // re-renders via useRef without triggering re-renders itself.
  const observedMessageIds = useRef<Set<string>>(new Set());

  // Debounced persist timer handle. Persistence is eventual — losing a few
  // seconds of learning on a hard crash is fine; we re-observe on next mount
  // because the messages are still in local state.
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveKey = useRef<string | null>(null);

  const userId = account?.id;
  const userCorpus = account?.ai_suggestions?.settings?.ai_corpus ?? '';
  const persistenceKey = userId ? AutocompletePersistence.userKey(userId) : null;

  const schedulePersist = useCallback(
    (key: string, engine: Autocomplete) => {
      pendingSaveKey.current = key;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        const snap = engine.getSnapshot();
        void persistence.save(key, {
          ...snap,
          seedDigest: seedDigest(cachedCorpus ?? '', userCorpus),
        });
      }, PERSIST_DEBOUNCE_MS);
    },
    [userCorpus],
  );

  // Bootstrap: load static corpus + attempt snapshot rehydrate.
  useEffect(() => {
    let cancelled = false;

    const loadStaticOnce = async () => {
      if (cachedDictionary && cachedCorpus) return;
      if (!loadStaticDataPromise) {
        loadStaticDataPromise = (async () => {
          try {
            const [dictRes, corpusRes] = await Promise.all([
              fetch('/dictionary.json'),
              fetch('/corpus.txt'),
            ]);
            cachedDictionary = await dictRes.json();
            cachedCorpus = await corpusRes.text();
          } catch (error) {
            console.warn('Failed to load default dictionary/corpus:', error);
            cachedCorpus = cachedCorpus ?? '';
            cachedDictionary = cachedDictionary ?? {};
          }
        })();
      }
      await loadStaticDataPromise;
    };

    const initialize = async () => {
      await loadStaticOnce();
      if (cancelled) return;

      const engine = new Autocomplete();
      const baseCorpus = cachedCorpus ?? '';
      const digest = seedDigest(baseCorpus, userCorpus);

      let rehydrated = false;
      let snapshot: AnyEngineSnapshot | undefined;

      if (persistenceKey) {
        snapshot = await persistence.load(persistenceKey);
        if (snapshot && snapshot.seedDigest === digest) {
          engine.restoreFromSnapshot(snapshot);
          rehydrated = true;
        }
      }

      if (!rehydrated) {
        // Cold path: train from seed corpus once, then layer in historical
        // messages individually (so observedMessageIds stays honest).
        const seed = [baseCorpus, userCorpus].filter(Boolean).join('\n');
        if (seed.length > 0) engine.train(seed);
      }

      observedMessageIds.current = new Set();
      if (includeMessages) {
        for (const m of messages) {
          // Only observe messages the user actually sent — we're modelling
          // *their* typing, not what they receive. Received messages leak
          // contact-specific vocabulary that the user doesn't type.
          if (m.type !== 'user') continue;

          // Skip messages already in the snapshot (by timestamp cutoff).
          if (snapshot && m.created_at.getTime() <= snapshot.createdAt) {
            observedMessageIds.current.add(m.id);
            continue;
          }
          engine.observe(m.text, { chatId: m.chat_id });
          observedMessageIds.current.add(m.id);
        }
      }

      if (cancelled) return;
      setAutocomplete(engine);
      setIsInitialized(true);
      if (persistenceKey) schedulePersist(persistenceKey, engine);
    };

    void initialize();

    return () => {
      cancelled = true;
    };
    // Intentionally omitting `messages` — message deltas are handled by the
    // second effect below, not a full re-init. Only re-init when the
    // identity of the corpus changes (user, their personal corpus, or the
    // includeMessages toggle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistenceKey, userCorpus, includeMessages]);

  // Incremental updates when new messages arrive.
  useEffect(() => {
    if (!isInitialized || !includeMessages) return;

    let newCount = 0;
    for (const m of messages) {
      if (observedMessageIds.current.has(m.id)) continue;
      if (m.type !== 'user') {
        observedMessageIds.current.add(m.id);
        continue;
      }
      autocomplete.observe(m.text, { chatId: m.chat_id });
      observedMessageIds.current.add(m.id);
      newCount++;
    }

    if (newCount > 0 && persistenceKey) {
      schedulePersist(persistenceKey, autocomplete);
    }
  }, [messages, isInitialized, includeMessages, autocomplete, persistenceKey, schedulePersist]);

  // Flush any pending save on unmount.
  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        persistTimer.current = null;
        if (pendingSaveKey.current) {
          const snap = autocomplete.getSnapshot();
          void persistence.save(pendingSaveKey.current, {
            ...snap,
            seedDigest: seedDigest(cachedCorpus ?? '', userCorpus),
          });
        }
      }
    };
    // Only run on unmount; we don't want to re-register this effect on deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSpellings = useCallback(
    (query: string): string[] => {
      if (!query || query.trim().length === 0 || !autocomplete.isReady()) return [];
      const tokens = tokenize(query);
      const lastToken = tokens[tokens.length - 1];
      if (!lastToken) return [];
      // Prefix completion is global — spellings don't need chatId scoping.
      const spellings = autocomplete.getCompletions(lastToken) || [];
      return spellings.map(s => s.toLowerCase());
    },
    [autocomplete],
  );

  const getNextWords = useCallback(
    (query: string): string[] => {
      if (!query || query.trim().length < 1 || !autocomplete.isReady()) return [];
      const tokens = tokenize(query);
      const last3 = tokens.slice(-3).join(' ');
      return autocomplete.getNextWord(last3, { chatId }) || [];
    },
    [autocomplete, chatId],
  );

  return useMemo(
    () => ({
      isReady: isInitialized && autocomplete.isReady(),
      getSpellings,
      getNextWords,
    }),
    [isInitialized, autocomplete, getSpellings, getNextWords],
  );
}
