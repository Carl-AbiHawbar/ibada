import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'IBADA — Pest free living';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const photo = await readFile(path.join(process.cwd(), 'assets/source/one-full.png'));
  const src = `data:image/png;base64,${photo.toString('base64')}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #012755 0%, #0a3a73 60%, #0693E6 140%)',
          padding: 60,
          gap: 40,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, color: 'white' }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, letterSpacing: 12 }}>IBADA</div>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginTop: 36 }}>PEST FREE LIVING</div>
          <div style={{ display: 'flex', fontSize: 34, marginTop: 20, color: '#BFE3FA' }}>One device. A calmer home.</div>
          <div
            style={{
              display: 'flex',
              marginTop: 40,
              fontSize: 26,
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 999,
              padding: '10px 24px',
              alignSelf: 'flex-start',
            }}
          >
            Cash on delivery · Lebanon
          </div>
        </div>
        <div style={{ display: 'flex', width: 440, height: 440, borderRadius: 40, background: 'white', padding: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={392} height={392} alt="" style={{ objectFit: 'contain' }} />
        </div>
      </div>
    ),
    size,
  );
}
