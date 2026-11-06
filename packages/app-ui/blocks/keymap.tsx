import { useEffect, useRef } from "react";

/**
 * One Escape press closes one thing. The thing opened last closes first, and
 * the screen's own step (`base`) runs only when nothing else is open. A menu
 * or a dialog that closed on the press has used it already.
 */
interface Layer {
  /** Gives false when the press had nothing to do. */
  run: () => boolean | void;
  base: boolean;
}

const layers: Layer[] = [];

function onEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const layer = layers.findLast((one) => !one.base) ?? layers.findLast((one) => one.base);
  if (layer && layer.run() !== false) event.preventDefault();
}

/**
 * Closes something on Escape while `close` is set. `base` is the step of the
 * whole screen, such as hiding the panel, which waits for everything else.
 */
export function useEscape(close: (() => boolean | void) | null, { base = false } = {}) {
  const latest = useRef(close);
  useEffect(() => {
    latest.current = close;
  });
  const active = close !== null;

  useEffect(() => {
    if (!active) return;
    const layer: Layer = { run: () => latest.current?.(), base };
    if (layers.length === 0) document.addEventListener("keydown", onEscape);
    layers.push(layer);
    return () => {
      layers.splice(layers.indexOf(layer), 1);
      if (layers.length === 0) document.removeEventListener("keydown", onEscape);
    };
  }, [active, base]);
}
