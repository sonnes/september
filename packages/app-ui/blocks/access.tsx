import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useSetup } from "@september/app-ui/services/settings";
import { type AccessProfile, isDark, parseAccess, type Reach, reachFor } from "@september/core/rules/access";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const subscribeSystem = (listener: () => void) => {
  const query = window.matchMedia?.(DARK_QUERY);
  query?.addEventListener?.("change", listener);
  return () => query?.removeEventListener?.("change", listener);
};
const systemDark = () => window.matchMedia?.(DARK_QUERY).matches ?? false;

/** The access profile of the person, or the default before setup. */
export function useAccess(): AccessProfile {
  const setup = useSetup();
  const saved = setup?.access;
  return useMemo(() => parseAccess(saved), [saved]);
}

/** What the access profile asks of the screen. */
export function useReach(): Reach {
  const access = useAccess();
  return useMemo(() => reachFor(access), [access]);
}

/**
 * Puts the access profile on the page: the dark theme, the input method, the
 * motion, and the reach as custom properties that every screen reads. The
 * page loses them when this leaves.
 *
 * Setup passes the profile of its draft, which changes when the person
 * continues. Every other screen reads the saved profile.
 */
export function ApplyAccess({ profile }: { profile?: AccessProfile }) {
  const saved = useAccess();
  const access = profile ?? saved;
  const system = useSyncExternalStore(subscribeSystem, systemDark, () => false);
  const dark = isDark(access.theme, system);

  useEffect(() => {
    const html = document.documentElement;
    const reach = reachFor(access);
    const tokens: Record<string, string> = {
      "--reach-target": `${reach.targetPx}px`,
      "--reach-gap": `${reach.gapPx}px`,
      "--reach-word": `${reach.wordPx}px`,
      "--reach-scale": String(reach.textScale),
    };
    html.classList.toggle("dark", dark);
    html.dataset.input = access.input;
    html.dataset.motion = reach.motion;
    html.dataset.contrast = access.contrast;
    for (const [name, value] of Object.entries(tokens)) html.style.setProperty(name, value);
    // The landing page and every page outside the app show the default.
    return () => {
      html.classList.remove("dark");
      delete html.dataset.input;
      delete html.dataset.motion;
      delete html.dataset.contrast;
      for (const name of Object.keys(tokens)) html.style.removeProperty(name);
    };
  }, [access, dark]);

  return null;
}

/** A key of the form: the reach target each way, and never less than 48 px. */
export const KEY_SIZE =
  "min-h-[max(3rem,var(--reach-target,3rem))] min-w-[max(3rem,var(--reach-target,3rem))]";
