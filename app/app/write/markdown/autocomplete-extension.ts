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

export interface AutocompleteOptions {
  applySuggestionKey: string;
  suggestionDebounce: number;
  previousTextLength: number;
  getSuggestion?: (previousText: string) => Promise<string | null>;
}

interface CursorContext {
  shouldShowSuggestions: boolean;
  isAtLineEnd: boolean;
  isAfterWhitespace: boolean;
  isInCodeBlock: boolean;
  hasTextBefore: boolean;
  wordContext: string;
}

function analyzeCursorContext(state: any, cursorPos: number): CursorContext {
  try {
    // Edge case: Invalid state or cursor position
    if (!state || !state.doc || !state.selection) {
      console.warn('Autocomplete: Invalid state in analyzeCursorContext');
      return {
        shouldShowSuggestions: false,
        isAtLineEnd: false,
        isAfterWhitespace: false,
        isInCodeBlock: false,
        hasTextBefore: false,
        wordContext: '',
      };
    }

    if (typeof cursorPos !== 'number' || cursorPos < 0) {
      console.warn('Autocomplete: Invalid cursor position in analyzeCursorContext');
      return {
        shouldShowSuggestions: false,
        isAtLineEnd: false,
        isAfterWhitespace: false,
        isInCodeBlock: false,
        hasTextBefore: false,
        wordContext: '',
      };
    }

    const doc = state.doc;
    const selection = state.selection;

    // Edge case: Cursor position beyond document
    if (cursorPos > doc.content.size) {
      console.warn('Autocomplete: Cursor position beyond document size');
      return {
        shouldShowSuggestions: false,
        isAtLineEnd: false,
        isAfterWhitespace: false,
        isInCodeBlock: false,
        hasTextBefore: false,
        wordContext: '',
      };
    }

    // Basic checks with error handling
    const hasSelectionRange = !selection.empty;
    const nextNode = doc.nodeAt(cursorPos);
    const isAtDocEnd = cursorPos >= doc.content.size;

    // Get surrounding text context with error handling
    let beforeText = '';
    let afterText = '';

    try {
      beforeText = doc.textBetween(Math.max(0, cursorPos - 100), cursorPos, ' ') || '';
      afterText = doc.textBetween(cursorPos, Math.min(doc.content.size, cursorPos + 10), ' ') || '';
    } catch (error) {
      console.warn('Autocomplete: Error extracting text context:', error);
      beforeText = '';
      afterText = '';
    }

    // Analyze text context with safety checks
    const isAfterWhitespace = beforeText.length > 0 && /\s$/.test(beforeText);
    const isAtLineEnd = afterText.startsWith('\n') || isAtDocEnd;
    const hasTextBefore = beforeText.trim().length > 0;

    // Get the current word being typed with error handling
    let wordContext = '';
    try {
      const wordMatch = beforeText.match(/(\S+)$/);
      wordContext = wordMatch ? wordMatch[1] : '';
    } catch (error) {
      console.warn('Autocomplete: Error extracting word context:', error);
      wordContext = '';
    }

    // Check if we're in a code block (simple detection) with error handling
    let isInCodeBlock = false;
    try {
      const codeBlockCount = (beforeText.match(/```/g) || []).length;
      isInCodeBlock = codeBlockCount % 2 === 1; // Odd number means we're inside a code block
    } catch (error) {
      console.warn('Autocomplete: Error detecting code block:', error);
      isInCodeBlock = false;
    }

    // Determine if suggestions should be shown with additional safety checks
    const shouldShowSuggestions =
      !hasSelectionRange && // No text selected
      !isInCodeBlock && // Not in code block
      hasTextBefore && // Has some content before cursor
      (isAtLineEnd || !nextNode || nextNode.isBlock) && // At end of line/block
      wordContext.length >= 2 && // Has meaningful word context
      wordContext.length <= 50; // Reasonable word length limit

    return {
      shouldShowSuggestions,
      isAtLineEnd,
      isAfterWhitespace,
      isInCodeBlock,
      hasTextBefore,
      wordContext,
    };
  } catch (error) {
    console.error('Autocomplete: Unexpected error in analyzeCursorContext:', error);
    return {
      shouldShowSuggestions: false,
      isAtLineEnd: false,
      isAfterWhitespace: false,
      isInCodeBlock: false,
      hasTextBefore: false,
      wordContext: '',
    };
  }
}

function createSuggestionDecoration(cursorPos: number, suggestion: string, context: CursorContext) {
  return Decoration.widget(
    cursorPos,
    () => {
      const ghostContainer = document.createElement('span');
      ghostContainer.className = 'autocomplete-suggestion-container';

      const ghostText = document.createElement('span');
      ghostText.className = 'autocomplete-suggestion-ghost';

      // Smart spacing based on context
      let displayText = suggestion;
      if (
        !context.isAfterWhitespace &&
        context.hasTextBefore &&
        !context.wordContext.endsWith(' ')
      ) {
        displayText = ' ' + suggestion;
      }

      ghostText.textContent = displayText;

      // Context-aware styling
      const opacity = context.isInCodeBlock ? '0.3' : '0.5';
      const color = context.isInCodeBlock ? '#999' : '#666';

      ghostText.style.cssText = `
        opacity: ${opacity};
        color: ${color};
        pointer-events: none;
        user-select: none;
        font-style: italic;
        position: relative;
        font-family: inherit;
      `;

      ghostContainer.appendChild(ghostText);
      return ghostContainer;
    },
    {
      side: 1,
      marks: [],
      stopEvent: () => true,
    }
  );
}

function shouldClearSuggestions(
  hasExistingSuggestion: boolean,
  cursorContext: CursorContext,
  cursorPos: number,
  selectionSize: number,
  docSize: number,
  lastCursorPos: number,
  lastSelectionSize: number,
  lastDocSize: number,
  prevState: any
): boolean {
  if (!hasExistingSuggestion) {
    return false;
  }

  // Clear if cursor context is inappropriate
  if (!cursorContext.shouldShowSuggestions) {
    return true;
  }

  // Clear if selection has changed (user selected text)
  if (selectionSize !== lastSelectionSize && selectionSize > 0) {
    return true;
  }

  // Clear if cursor moved significantly (not just forward typing)
  const cursorMoved = lastCursorPos !== -1 && Math.abs(cursorPos - lastCursorPos) > 1;
  const isBackwardMovement = lastCursorPos !== -1 && cursorPos < lastCursorPos;

  if (cursorMoved && (isBackwardMovement || Math.abs(cursorPos - lastCursorPos) > 5)) {
    return true;
  }

  // Clear if document size decreased (deletion occurred)
  if (lastDocSize !== -1 && docSize < lastDocSize) {
    return true;
  }

  // Clear if document changed but cursor didn't advance appropriately
  if (prevState && prevState.doc && docSize !== lastDocSize) {
    const expectedCursorAdvance = docSize - lastDocSize;
    const actualCursorAdvance = cursorPos - lastCursorPos;

    // If cursor didn't advance as expected, likely content was inserted elsewhere
    if (Math.abs(expectedCursorAdvance - actualCursorAdvance) > 1) {
      return true;
    }
  }

  return false;
}

function clearSuggestions(
  view: any,
  pluginKey: PluginKey<DecorationSet>,
  currentSuggestionRef?: { current: string | null }
) {
  const tr = view.state.tr;
  tr.setMeta('addToHistory', false);
  tr.setMeta(pluginKey, { decorations: DecorationSet.empty });

  if (currentSuggestionRef) {
    currentSuggestionRef.current = null;
  }

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
    let currentRequestId = 0;
    let currentSuggestion: string | null = null;

    const getSuggestion = debounce(
      async (previousText: string, cb: (suggestion: string | null) => void) => {
        try {
          // Generate request ID for this request
          const requestId = ++currentRequestId;

          // Edge case: No suggestion function provided
          if (!options.getSuggestion) {
            cb(null);
            return;
          }

          // Edge case: Empty or too short text
          const cleanText = previousText?.trim() || '';
          if (cleanText.length < 3) {
            cb(null);
            return;
          }

          // Edge case: Text too long (could cause performance issues)
          if (cleanText.length > 10000) {
            console.warn('Autocomplete: Text too long, truncating for suggestion generation');
            previousText = cleanText.slice(-options.previousTextLength);
          }

          // Edge case: Check for rate limiting or too many concurrent requests
          if (currentRequestId - requestId > 5) {
            console.warn('Autocomplete: Too many pending requests, skipping');
            cb(null);
            return;
          }

          // Add timeout to prevent hanging requests
          const timeoutPromise = new Promise<string | null>((_, reject) => {
            setTimeout(() => reject(new Error('Suggestion request timeout')), 10000);
          });

          // Make the request with timeout
          const suggestion = await Promise.race([
            options.getSuggestion(previousText),
            timeoutPromise,
          ]);

          // Edge case: Invalid suggestion response
          if (
            suggestion !== null &&
            (typeof suggestion !== 'string' || suggestion.trim().length === 0)
          ) {
            console.warn('Autocomplete: Invalid suggestion received:', suggestion);
            cb(null);
            return;
          }

          // Edge case: Suggestion too long
          if (suggestion && suggestion.length > 500) {
            console.warn('Autocomplete: Suggestion too long, truncating');
            const truncatedSuggestion = suggestion.slice(0, 500) + '...';
            cb(truncatedSuggestion);
            return;
          }

          // Only proceed with callback if this is still the latest request
          if (requestId === currentRequestId) {
            currentSuggestion = suggestion;
            cb(suggestion);
          }
        } catch (error) {
          // Enhanced error handling for different error types
          if (error instanceof Error) {
            if (error.message.includes('timeout')) {
              console.warn('Autocomplete: Request timed out');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
              console.warn('Autocomplete: Network error occurred');
            } else {
              console.error('Autocomplete: Unexpected error:', error.message);
            }
          } else {
            console.error('Autocomplete: Unknown error occurred:', error);
          }

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
              // Update the decoration state based on the async data
              const { decorations } = tr.getMeta(pluginKey);
              return decorations;
            }
            return tr.docChanged ? oldValue.map(tr.mapping, tr.doc) : oldValue;
          },
        },
        view() {
          let lastCursorPos = -1;
          let lastSelectionSize = -1;
          let lastDocSize = -1;
          const currentSuggestionRef = { current: currentSuggestion };

          return {
            update(view, prevState) {
              try {
                // Edge case: Invalid view state
                if (!view || !view.state || !view.state.selection) {
                  console.warn('Autocomplete: Invalid view state');
                  return;
                }

                const selection = view.state.selection;
                const cursorPos = selection.$head?.pos;

                // Edge case: Invalid cursor position
                if (typeof cursorPos !== 'number' || cursorPos < 0) {
                  console.warn('Autocomplete: Invalid cursor position');
                  return;
                }

                const selectionSize = selection.to - selection.from;
                const docSize = view.state.doc?.content?.size;

                // Edge case: Invalid document
                if (typeof docSize !== 'number') {
                  console.warn('Autocomplete: Invalid document state');
                  return;
                }

                const currentDecorations = pluginKey.getState(view.state);
                const hasExistingSuggestion = Boolean(
                  currentDecorations && currentDecorations.find().length > 0
                );

                // Enhanced cursor position detection with error handling
                let cursorContext;
                try {
                  cursorContext = analyzeCursorContext(view.state, cursorPos);
                } catch (error) {
                  console.warn('Autocomplete: Error analyzing cursor context:', error);
                  // Fallback context
                  cursorContext = {
                    shouldShowSuggestions: false,
                    isAtLineEnd: false,
                    isAfterWhitespace: false,
                    isInCodeBlock: false,
                    hasTextBefore: false,
                    wordContext: '',
                  };
                }

                // Detect if this update is from typing (text insertion)
                const isTypingEvent =
                  prevState &&
                  docSize > lastDocSize && // Document grew
                  cursorPos > lastCursorPos && // Cursor moved forward
                  cursorPos - lastCursorPos === docSize - lastDocSize && // Cursor advance matches doc growth
                  selectionSize === 0; // No selection (not pasting)

                // Comprehensive suggestion clearing logic
                const shouldClear = shouldClearSuggestions(
                  hasExistingSuggestion,
                  cursorContext,
                  cursorPos,
                  selectionSize,
                  docSize,
                  lastCursorPos,
                  lastSelectionSize,
                  lastDocSize,
                  prevState
                );

                if (shouldClear) {
                  clearSuggestions(view, pluginKey, currentSuggestionRef);
                  currentSuggestion = null; // Also update the main variable
                  // Update tracking variables
                  lastCursorPos = cursorPos;
                  lastSelectionSize = selectionSize;
                  lastDocSize = docSize;
                  return;
                }

                // Update tracking variables for next iteration
                lastCursorPos = cursorPos;
                lastSelectionSize = selectionSize;
                lastDocSize = docSize;

                // Only fetch suggestions if:
                // 1. This is a typing event (user is actively typing)
                // 2. Cursor context is appropriate for suggestions
                if (!isTypingEvent || !cursorContext.shouldShowSuggestions) {
                  return;
                }

                // fetch a new suggestion with enhanced context
                let previousText;
                try {
                  previousText = view.state.doc
                    .textBetween(0, view.state.doc.content.size, ' ')
                    .slice(-options.previousTextLength);
                } catch (error) {
                  console.warn('Autocomplete: Error extracting text:', error);
                  return;
                }

                getSuggestion(previousText, suggestion => {
                  try {
                    if (!suggestion || !suggestion.trim()) return;

                    const updatedState = view.state;

                    // Edge case: State changed while waiting for suggestion
                    if (!updatedState || !updatedState.selection || !updatedState.selection.$head) {
                      console.warn('Autocomplete: State changed during suggestion');
                      return;
                    }

                    const currentCursorPos = updatedState.selection.$head.pos;

                    // re-analyze cursor context to ensure it's still valid
                    let currentContext;
                    try {
                      currentContext = analyzeCursorContext(updatedState, currentCursorPos);
                    } catch (error) {
                      console.warn('Autocomplete: Error re-analyzing context:', error);
                      return;
                    }

                    if (!currentContext.shouldShowSuggestions) {
                      return;
                    }

                    // Enhanced suggestion placement with context awareness
                    let suggestionDecoration;
                    try {
                      suggestionDecoration = createSuggestionDecoration(
                        currentCursorPos,
                        suggestion,
                        currentContext
                      );
                    } catch (error) {
                      console.warn('Autocomplete: Error creating decoration:', error);
                      return;
                    }

                    try {
                      const decorations = DecorationSet.create(updatedState.doc, [
                        suggestionDecoration,
                      ]);
                      const tr = view.state.tr;
                      tr.setMeta('addToHistory', false);
                      tr.setMeta(pluginKey, { decorations });
                      view.dispatch(tr);
                    } catch (error) {
                      console.warn('Autocomplete: Error applying decoration:', error);
                    }
                  } catch (error) {
                    console.error('Autocomplete: Error in suggestion callback:', error);
                  }
                });
              } catch (error) {
                console.error('Autocomplete: Error in update function:', error);
              }
            },
          };
        },
        props: {
          decorations(editorState) {
            return pluginKey.getState(editorState);
          },
          handleKeyDown(view, event) {
            try {
              // Edge case: Invalid view or event
              if (!view || !view.state || !event) {
                console.warn('Autocomplete: Invalid view or event in handleKeyDown');
                return false;
              }

              const currentDecorations = pluginKey.getState(view.state);
              const hasSuggestion = currentDecorations && currentDecorations.find().length > 0;

              // Handle Tab key for suggestion acceptance
              if (event.key === options.applySuggestionKey || event.key === 'Tab') {
                if (hasSuggestion && currentSuggestion) {
                  try {
                    event.preventDefault();

                    const cursorPos = view.state.selection?.$head?.pos;

                    // Edge case: Invalid cursor position during acceptance
                    if (typeof cursorPos !== 'number') {
                      console.warn('Autocomplete: Invalid cursor position during acceptance');
                      return false;
                    }

                    // Edge case: Suggestion content validation
                    if (typeof currentSuggestion !== 'string' || currentSuggestion.length === 0) {
                      console.warn('Autocomplete: Invalid suggestion content');
                      clearSuggestions(view, pluginKey);
                      currentSuggestion = null;
                      return false;
                    }

                    // Insert the suggestion text at cursor position
                    const tr = view.state.tr;
                    tr.insertText(currentSuggestion, cursorPos);

                    // Clear the decoration and stored suggestion
                    tr.setMeta('addToHistory', true); // This should be part of history
                    tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
                    currentSuggestion = null;

                    // Apply the transaction
                    view.dispatch(tr);

                    return true; // Event handled
                  } catch (error) {
                    console.error('Autocomplete: Error accepting suggestion:', error);
                    // Clean up on error
                    clearSuggestions(view, pluginKey);
                    currentSuggestion = null;
                    return false;
                  }
                }
              }

              // Handle Escape key to dismiss suggestions
              if (event.key === 'Escape') {
                if (hasSuggestion) {
                  event.preventDefault();
                  clearSuggestions(view, pluginKey);
                  currentSuggestion = null;
                  return true; // Event handled
                }
              }

              // Clear suggestions on certain navigation keys
              const navigationKeys = [
                'ArrowUp',
                'ArrowDown',
                'ArrowLeft',
                'ArrowRight',
                'Home',
                'End',
                'PageUp',
                'PageDown',
              ];
              if (navigationKeys.includes(event.key) && hasSuggestion) {
                // Clear suggestions on navigation (they'll be regenerated if appropriate)
                clearSuggestions(view, pluginKey);
                currentSuggestion = null;
              }

              // Clear suggestions on delete/backspace (handled by update logic but good to be explicit)
              if ((event.key === 'Backspace' || event.key === 'Delete') && hasSuggestion) {
                clearSuggestions(view, pluginKey);
                currentSuggestion = null;
              }

              return false; // Event not handled
            } catch (error) {
              console.error('Autocomplete: Error in handleKeyDown:', error);
              // Clean up on any error
              try {
                clearSuggestions(view, pluginKey);
                currentSuggestion = null;
              } catch (cleanupError) {
                console.error('Autocomplete: Error during cleanup:', cleanupError);
              }
              return false;
            }
          },
        },
      }),
    ];
  },
});
