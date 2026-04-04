import { describe, expect, it } from 'vitest';

import { slideToPlainText } from './index';

describe('slideToPlainText', () => {
  it('returns empty string for empty input', () => {
    expect(slideToPlainText('')).toBe('');
    expect(slideToPlainText('   ')).toBe('');
  });

  it('strips heading markers', () => {
    expect(slideToPlainText('# Title')).toBe('Title');
    expect(slideToPlainText('## Subtitle')).toBe('Subtitle');
    expect(slideToPlainText('### H3')).toBe('H3');
    expect(slideToPlainText('#### H4')).toBe('H4');
  });

  it('strips bold and italic markers but keeps text', () => {
    expect(slideToPlainText('**bold text**')).toBe('bold text');
    expect(slideToPlainText('*italic text*')).toBe('italic text');
    expect(slideToPlainText('***bold italic***')).toBe('bold italic');
    expect(slideToPlainText('__bold__')).toBe('bold');
    expect(slideToPlainText('_italic_')).toBe('italic');
  });

  it('strips link URL but keeps anchor text', () => {
    expect(slideToPlainText('[Click here](https://example.com)')).toBe('Click here');
    expect(slideToPlainText('[Visit us](http://site.com)')).toBe('Visit us');
  });

  it('strips images entirely, keeping alt text', () => {
    expect(slideToPlainText('![A cat](cat.png)')).toBe('A cat');
    expect(slideToPlainText('![](image.png)')).toBe('');
  });

  it('strips unordered list markers', () => {
    expect(slideToPlainText('- Item one')).toBe('Item one');
    expect(slideToPlainText('* Item two')).toBe('Item two');
    expect(slideToPlainText('+ Item three')).toBe('Item three');
  });

  it('strips ordered list markers', () => {
    expect(slideToPlainText('1. First')).toBe('First');
    expect(slideToPlainText('2. Second')).toBe('Second');
  });

  it('strips blockquote markers', () => {
    expect(slideToPlainText('> A quote')).toBe('A quote');
  });

  it('removes fenced code blocks entirely', () => {
    expect(slideToPlainText('```\nconst x = 1;\n```')).toBe('');
    expect(slideToPlainText('```typescript\nfunction foo() {}\n```')).toBe('');
  });

  it('strips inline code backticks but keeps text', () => {
    expect(slideToPlainText('Use `npm install` to install')).toBe(
      'Use  to install'
    );
  });

  it('removes horizontal rules', () => {
    expect(slideToPlainText('---')).toBe('');
    expect(slideToPlainText('------')).toBe('');
  });

  it('handles a real-world slide with mixed markdown', () => {
    const input = `# The Three Bears

Once upon a time, **three bears** lived in a forest.

- Papa Bear
- Mama Bear
- Baby Bear

They went for a *walk* while their porridge cooled.`;

    const result = slideToPlainText(input);
    expect(result).toContain('The Three Bears');
    expect(result).toContain('three bears');
    expect(result).toContain('Papa Bear');
    expect(result).toContain('walk');
    expect(result).not.toContain('#');
    expect(result).not.toContain('**');
    expect(result).not.toContain('*');
    expect(result).not.toContain('-');
  });
});
