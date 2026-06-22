import { describe, expect, it } from 'vitest';

import { getNavigationData } from './app-sidebar';

describe('getNavigationData', () => {
  it('includes Notes in main navigation', () => {
    expect(
      getNavigationData().navMain.map(item => ({ title: item.title, url: item.url }))
    ).toContainEqual({
      title: 'Notes',
      url: '/notes',
    });
  });

  it('includes Help in main navigation', () => {
    expect(
      getNavigationData().navMain.map(item => ({ title: item.title, url: item.url }))
    ).toContainEqual({
      title: 'Help',
      url: '/help',
    });
  });
});
