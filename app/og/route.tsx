import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
          padding: '80px',
        }}
      >
        {/* Logo and Title Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '32px',
              marginBottom: '32px',
            }}
          >
            <span
              style={{
                color: '#111827',
                fontWeight: 'bold',
                fontSize: '70px',
                letterSpacing: '-0.025em',
              }}
            >
              september
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F3F4F6',
              borderRadius: '9999px',
              paddingLeft: '16px',
              paddingRight: '16px',
              paddingTop: '8px',
              paddingBottom: '8px',
              marginBottom: '32px',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                color: '#4B5563',
              }}
            >
              COMMUNICATION ASSISTANT
            </span>
          </div>

          {/* Main Heading */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontSize: '70px',
              fontWeight: 'bold',
              marginBottom: '32px',
              color: '#111827',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  color: '#F59E0B',
                  paddingRight: '8px',
                  fontFamily: 'cursive',
                }}
              >
                Faster
              </span>{' '}
              <span>Communication</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  color: '#F59E0B',
                  paddingRight: '8px',
                  fontFamily: 'cursive',
                }}
              >
                Fewer
              </span>{' '}
              <span>Keystrokes</span>
            </div>
          </div>

          {/* Description */}
          <p
            style={{
              color: '#4B5563',
              fontSize: '24px',
              maxWidth: '768px',
              textAlign: 'center',
            }}
          >
            A communication assistant for people living with neurodegenerative conditions like ALS,
            MND, or other speech & motor difficulties.
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
