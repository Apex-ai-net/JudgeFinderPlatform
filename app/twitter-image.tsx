import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'JudgeFinder.io - California Judicial Analytics Platform'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image(): JSX.Element {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, hsl(199 82% 53%) 0%, hsl(199 70% 46%) 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <svg
          width="160"
          height="120"
          viewBox="0 0 160 120"
          fill="none"
          style={{ marginBottom: '20px' }}
        >
          <g transform="translate(80, 60)">
            {/* Base */}
            <rect x="-80" y="50" width="160" height="8" fill="#FFFFFF" />
            <rect x="-75" y="58" width="150" height="4" fill="#FFFFFF" />

            {/* Columns */}
            <rect x="-65" y="-10" width="12" height="60" fill="#FFFFFF" />
            <rect x="-35" y="-10" width="12" height="60" fill="#FFFFFF" />
            <rect x="23" y="-10" width="12" height="60" fill="#FFFFFF" />
            <rect x="53" y="-10" width="12" height="60" fill="#FFFFFF" />

            {/* Door */}
            <rect x="-15" y="0" width="30" height="50" fill="#FFFFFF" fillOpacity="0.9" />

            {/* Entablature */}
            <rect x="-75" y="-18" width="150" height="8" fill="#FFFFFF" />

            {/* Pediment */}
            <path d="M 0,-50 L 85,-18 L -85,-18 Z" fill="#FFFFFF" />
            <path d="M 0,-45 L 75,-18 L -75,-18 Z" fill="#FFFFFF" fillOpacity="0.3" />
          </g>
        </svg>
        <div
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            marginBottom: '10px',
            textAlign: 'center',
          }}
        >
          JudgeFinder.io
        </div>
        <div
          style={{
            fontSize: 28,
            opacity: 0.95,
            textAlign: 'center',
            maxWidth: '80%',
            marginBottom: '20px',
          }}
        >
          California's Most Comprehensive Judicial Analytics Platform
        </div>
        <div
          style={{
            display: 'flex',
            gap: '40px',
            marginTop: '20px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 'bold' }}>Statewide</div>
            <div style={{ fontSize: 18, opacity: 0.8 }}>Judge Coverage</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 'bold' }}>Comprehensive</div>
            <div style={{ fontSize: 18, opacity: 0.8 }}>Case Library</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 'bold' }}>AI</div>
            <div style={{ fontSize: 18, opacity: 0.8 }}>Analytics</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
