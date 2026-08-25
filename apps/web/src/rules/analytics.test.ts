import { describe, expect, it } from 'vitest';

import { analyticsPath } from './analytics';

describe('analyticsPath', () => {
  it('reports a public page by the address a reader typed', () => {
    expect(analyticsPath('/', '/')).toBe('/');
    expect(analyticsPath('/help', '/help')).toBe('/help');
  });

  /**
   * Which guide people read is the useful thing to know, and a guide slug is
   * written by us, not by the user.
   */
  it('keeps the name of a help guide', () => {
    expect(analyticsPath('/help/$guideSlug', '/help/clone-a-voice')).toBe(
      '/help/clone-a-voice',
    );
  });

  /**
   * A space is named after the person the user talks to, and a note after
   * what they mean to say. Neither belongs in anyone's dashboard, so the
   * shape of the route is reported and the words are left on the device.
   */
  it('reports a space by its shape, never by its name', () => {
    expect(analyticsPath('/spaces/$slug/talk', '/spaces/amma/talk')).toBe(
      '/spaces/$slug/talk',
    );
    expect(
      analyticsPath(
        '/spaces/$slug/notes/$noteSlug',
        '/spaces/dr-shah/notes/what-i-need-to-ask',
      ),
    ).toBe('/spaces/$slug/notes/$noteSlug');
  });

  it('reports a screen with no name of its own as it is', () => {
    expect(analyticsPath('/dashboard', '/dashboard')).toBe('/dashboard');
    expect(analyticsPath('/spaces/new', '/spaces/new')).toBe('/spaces/new');
    expect(analyticsPath('/settings/usage', '/settings/usage')).toBe('/settings/usage');
  });

  it('keeps the name of a service, which the user did not write', () => {
    expect(
      analyticsPath('/settings/connections/$provider', '/settings/connections/openrouter'),
    ).toBe('/settings/connections/openrouter');
  });

  it('says nothing about a route it cannot name', () => {
    expect(analyticsPath(undefined, '/spaces/amma/talk')).toBe('/');
  });
});
