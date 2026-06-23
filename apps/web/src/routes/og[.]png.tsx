import { createFileRoute } from '@tanstack/react-router';

import { OG_IMAGE_CONTENT_TYPE, renderOgImagePng } from '@/lib/og-image';

export const Route = createFileRoute('/og.png')({
  server: {
    handlers: {
      GET: async () => {
        const image = await renderOgImagePng();

        return new Response(new Uint8Array(image), {
          headers: {
            'content-type': OG_IMAGE_CONTENT_TYPE,
            'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
          },
        });
      },
    },
  },
});
