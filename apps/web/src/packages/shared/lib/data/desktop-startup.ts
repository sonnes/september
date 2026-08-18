import { invoke } from '@tauri-apps/api/core';

import { getDesktopSetting, putDesktopSetting } from './setting-client';

const LAST_ROUTE_KEY = 'desktop-last-route';
const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/help',
  '/notes',
  '/onboarding',
  '/settings',
  '/spaces',
  '/talk',
  '/voice',
];
const SENSITIVE_QUERY_KEYS = new Set(['access_token', 'code', 'id_token', 'state']);

export interface DesktopOsUser {
  id: string;
  name: string;
}

export function getDesktopOsUser(): Promise<DesktopOsUser> {
  return invoke('os_user_get');
}

export function sanitizeDesktopRoute(href: string): string | null {
  try {
    const base = new URL('https://september.local');
    const url = new URL(href, base);
    if (url.origin !== base.origin) return null;

    const isAppRoute = APP_ROUTE_PREFIXES.some(
      prefix => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
    );
    if (!isAppRoute) return null;

    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export async function readDesktopLastRoute(): Promise<string | null> {
  const value = await getDesktopSetting<unknown>(LAST_ROUTE_KEY);
  return typeof value === 'string' ? sanitizeDesktopRoute(value) : null;
}

export async function writeDesktopLastRoute(href: string): Promise<void> {
  const route = sanitizeDesktopRoute(href);
  if (!route) return;
  await putDesktopSetting(LAST_ROUTE_KEY, route);
}
