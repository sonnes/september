import { Extension } from '@tiptap/core';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const BLOCK_NODE_TYPES = [
  'paragraph',
  'heading',
  'listItem',
  // Add more block-level node types as needed
];

// This extension will be enhanced in later steps to manage action menu UI and state
const BlockActions = Extension.create({
  name: 'blockActions',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockActions'),
        state: {
          init: (_: unknown, { doc }: { doc: ProseMirrorNode }) => {
            return DecorationSet.create(doc, getBlockDecorations(doc));
          },
          apply: (tr, old, _oldState, _newState) => {
            // Recompute decorations if document changes
            if (tr.docChanged) {
              return DecorationSet.create(tr.doc, getBlockDecorations(tr.doc));
            }
            return old;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

function getBlockDecorations(doc: ProseMirrorNode): Decoration[] {
  const decorations: Decoration[] = [];
  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (BLOCK_NODE_TYPES.includes(node.type.name)) {
      decorations.push(
        Decoration.widget(
          pos,
          () => {
            const span = document.createElement('span');
            span.className = 'block-action-menu-anchor';
            span.setAttribute('data-block-action', 'true');
            // The actual menu will be rendered by React, this is just an anchor
            return span;
          },
          { side: -1 }
        )
      );
    }
  });
  return decorations;
}

export default BlockActions;
