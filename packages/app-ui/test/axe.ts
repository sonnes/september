import axe from 'axe-core';

/**
 * The WCAG A and AA rules of axe that jsdom can run.
 *
 * jsdom has no layout, so the rules that measure color or size are off. A
 * test renders one screen without the page around it, so the rules for a
 * whole page are off too. The browser run in the change notes covers both.
 */
const OFF = [
  // These rules need layout.
  'color-contrast',
  'target-size',
  // These rules need the whole page.
  'region',
  'landmark-one-main',
  'page-has-heading-one',
  'bypass',
  'document-title',
  'html-has-lang',
];

/** Each WCAG A or AA violation in the element, as "rule: target". */
export async function axeViolations(element: Element): Promise<string[]> {
  const result = await axe.run(element, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: Object.fromEntries(OFF.map((rule) => [rule, { enabled: false }])),
  });
  return result.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`),
  );
}
