import React from 'react';

import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const fontFile = name =>
  readFile(fileURLToPath(new URL(`../node_modules/@fontsource/${name}.woff`, import.meta.url)));

const [font, bodyFont, bodyBoldFont] = await Promise.all([
  fontFile('lexend/files/lexend-latin-700-normal'),
  fontFile('noto-sans/files/noto-sans-latin-400-normal'),
  fontFile('noto-sans/files/noto-sans-latin-700-normal'),
]);

// The mark is an inverted keycap: an indigo housing around a white face. It is
// drawn at two sizes — the icon, and the mark on the share card — so the shape
// lives in one place and the sizes stay in proportion.
const keycap = size => {
  const unit = size / 500;
  return React.createElement(
    'div',
    {
      style: {
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    React.createElement(
      'div',
      {
        style: {
          width: 440 * unit,
          height: 440 * unit,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `${7 * unit}px solid #4338ca`,
          borderRadius: 96 * unit,
          backgroundColor: '#4f46e5',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: 374 * unit,
            height: 374 * unit,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `${11 * unit}px solid #c7d2fe`,
            borderRadius: 70 * unit,
            backgroundColor: '#ffffff',
            color: '#4f46e5',
            fontFamily: 'Lexend',
            fontSize: 176 * unit,
            fontWeight: 700,
            letterSpacing: -14 * unit,
          },
        },
        'Sep'
      )
    )
  );
};

// ------------------------------------------------------------ share card
//
// The card a link preview shows. It repeats the hero of the landing page —
// the same solid indigo and two white lines — so a shared
// link and the page behind it read as one thing.

const WORDMARK = [
  ['Sep', '#ffffff'],
  ['tember', '#c7d2fe'],
];

const TAGLINE = [
  [
    ['Faster', '#ffffff'],
    ['Communication', '#ffffff'],
  ],
  [
    ['Fewer', '#ffffff'],
    ['Keystrokes', '#ffffff'],
  ],
];

// Each word is its own box, and a box eats the space beside it, so the gap
// between the accent word and the rest is set rather than typed.
const WORD_GAP = 22;

const text = (content, style) =>
  React.createElement('span', { style: { display: 'flex', ...style } }, content);

const row = (children, style = {}) =>
  React.createElement('div', { style: { display: 'flex', ...style } }, children);

export async function generateShareCard(page, destination) {
  const shareCardSvg = await satori(
    row(
      [
        row(
          [
            row(
              [
                keycap(76),
                row(
                  WORDMARK.map(([part, color]) =>
                    text(part, { color, fontFamily: 'Lexend', fontSize: 44, fontWeight: 700 })
                  )
                ),
              ],
              { alignItems: 'center', gap: 18 }
            ),
            text('Free & open source', {
              color: '#ffffff',
              fontFamily: 'Noto Sans',
              fontSize: 22,
              fontWeight: 700,
              padding: '10px 22px',
              borderRadius: 999,
              border: '2px solid rgba(255,255,255,0.25)',
              backgroundColor: 'rgba(255,255,255,0.12)',
            }),
          ],
          { alignItems: 'center', justifyContent: 'space-between' }
        ),

        page
          ? text(page.heading, {
              color: '#ffffff',
              fontFamily: 'Noto Sans',
              fontSize: 66,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.12,
            })
          : row(
              TAGLINE.map(line =>
                row(
                  line.map(([part, color]) =>
                    text(part, {
                      color,
                      fontFamily: 'Noto Sans',
                      fontSize: 78,
                      fontWeight: 700,
                      letterSpacing: -2,
                    })
                  ),
                  { gap: WORD_GAP }
                )
              ),
              { flexDirection: 'column', lineHeight: 1.12 }
            ),

        text(
          page?.description ??
            'A communication assistant for people living with ALS, MND, and other speech & motor difficulties.',
          {
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'Noto Sans',
            fontSize: 30,
            lineHeight: 1.45,
            maxWidth: 900,
          }
        ),
      ],
      {
        width: 1200,
        height: 630,
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        backgroundColor: '#4f46e5',
      }
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Lexend', data: font, weight: 700, style: 'normal' },
        { name: 'Noto Sans', data: bodyFont, weight: 400, style: 'normal' },
        { name: 'Noto Sans', data: bodyBoldFont, weight: 700, style: 'normal' },
      ],
    }
  );

  await sharp(Buffer.from(shareCardSvg)).png().toFile(destination);
}

// Importing the renderer during a build must not rewrite committed icons.
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'))
) {
  const logoSvg = await satori(keycap(500), {
    width: 500,
    height: 500,
    fonts: [{ name: 'Lexend', data: font, weight: 700, style: 'normal' }],
  });

  const titledLogoSvg = logoSvg.replace(/(<svg[^>]*>)/, '$1<title>September</title>');
  const logoSvgPath = `${publicDir}/logo.svg`;
  await writeFile(logoSvgPath, titledLogoSvg);

  const targets = [
    ['logo.png', 500],
    ['favicon-16x16.png', 16],
    ['favicon-32x32.png', 32],
    ['apple-touch-icon.png', 180],
    ['android-chrome-192x192.png', 192],
    ['android-chrome-512x512.png', 512],
  ];

  await Promise.all(
    targets.map(([filename, size]) =>
      sharp(Buffer.from(titledLogoSvg)).resize(size, size).png().toFile(`${publicDir}/${filename}`)
    )
  );

  await generateShareCard(null, `${publicDir}/og.png`);
}
