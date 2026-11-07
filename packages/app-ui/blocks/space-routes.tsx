import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bot, FileText, MessagesSquare, type LucideIcon } from "lucide-react";

import { useCreateSpace, useSpaces } from "@september/app-ui/services/data";
import { hasWritingService } from "@september/app-ui/services/ai";
import { currentSetup, spaceModes } from "@september/app-ui/services/settings";
import { noteSlug } from "@september/core/rules/notes";
import { SPACE_MODE_TITLES } from "@september/core/rules/navigation";
import { SPACE_MODES, type Space, type SpaceMode } from "@september/core/rules/records";
import {
  newSpaceMode,
  newSpaceTitle,
  rememberSpaceMode,
  spaceForSlug,
  spaceModeFrom,
  spaceSlug,
  type SeenSpace,
} from "@september/core/rules/spaces";

const MODE_PATHS = {
  talk: "/spaces/$slug/talk",
  notes: "/spaces/$slug/notes",
  agent: "/spaces/$slug/agent",
} as const;

/** The address of a space in one mode. */
export const spaceParams = <Mode extends SpaceMode>(space: Pick<Space, "title">, mode: Mode) => ({
  to: MODE_PATHS[mode],
  params: { slug: spaceSlug(space.title) },
});

/** The address of one note of a space. */
export const noteParams = (space: Pick<Space, "title">, name: string | undefined) => ({
  to: "/spaces/$slug/notes/$noteSlug" as const,
  params: { slug: spaceSlug(space.title), noteSlug: noteSlug(name) },
});

/** Whether AI Assistance shows the agent. It is on unless the user turned it off. */
export const agentEnabled = (): boolean => currentSetup()?.agentEnabled !== false;

/** The mode a space was left in, for a screen that opens one. */
export const openParams = (space: Pick<Space, "id" | "title">) =>
  spaceParams(space, spaceModeFrom(spaceModes.get(), space.id, agentEnabled()));

const MODE_ICONS: Record<SpaceMode, LucideIcon> = {
  talk: MessagesSquare,
  notes: FileText,
  agent: Bot,
};

/** The modes of a space, in order. A user who turned the agent off does not see it. */
export const shownModes = () =>
  SPACE_MODES.filter((key) => key !== "agent" || agentEnabled()).map((key) => ({
    key,
    label: SPACE_MODE_TITLES[key],
    icon: MODE_ICONS[key],
  }));

/**
 * Keeps the mode a space is open in, so it opens the same way next time.
 *
 * A user who writes notes in one space and talks in another should not have
 * to say so twice a day.
 */
export function useRememberMode(space: Space, mode: SpaceMode) {
  useEffect(() => {
    if (spaceModeFrom(spaceModes.get(), space.id) === mode) return;
    spaceModes.keep(rememberSpaceMode(spaceModes.get(), space.id, mode));
  }, [space.id, mode]);
}

export interface NewSpace {
  /** Makes a space and opens it. Gives false when the space could not be made. */
  create: () => Promise<boolean>;
  pending: boolean;
  error: Error | null;
}

/**
 * Makes a space and opens it.
 *
 * The space exists from the press. Nothing is asked first: a user who cannot
 * type quickly should not have to write a paragraph before September will give
 * them somewhere to write it, and the space is where that question is asked
 * now. With AI Assistance connected the agent asks it, and with none the space
 * opens in Talk, where the user can speak straight away.
 */
export function useNewSpace(): NewSpace {
  const navigate = useNavigate();
  const { data: spaces } = useSpaces();
  const createSpace = useCreateSpace();
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(() => {
    setError(null);
    return createSpace
      .mutateAsync(newSpaceTitle((spaces ?? []).map((one) => one.title)))
      .then((space) => {
        return navigate(
          spaceParams(space, newSpaceMode(hasWritingService(), agentEnabled())),
        );
      })
      .then(
        () => true,
        (reason: unknown) => {
          setError(reason instanceof Error ? reason : new Error(String(reason)));
          return false;
        },
      );
  }, [createSpace, navigate, spaces]);

  return { create, pending: createSpace.isPending, error };
}

export interface SpaceBySlug {
  /** The space the address names, or nothing while it is being found. */
  space: Space | undefined;
  spaces: Space[];
  isPending: boolean;
}

/**
 * The space a screen shows, by the name in its address.
 *
 * A title is an address, so a rename moves the space out from under the screen
 * showing it. The agent renames a new space on its first turn, while the user
 * is watching it happen, so the screen follows the space it was already
 * showing and writes the new address instead of leaving for the list.
 *
 * A slug that names no space and no space that was ever here is a stale link,
 * and that does go back to the list.
 */
export function useSpaceBySlug(slug: string, mode: SpaceMode): SpaceBySlug {
  const navigate = useNavigate();
  const { data: spaces, isPending, isFetching } = useSpaces();
  // The space this screen has been showing, and where it was showing it. A
  // rename is followed by the id, which is the one thing about a space that
  // never moves, and only while the address itself stands still.
  const seen = useRef<SeenSpace | null>(null);
  const found = spaceForSlug(slug, spaces ?? [], seen.current);

  useEffect(() => {
    if (found && !found.renamed) seen.current = { id: found.space.id, slug };
  });

  const renamedTo = found?.renamed ? found.space.title : null;
  // A list still being read says nothing about whether a space is there, and
  // a space that has just been made is exactly the one the held list is
  // oldest about.
  const gone = !isPending && !isFetching && !found;

  useEffect(() => {
    if (gone) navigate({ to: "/spaces", replace: true });
  }, [gone, navigate]);

  useEffect(() => {
    if (renamedTo === null) return;
    navigate({ ...spaceParams({ title: renamedTo }, mode), replace: true });
  }, [renamedTo, mode, navigate]);

  return { space: found?.space, spaces: spaces ?? [], isPending };
}
