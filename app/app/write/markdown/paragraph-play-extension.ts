// Custom Paragraph Node Extension with Play Button
// Usage: Import and add to Tiptap editor extensions list
import { Node, mergeAttributes } from '@tiptap/core';
import Paragraph from '@tiptap/extension-paragraph';
import { ReactNodeViewRenderer } from '@tiptap/react';

import ParagraphPlayNodeView from './paragraph-play-nodeview';

const ParagraphPlayExtension = Paragraph.extend({
  name: 'paragraphPlay',

  content: 'inline*',

  addNodeView() {
    return ReactNodeViewRenderer(ParagraphPlayNodeView, {
      // Optionally pass props or context here
    });
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes), 0];
  },
});

export default ParagraphPlayExtension;
