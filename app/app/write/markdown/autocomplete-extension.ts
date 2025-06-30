import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

function debounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timer: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const output = callback(...args);
          resolve(output);
        } catch (err) {
          reject(err);
        }
      }, delay);
    });
  };
}

// Fast hash function for content deduplication and caching
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Optimized text extraction with intelligent context building
function extractContext(doc: any, cursorPos: number, maxLength: number): string {
  const extractionStart = Math.max(0, cursorPos - maxLength);
  return doc?.textBetween(extractionStart, cursorPos, ' ') || '';
}

// Cache management with automatic cleanup
class SuggestionCacheManager {
  private cache = new Map<string, { suggestion: string; timestamp: number }>();
  private readonly maxCacheSize = 50;
  private readonly cacheExpiryMs = 5 * 60 * 1000; // 5 minutes

  get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiryMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.suggestion;
  }

  set(key: string, suggestion: string): void {
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) return;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      suggestion,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export interface AutocompleteOptions {
  applySuggestionKey: string;
  suggestionDebounce: number;
  previousTextLength: number;
  getSuggestion?: (previousText: string) => Promise<string | null>;
}

interface CursorContext {
  shouldShowSuggestions: boolean;
  wordContext: string;
}

function analyzeCursorContext(state: any, cursorPos: number): CursorContext {
  if (!state?.doc || !state?.selection) {
    return { shouldShowSuggestions: false, wordContext: '' };
  }

  const selection = state.selection;
  const hasSelection = !selection.empty;

  if (hasSelection) {
    return { shouldShowSuggestions: false, wordContext: '' };
  }

  // Get text before cursor
  const beforeText = state.doc?.textBetween(Math.max(0, cursorPos - 100), cursorPos, ' ') || '';

  // Check if we're in a code block
  const codeBlockCount = (beforeText.match(/```/g) || []).length;
  const isInCodeBlock = codeBlockCount % 2 === 1;

  if (isInCodeBlock) {
    return { shouldShowSuggestions: false, wordContext: '' };
  }

  // Get current word
  const wordMatch = beforeText.match(/(\S+)$/);
  const wordContext = wordMatch ? wordMatch[1] : '';

  const shouldShowSuggestions =
    beforeText.trim().length > 0 && // Has some text
    wordContext.length >= 2; // Has meaningful word context

  return { shouldShowSuggestions, wordContext };
}

function createSuggestionDecoration(cursorPos: number, suggestion: string) {
  return Decoration.widget(
    cursorPos,
    () => {
      const ghostText = document.createElement('span');
      ghostText.className = 'autocomplete-suggestion-ghost';
      ghostText.textContent = suggestion;
      ghostText.setAttribute('aria-hidden', 'true');
      return ghostText;
    },
    { side: 1, marks: [], stopEvent: () => true }
  );
}

function clearSuggestions(view: any, pluginKey: PluginKey<DecorationSet>) {
  const tr = view.state.tr;
  tr.setMeta('addToHistory', false);
  tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
  view.dispatch(tr);
}

export const AutocompleteExtension = Extension.create<AutocompleteOptions>({
  name: 'autocomplete',

  addOptions() {
    return {
      applySuggestionKey: 'Tab',
      suggestionDebounce: 1500,
      previousTextLength: 4000,
      getSuggestion: undefined,
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey<DecorationSet>('autocomplete');
    const options = this.options;
    let currentSuggestion: string | null = null;
    const cacheManager = new SuggestionCacheManager();

    const getSuggestion = debounce(
      async (previousText: string, cb: (suggestion: string | null) => void) => {
        if (!options.getSuggestion || previousText.trim().length < 3) {
          cb(null);
          return;
        }

        const cacheKey = simpleHash(previousText);
        const cachedSuggestion = cacheManager.get(cacheKey);

        if (cachedSuggestion) {
          currentSuggestion = cachedSuggestion;
          cb(cachedSuggestion);
          return;
        }

        try {
          const suggestion = await options.getSuggestion(previousText);

          if (suggestion?.trim()) {
            currentSuggestion = suggestion;
            cacheManager.set(cacheKey, suggestion.trim());
            cb(suggestion);
          } else {
            cb(null);
          }
        } catch (error) {
          console.warn('Autocomplete: Error getting suggestion:', error);
          cb(null);
        }
      },
      this.options.suggestionDebounce
    );

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldValue) {
            if (tr.getMeta(pluginKey)) {
              const { decorations } = tr.getMeta(pluginKey);
              return decorations;
            }
            return tr.docChanged ? oldValue.map(tr.mapping, tr.doc) : oldValue;
          },
        },
        view() {
          let lastCursorPos = -1;
          let lastDocSize = -1;

          return {
            update(view, prevState) {
              if (!view?.state?.selection) return;

              const selection = view.state.selection;
              const cursorPos = selection.$head?.pos;
              const docSize = view.state.doc?.content?.size;

              if (typeof cursorPos !== 'number' || typeof docSize !== 'number') return;

              const currentDecorations = pluginKey.getState(view.state);
              const hasExistingSuggestion = Boolean(
                currentDecorations && currentDecorations.find().length > 0
              );

              const cursorContext = analyzeCursorContext(view.state, cursorPos);

              // Clear suggestions if context is inappropriate
              if (hasExistingSuggestion && !cursorContext.shouldShowSuggestions) {
                clearSuggestions(view, pluginKey);
                currentSuggestion = null;
                lastCursorPos = cursorPos;
                lastDocSize = docSize;
                return;
              }

              // Only fetch suggestions if typing forward and context is appropriate
              const isTyping = docSize > lastDocSize && cursorPos > lastCursorPos;

              if (!isTyping || !cursorContext.shouldShowSuggestions) {
                lastCursorPos = cursorPos;
                lastDocSize = docSize;
                return;
              }

              const contextText = extractContext(
                view.state.doc,
                cursorPos,
                options.previousTextLength
              );

              getSuggestion(contextText, suggestion => {
                if (!suggestion) return;

                // Re-check context in case it changed
                const updatedContext = analyzeCursorContext(
                  view.state,
                  view.state.selection.$head?.pos || 0
                );
                if (!updatedContext.shouldShowSuggestions) return;

                try {
                  const suggestionDecoration = createSuggestionDecoration(
                    view.state.selection.$head?.pos || 0,
                    suggestion
                  );

                  const decorations = DecorationSet.create(view.state.doc, [suggestionDecoration]);
                  const tr = view.state.tr;
                  tr.setMeta('addToHistory', false);
                  tr.setMeta(pluginKey, { decorations });
                  view.dispatch(tr);
                } catch (error) {
                  console.warn('Autocomplete: Error applying decoration:', error);
                }
              });

              lastCursorPos = cursorPos;
              lastDocSize = docSize;
            },
          };
        },
        props: {
          decorations(editorState) {
            return pluginKey.getState(editorState);
          },
          handleKeyDown(view, event) {
            if (!view?.state || !event) return false;

            const currentDecorations = pluginKey.getState(view.state);
            const hasSuggestion = currentDecorations && currentDecorations.find().length > 0;

            // Accept suggestion with Tab
            if (event.key === 'Tab' && hasSuggestion && currentSuggestion) {
              event.preventDefault();

              const cursorPos = view.state.selection?.$head?.pos;
              if (typeof cursorPos !== 'number') return false;

              const tr = view.state.tr;
              tr.insertText(currentSuggestion, cursorPos);
              tr.setMeta('addToHistory', true);
              tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
              currentSuggestion = null;
              view.dispatch(tr);
              return true;
            }

            // Dismiss suggestion with Escape
            if (event.key === 'Escape' && hasSuggestion) {
              event.preventDefault();
              clearSuggestions(view, pluginKey);
              currentSuggestion = null;
              return true;
            }

            // Clear suggestions on navigation keys
            const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (navigationKeys.includes(event.key) && hasSuggestion) {
              clearSuggestions(view, pluginKey);
              currentSuggestion = null;
            }

            return false;
          },
        },
        destroy() {
          cacheManager.clear();
        },
      }),
    ];
  },
});
