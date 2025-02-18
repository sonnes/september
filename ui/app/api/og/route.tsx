import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div tw="w-full h-full bg-indigo-500 flex flex-col items-center justify-center p-20">
        {/* Title Section */}
        <div tw="flex flex-col items-center text-center">
          <div tw="flex items-center mb-8">
            <span tw="text-white font-bold text-7xl tracking-tight">september</span>
          </div>

          <div tw="rounded-full bg-indigo-100 px-4 py-2 text-xl text-indigo-600 mb-8">
            COMMUNICATION ASSISTANT
          </div>

          {/* Main Heading */}
          <div tw="text-7xl font-bold mb-8 text-white flex flex-col items-center">
            <div tw="flex items-center">
              <span tw="text-amber-300 pr-2">Faster</span> <span>Communication</span>
            </div>
            <div tw="flex items-center">
              <span>Fewer</span>
              <span tw="pl-2 text-amber-300">Keystrokes</span>
            </div>
          </div>

          {/* Description */}
          <p tw="text-indigo-50 text-2xl max-w-3xl text-center">
            A communication assistant for people with ALS, MND, or other speech & motor
            difficulties.
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
