import React from 'react';

import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const fontPath = fileURLToPath(
  new URL('../node_modules/@fontsource/lexend/files/lexend-latin-700-normal.woff', import.meta.url)
);
const font = await readFile(fontPath);

const logoSvg = await satori(
  React.createElement(
    'div',
    {
      style: {
        width: 500,
        height: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    React.createElement(
      'div',
      {
        style: {
          width: 440,
          height: 440,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '7px solid #4338ca',
          borderRadius: 96,
          backgroundColor: '#4f46e5',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: 374,
            height: 374,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '11px solid #c7d2fe',
            borderRadius: 70,
            backgroundColor: '#ffffff',
            color: '#4f46e5',
            fontFamily: 'Lexend',
            fontSize: 176,
            fontWeight: 700,
            letterSpacing: -14,
          },
        },
        'Sep'
      )
    )
  ),
  {
    width: 500,
    height: 500,
    fonts: [{ name: 'Lexend', data: font, weight: 700, style: 'normal' }],
  }
);

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
