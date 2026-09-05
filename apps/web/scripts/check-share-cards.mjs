import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import sharp from 'sharp';

const dist = new URL('../dist/', import.meta.url);

test('built public pages have distinct metadata and real 1200×630 PNG cards', async () => {
  const files = (await readdir(dist, { recursive: true })).filter(file =>
    /(^|\/)index.html$/.test(file)
  );
  assert.ok(files.length >= 4);
  const images = new Set();
  const titles = new Set();
  for (const file of files) {
    const doc = new JSDOM(await readFile(new URL(file, dist), 'utf8')).window.document;
    const meta = key => doc.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.content;
    const path = file === 'index.html' ? '/' : `/${file.replace(/\/index.html$/, '')}`;
    assert.equal(meta('og:url'), `https://september.to${path}`, file);
    assert.equal(doc.querySelector('link[rel="canonical"]')?.href, meta('og:url'), file);
    assert.equal(meta('twitter:title'), meta('og:title'));
    assert.equal(meta('twitter:description'), meta('og:description'));
    assert.equal(meta('description'), meta('og:description'));
    assert.equal(meta('twitter:image'), meta('og:image'));
    assert.ok(meta('og:image:alt'));
    const image = new URL(meta('og:image'));
    const buffer = await readFile(new URL(`.${image.pathname}`, dist));
    const info = await sharp(buffer).metadata();
    assert.equal(info.format, 'png', file);
    assert.equal(info.width, 1200, file);
    assert.equal(info.height, 630, file);
    assert.ok(buffer.length < 1_000_000, file);
    images.add(image.href);
    titles.add(meta('og:title'));
  }
  assert.equal(images.size, files.length);
  assert.equal(titles.size, files.length);
});

test('crawler rules allow public assets and the legacy OG URL redirects to an image', async () => {
  const robots = await readFile(new URL('robots.txt', dist), 'utf8');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \/\s/);
  assert.doesNotMatch(robots, /api\/og|Disallow: \*/);
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.ok(
    config.redirects.some(rule => rule.source === '/api/og' && rule.destination === '/og.png')
  );
});
