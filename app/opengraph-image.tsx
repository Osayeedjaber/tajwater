import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TajWater — Pure Water Delivered to Your Door'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #006064 0%, #0097a7 40%, #00bcd4 70%, #1565c0 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Water wave decoration */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '180px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '50% 50% 0 0',
            transform: 'scaleX(1.4)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '120px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '50% 50% 0 0',
            transform: 'scaleX(1.6)',
          }}
        />

        {/* Logo text */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '3px solid rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
            }}
          >
            💧
          </div>
          <span
            style={{
              fontSize: '64px',
              fontWeight: 900,
              color: 'white',
              letterSpacing: '-2px',
              textShadow: '0 2px 20px rgba(0,0,0,0.3)',
            }}
          >
            TajWater
          </span>
        </div>

        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 400,
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.4,
            textShadow: '0 1px 10px rgba(0,0,0,0.2)',
          }}
        >
          Pure Water Delivered to Your Door
        </div>

        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {['Vancouver', 'Burnaby', 'Richmond', 'Surrey', '+ 6 More Zones'].map((zone) => (
            <span
              key={zone}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '16px',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {zone}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
