// Cached Google profile (display only) so the app can show the signed-in user
// without re-decoding the token each render.
const PROFILE_KEY = 'september.sync.profile';

export interface Profile {
  email?: string;
  name?: string;
  picture?: string;
}

export function writeProfile(profile: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function readProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function clearProfile(): void {
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
