import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useSpaces, useUpdateSpace } from "@september/app-ui/services/data";
import { spaceParams } from "@september/app-ui/blocks/space-routes";
import type { Space, SpaceMode } from "@september/core/rules/records";
import { freeTitle } from "@september/core/rules/spaces";

/** The name of the space. A new name changes the address of the space too. */
export function SpaceTitle({
  space,
  mode = "talk",
}: {
  space: Space;
  mode?: SpaceMode;
}) {
  const navigate = useNavigate();
  const update = useUpdateSpace();
  const { data: spaces } = useSpaces();
  const [title, setTitle] = useState(space.title ?? "");
  // Why the last name was refused, or nothing. It clears as the user types.
  const [taken, setTaken] = useState("");

  useEffect(() => {
    setTitle(space.title ?? "");
    setTaken("");
  }, [space.id, space.title]);

  const save = () => {
    const next = title.trim();
    if (!next || next === space.title) {
      setTitle(space.title ?? "");
      setTaken("");
      return;
    }

    // One slug names one space. A name that another space holds would send
    // this address to that space, so nothing is written and the words of the
    // user stay in the field for them to change.
    const others = (spaces ?? [])
      .filter((one) => one.id !== space.id)
      .map((one) => one.title);

    if (!freeTitle(next, others)) {
      setTaken(`Another space is already called ${next}.`);
      return;
    }

    setTaken("");
    update.mutate(
      { id: space.id, title: next },
      {
        onSuccess: () =>
          navigate({ ...spaceParams({ title: next }, mode), replace: true }),
        onError: () => setTaken("September did not save the name. Try again."),
      },
    );
  };

  return (
    <span className="flex min-w-0 flex-1 flex-col justify-center">
      <input
        value={title}
        aria-label="Space name"
        aria-invalid={Boolean(taken)}
        onChange={(event) => {
          setTitle(event.target.value);
          setTaken("");
        }}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="focus-attention hover:bg-accent min-w-0 rounded-md bg-transparent px-2 py-1 text-sm font-medium transition-colors"
      />
      {taken ? (
        <span role="alert" className="text-destructive px-2 text-xs">
          {taken}
        </span>
      ) : null}
    </span>
  );
}
