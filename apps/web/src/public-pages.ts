/**
 * The pages anyone can open without setup, and what a shared link says about
 * each one. The router draws them, and the build prerenders them.
 */
import type { RouteComponent } from '@tanstack/react-router';

import { LANDING_TITLE } from '@september/core/rules/titles';
import { HomePage } from '@/pages/home';
import { PrivacyPolicy, TermsOfService } from '@/pages/legal';

export interface PublicPageEntry {
  heading: string;
  description: string;
  /** The title of the tab. The default is the heading and the app name. */
  title?: string;
  /** The page, when the web app draws it. The shared app draws Help. */
  component?: RouteComponent;
}

export const PUBLIC_PAGES = {
  '/': {
    heading: 'Faster Communication, Fewer Keystrokes',
    description:
      'A communication assistant for people living with ALS, MND, and other speech and motor difficulties.',
    title: LANDING_TITLE,
    component: HomePage,
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
