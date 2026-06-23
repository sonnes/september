import { readFile } from 'node:fs/promises';

import type { CSSProperties } from 'react';
import satori from 'satori';
import sharp from 'sharp';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const OG_IMAGE_CONTENT_TYPE = 'image/png';

const FONT_FAMILY = 'Noto Sans';

interface SeptemberOgImageProps {
  logoDataUri: string;
}

const styles = {
  page: {
    width: OG_IMAGE_SIZE.width,
    height: OG_IMAGE_SIZE.height,
    display: 'flex',
    backgroundColor: '#eef2ff',
    color: '#18181b',
    fontFamily: FONT_FAMILY,
    padding: 52,
  },
  card: {
    width: '100%',
    height: '100%',
    display: 'flex',
    gap: 48,
    padding: 26,
    border: '1px solid #e4e4e7',
    borderRadius: 38,
    backgroundColor: '#ffffff',
  },
  heroPanel: {
    width: 612,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '40px 38px 32px',
    borderRadius: 30,
    backgroundColor: '#4f46e5',
  },
  headline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: '#ffffff',
    fontSize: 70,
    fontWeight: 800,
    lineHeight: 0.98,
    letterSpacing: 0,
  },
  headlineAccent: {
    color: '#fbbf24',
    fontSize: 74,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 18,
    fontWeight: 500,
    lineHeight: 1.28,
  },
  brandPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingRight: 18,
  },
  logoTile: {
    width: 334,
    height: 334,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #e4e4e7',
    borderRadius: 44,
    backgroundColor: '#f8fafc',
  },
  logoHalo: {
    width: 256,
    height: 256,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#e0e7ff',
  },
  logoCore: {
    width: 198,
    height: 198,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 190,
    height: 190,
  },
  pills: {
    display: 'flex',
    gap: 12,
    marginTop: -42,
  },
  pill: {
    display: 'flex',
    padding: '7px 22px',
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: 800,
  },
  amberPill: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  brandName: {
    color: '#4f46e5',
    fontSize: 50,
    fontWeight: 800,
    lineHeight: 1,
  },
} satisfies Record<string, CSSProperties>;

function fontBufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function readAsset(path: string): Promise<Buffer> {
  return readFile(path);
}

async function readLogoDataUri(): Promise<string> {
  const logo = await readAsset('public/logo.png');
  return `data:image/png;base64,${logo.toString('base64')}`;
}

async function readFonts(): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 500 | 800; style: 'normal' }>
> {
  const [regular, bold] = await Promise.all([
    readAsset('node_modules/@fontsource/noto-sans/files/noto-sans-latin-500-normal.woff'),
    readAsset('node_modules/@fontsource/noto-sans/files/noto-sans-latin-800-normal.woff'),
  ]);

  return [
    { name: FONT_FAMILY, data: fontBufferToArrayBuffer(regular), weight: 500, style: 'normal' },
    { name: FONT_FAMILY, data: fontBufferToArrayBuffer(bold), weight: 800, style: 'normal' },
  ];
}

export function SeptemberOgImage({ logoDataUri }: SeptemberOgImageProps) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.heroPanel}>
          <div style={styles.headline}>
            <div style={styles.headlineAccent}>Faster</div>
            <div>Communication</div>
            <div style={styles.headlineAccent}>Fewer</div>
            <div>Keystrokes</div>
          </div>

          <div style={styles.body}>
            <div>A communication assistant for ALS, MND,</div>
            <div>and speech &amp; motor difficulties</div>
          </div>
        </div>

        <div style={styles.brandPanel}>
          <div style={styles.logoTile}>
            <div style={styles.logoHalo}>
              <div style={styles.logoCore}>
                <img src={logoDataUri} alt="" style={styles.logo} />
              </div>
            </div>
          </div>

          <div style={styles.pills}>
            <div style={styles.pill}>Talk</div>
            <div style={{ ...styles.pill, ...styles.amberPill }}>Speak</div>
            <div style={styles.pill}>Share</div>
          </div>

          <div style={styles.brandName}>september</div>
        </div>
      </div>
    </div>
  );
}

export async function renderOgImageSvg(): Promise<string> {
  return satori(<SeptemberOgImage logoDataUri={await readLogoDataUri()} />, {
    ...OG_IMAGE_SIZE,
    fonts: await readFonts(),
  });
}

export async function renderOgImagePng(): Promise<Buffer> {
  const svg = await renderOgImageSvg();
  return sharp(Buffer.from(svg)).png().toBuffer();
}
