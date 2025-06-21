import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Custom Tiptap extension for Obsidian-style syntax highlighting
 * Applies CSS classes to markdown syntax characters while keeping them visible but dimmed
 */
export const ObsidianSyntaxHighlight = Extension.create({
  name: 'obsidianSyntaxHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('obsidianSyntaxHighlight'),

        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const doc = state.doc;

            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const text = node.text;
                let offset = 0;

                // Header syntax highlighting (# ## ### etc.)
                const headerMatches = text.matchAll(/^(#{1,6})\s/gm);
                for (const match of headerMatches) {
                  const start = pos + 1 + offset + match.index!;
                  const end = start + match[1].length;
                  decorations.push(
                    Decoration.inline(start, end, {
                      class: 'markdown-syntax markdown-header-syntax',
                    })
                  );
                }

                // Bold syntax highlighting (**text**)
                const boldMatches = text.matchAll(/(\*\*)(.*?)(\*\*)/g);
                for (const match of boldMatches) {
                  const start = pos + 1 + offset + match.index!;
                  // Opening **
                  decorations.push(
                    Decoration.inline(start, start + 2, {
                      class: 'markdown-syntax markdown-bold-syntax',
                    })
                  );
                  // Closing **
                  decorations.push(
                    Decoration.inline(start + match[0].length - 2, start + match[0].length, {
                      class: 'markdown-syntax markdown-bold-syntax',
                    })
                  );
                }

                // Italic syntax highlighting (*text* or _text_)
                const italicMatches = text.matchAll(/([*_])(.*?)([*_])/g);
                for (const match of italicMatches) {
                  // Skip if it's part of bold syntax (**)
                  if (match[1] === '*' && text[match.index! - 1] === '*') continue;
                  if (match[3] === '*' && text[match.index! + match[0].length] === '*') continue;

                  const start = pos + 1 + offset + match.index!;
                  // Opening * or _
                  decorations.push(
                    Decoration.inline(start, start + 1, {
                      class: 'markdown-syntax markdown-italic-syntax',
                    })
                  );
                  // Closing * or _
                  decorations.push(
                    Decoration.inline(start + match[0].length - 1, start + match[0].length, {
                      class: 'markdown-syntax markdown-italic-syntax',
                    })
                  );
                }

                // Link syntax highlighting ([text](url))
                const linkMatches = text.matchAll(/(\[)(.*?)(\])(\()(.*?)(\))/g);
                for (const match of linkMatches) {
                  const start = pos + 1 + offset + match.index!;
                  // Opening [
                  decorations.push(
                    Decoration.inline(start, start + 1, {
                      class: 'markdown-syntax markdown-link-syntax',
                    })
                  );
                  // Closing ]
                  decorations.push(
                    Decoration.inline(
                      start + match[1].length + match[2].length,
                      start + match[1].length + match[2].length + 1,
                      {
                        class: 'markdown-syntax markdown-link-syntax',
                      }
                    )
                  );
                  // Opening (
                  decorations.push(
                    Decoration.inline(
                      start + match[1].length + match[2].length + match[3].length,
                      start + match[1].length + match[2].length + match[3].length + 1,
                      {
                        class: 'markdown-syntax markdown-link-syntax',
                      }
                    )
                  );
                  // Closing )
                  decorations.push(
                    Decoration.inline(start + match[0].length - 1, start + match[0].length, {
                      class: 'markdown-syntax markdown-link-syntax',
                    })
                  );
                }

                // List syntax highlighting (- or 1. 2. etc.)
                const unorderedListMatches = text.matchAll(/^(\s*)([-*+])(\s)/gm);
                for (const match of unorderedListMatches) {
                  const start = pos + 1 + offset + match.index! + match[1].length;
                  const end = start + match[2].length;
                  decorations.push(
                    Decoration.inline(start, end, {
                      class: 'markdown-syntax markdown-list-syntax',
                    })
                  );
                }

                const orderedListMatches = text.matchAll(/^(\s*)(\d+\.)(\s)/gm);
                for (const match of orderedListMatches) {
                  const start = pos + 1 + offset + match.index! + match[1].length;
                  const end = start + match[2].length;
                  decorations.push(
                    Decoration.inline(start, end, {
                      class: 'markdown-syntax markdown-list-syntax',
                    })
                  );
                }

                // Code syntax highlighting (`code`)
                const codeMatches = text.matchAll(/(`)(.*?)(`)/g);
                for (const match of codeMatches) {
                  const start = pos + 1 + offset + match.index!;
                  // Opening `
                  decorations.push(
                    Decoration.inline(start, start + 1, {
                      class: 'markdown-syntax markdown-code-syntax',
                    })
                  );
                  // Closing `
                  decorations.push(
                    Decoration.inline(start + match[0].length - 1, start + match[0].length, {
                      class: 'markdown-syntax markdown-code-syntax',
                    })
                  );
                }

                // Strikethrough syntax highlighting (~~text~~)
                const strikethroughMatches = text.matchAll(/(~~)(.*?)(~~)/g);
                for (const match of strikethroughMatches) {
                  const start = pos + 1 + offset + match.index!;
                  // Opening ~~
                  decorations.push(
                    Decoration.inline(start, start + 2, {
                      class: 'markdown-syntax markdown-strikethrough-syntax',
                    })
                  );
                  // Closing ~~
                  decorations.push(
                    Decoration.inline(start + match[0].length - 2, start + match[0].length, {
                      class: 'markdown-syntax markdown-strikethrough-syntax',
                    })
                  );
                }

                // Blockquote syntax highlighting (>)
                const blockquoteMatches = text.matchAll(/^(\s*)(>)(\s)/gm);
                for (const match of blockquoteMatches) {
                  const start = pos + 1 + offset + match.index! + match[1].length;
                  const end = start + match[2].length;
                  decorations.push(
                    Decoration.inline(start, end, {
                      class: 'markdown-syntax markdown-blockquote-syntax',
                    })
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
