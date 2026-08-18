// Cached Google profile (display only) so the app can show the signed-in user
// without re-decoding the token each render.
import {
  deleteDesktopSetting,
  getDesktopSetting,
  isDesktopRuntime,
  putDesktopSetting,
} from '@/packages/shared/lib/data';

const PROFILE_KEY = 'september.sync.profile';
const DESKTOP_PROFILE_KEY = 'sync-profile';

export interface Profile {
  email?: string;
  name?: string;
  picture?: string;
}

let desktopProfile: Profile | null = null;

export async function hydrateProfile(): Promise<void> {
  if (isDesktopRuntime()) {
    desktopProfile = await getDesktopSetting<Profile>(DESKTOP_PROFILE_KEY);
  }
}

export async function writeProfile(profile: Profile): Promise<void> {
  if (isDesktopRuntime()) {
    const previous = desktopProfile;
    desktopProfile = profile;
    try {
      await putDesktopSetting(DESKTOP_PROFILE_KEY, profile);
    } catch (error) {
      desktopProfile = previous;
      throw error;
    }
    return;
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function readProfile(): Profile | null {
  if (isDesktopRuntime()) return desktopProfile;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export async function clearProfile(): Promise<void> {
  if (isDesktopRuntime()) {
    desktopProfile = null;
    await deleteDesktopSetting(DESKTOP_PROFILE_KEY);
    return;
  }
  localStorage.removeItem(PROFILE_KEY);
}

/** Pull display fields out of a Google ID token (not a trust boundary). */
export function profileFromIdToken(idToken: string): Profile {
  try {
    const [, body] = idToken.split('.');
    const padded = body.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '=')));
    return { email: payload.email, name: payload.name, picture: payload.picture };
  } catch {
    return {};
  }
}
