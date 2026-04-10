import type { NextConfig } from "next";

const monorepoRoot = process.env.TURBOPACK_ROOT;

const nextConfig: NextConfig = {
  ...(monorepoRoot && {
    outputFileTracingRoot: monorepoRoot,
    turbopack: { root: monorepoRoot },
  }),
  transpilePackages: [
    '@september/account',
    '@september/ai',
    '@september/analytics',
    '@september/audio',
    '@september/chats',
    '@september/cloning',
    '@september/documents',
    '@september/editor',
    '@september/keyboards',
    '@september/onboarding',
    '@september/recording',
    '@september/shared',
    '@september/speech',
    '@september/suggestions',
    '@september/ui',
  ],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
