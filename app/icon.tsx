import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'linear-gradient(135deg, hsl(199 82% 53%) 0%, hsl(199 70% 46%) 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '4px',
        }}
      >
        <svg width="24" height="18" viewBox="0 0 160 120" fill="none">
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
      </div>
    ),
    {
      ...size,
    }
  )
}
