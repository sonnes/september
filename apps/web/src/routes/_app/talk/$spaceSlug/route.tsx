import { createFileRoute, redirect } from '@tanstack/react-router';

import { redirectTalkSpace } from '../../spaces/-redirects';

// Legacy route — talk mode now lives at /spaces/$spaceSlug/talk.
export const Route = createFileRoute('/_app/talk/$spaceSlug')({
  beforeLoad: ({ params }) => {
    throw redirect(redirectTalkSpace(params));
  },
});
