/**
 * The pages anyone can open without setup, and what a shared link says about
 * each one. The router draws them, and the build prerenders them.
 */
import type { RouteComponent } from '@tanstack/react-router';

import { LANDING_TITLE, documentTitle } from '@september/core/rules/titles';
import { HomePage } from '@/pages/home';
import { KeyboardPage } from '@/pages/keyboard';
import { PrivacyPolicy, TermsOfService } from '@/pages/legal';

export interface PublicPageEntry {
  heading: string;
  description: string;
  /** The title of the tab. The default is the heading and the app name. */
  title?: string;
  /** The page, when the web app draws it. The shared app draws Help. */
  component?: RouteComponent;
  /**
   * A screenshot that the share card shows under the heading. `src` is a
   * file in `public/`, and `alt` describes it.
   */
  shareShot?: { src: string; alt: string };
}

export const PUBLIC_PAGES = {
  '/': {
    heading: 'Faster Communication, Fewer Keystrokes',
    description:
      'A communication assistant for people living with ALS, MND, and other speech and motor difficulties.',
    title: LANDING_TITLE,
    component: HomePage,
  },
  '/keyboard': {
    heading: 'The Accessibility Keyboard, Reimagined',
    description:
      'September Keyboard is an on-screen keyboard for macOS that types into any app, predicts your sentences, presses shortcuts, and speaks for you.',
    title: documentTitle('September Keyboard for Mac'),
    component: KeyboardPage,
    shareShot: {
      src: 'keyboard/type.webp',
      alt: 'A screenshot of September Keyboard: sentence predictions, the input bar, the keys, and the shortcut panels.',
    },
  },
  '/help': {
    heading: 'Help',
    description: 'Learn to set up September, speak messages, save phrases, and choose a voice.',
  },
  '/privacy-policy': {
    heading: 'Privacy Policy',
    description:
      'How September stores your data, uses optional providers, and protects your privacy.',
    component: PrivacyPolicy,
  },
  '/terms-of-service': {
    heading: 'Terms of Service',
    description:
      'The terms for using September, its MIT license, and optional third-party services.',
    component: TermsOfService,
  },
} as const satisfies Record<string, PublicPageEntry>;

export type PublicPath = keyof typeof PUBLIC_PAGES;

export const isPublicPath = (path: string): path is PublicPath => path in PUBLIC_PAGES;
