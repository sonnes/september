import { existsSync } from 'node:fs';

import { expect, it } from 'vitest';

import { HELP_GUIDES, type HelpMedia } from '@september/core/rules/help/catalog';

import { SHARED_PUBLIC } from '../../../vite.shared.ts';

const pathsOf = (media: HelpMedia): (string | undefined)[] =>
  media.type === 'screenshot' ? [media.src] : [media.src, media.captionsSrc, media.posterSrc];

it('serves every file that a Help guide names', () => {
  const named = HELP_GUIDES.flatMap(guide => [
    ...(guide.media ?? []),
    ...(guide.alternatives ?? []).flatMap(alternative => alternative.media ?? []),
  ])
    .flatMap(pathsOf)
    .filter((path): path is string => Boolean(path));

  expect(named.length).toBeGreaterThan(0);
  expect(named.filter(path => !existsSync(`${SHARED_PUBLIC}${path.slice(1)}`))).toEqual([]);
});
