interface ShotProps {
  /** The file in `public/keyboard`, made by `apps/keyboard/scripts/landing-media.sh`. */
  src: string;
  /** For an animation: the still that a reader with reduced motion sees. */
  still?: string;
  alt: string;
  width: number;
  height: number;
  /** The first image of the page loads at once. The others load near the screen. */
  eager?: boolean;
}

/**
 * A screenshot or an animation of the keyboard on a light stage. The snapshots
 * of the keyboard have a transparent background, and the animations are drawn
 * on the color of the stage, so both look the same on the page.
 */
export function Shot({ src, still, alt, width, height, eager }: ShotProps) {
  const image = (
    <img
      src={`/keyboard/${src}`}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className="h-auto w-full"
    />
  );

  return (
    <div className="rounded-surface border border-indigo-100 bg-indigo-50 p-3 shadow-lg sm:p-6">
      {still ? (
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet={`/keyboard/${still}`} />
          {image}
        </picture>
      ) : (
        image
      )}
    </div>
  );
}
