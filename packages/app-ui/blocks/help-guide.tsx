import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { HELP_PLATFORMS, type HelpGuide, type HelpMedia, type HelpPlatform, type HelpScreenshot } from "@september/core/rules/help/catalog";
import { helpGuide } from "@september/core/rules/help/search";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@september/ui/components/dialog";
import { Badge } from "@september/ui/components/badge";
import { Button } from "@september/ui/components/button";
import { Callout } from "@september/ui/components/callout";

const platformLabel = new Map(
  HELP_PLATFORMS.map((platform) => [platform.key, platform.label]),
);

/** The complete written guide, reusable in a route or an onboarding sheet. */
export function HelpGuideContent({ guide }: { guide: HelpGuide }) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <PlatformBadges platforms={guide.platforms} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{guide.title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {guide.summary}
        </p>
      </header>

      {guide.prerequisites.length > 0 ? (
        <section
          className="space-y-3"
          aria-labelledby={`${guide.slug}-prerequisites`}
        >
          <h2
            id={`${guide.slug}-prerequisites`}
            className="text-base font-semibold"
          >
            Before you start
          </h2>
          <ul className="space-y-2 text-sm leading-relaxed">
            {guide.prerequisites.map((prerequisite) => (
              <li key={prerequisite} className="flex gap-3">
                <span aria-hidden="true" className="text-brand font-semibold">
                  •
                </span>
                <span>{prerequisite}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4" aria-labelledby={`${guide.slug}-steps`}>
        <h2 id={`${guide.slug}-steps`} className="text-xl font-semibold">
          Steps
        </h2>
        <GuideSteps steps={guide.steps} media={guide.media ?? []} />
      </section>

      {guide.alternatives?.map((alternative, index) => (
        <section
          key={alternative.title}
          className="space-y-4"
          aria-labelledby={`${guide.slug}-alternative-${index}`}
        >
          <h2
            id={`${guide.slug}-alternative-${index}`}
            className="text-xl font-semibold"
          >
            {alternative.title}
          </h2>
          <GuideSteps
            steps={alternative.steps}
            media={alternative.media ?? []}
          />
          <Callout role="note" tone="success" title="You should now see">
            {alternative.expectedResult}
          </Callout>
        </section>
      ))}

      {!guide.alternatives?.length ? (
        <Callout role="note" tone="success" title="You should now see">
          {guide.expectedResult}
        </Callout>
      ) : null}

      <Callout role="note" tone="warning" title="If this did not work">
        {guide.recovery}
      </Callout>

      <section className="space-y-3" aria-labelledby={`${guide.slug}-related`}>
        <h2 id={`${guide.slug}-related`} className="text-base font-semibold">
          Related guides
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {guide.related.map((slug) => {
            const related = helpGuide(slug);
            return related ? <GuideLink key={slug} guide={related} /> : null;
          })}
        </div>
      </section>
    </article>
  );
}

function GuideSteps({ steps, media }: { steps: string[]; media: HelpMedia[] }) {
  return (
    <>
      <ol className="space-y-6">
        {steps.map((step, index) => (
          <li key={step} className="space-y-4">
            <div className="flex gap-4 text-sm leading-relaxed">
              <span
                aria-hidden="true"
                className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full font-semibold"
              >
                {index + 1}
              </span>
              <span className="pt-1" data-help-step>
                {step}
              </span>
            </div>
            <GuideMedia
              media={media.filter(
                (item) =>
                  item.type === "screenshot" && item.afterStep === index + 1,
              )}
            />
          </li>
        ))}
      </ol>
      <GuideMedia media={media.filter((item) => item.type === "video")} />
      {media.some(
        (item) => item.type === "screenshot" && item.src && !item.afterStep,
      ) ? (
        <details className="rounded-surface border p-4">
          <summary className="focus-attention min-h-12 cursor-pointer rounded-md py-3 text-sm font-medium">
            Screen overview
          </summary>
          <GuideMedia
            media={media.filter(
              (item) => item.type === "screenshot" && !item.afterStep,
            )}
          />
        </details>
      ) : null}
    </>
  );
}

function Screenshot({ medium }: { medium: HelpScreenshot }) {
  const [failed, setFailed] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (failed) return null;
  const caption = medium.caption ?? medium.alt;
  return (
    <figure className="space-y-3 overflow-hidden rounded-surface border p-3 shadow-sm">
      <img
        src={medium.src}
        alt={medium.alt}
        loading="lazy"
        style={{ maxWidth: medium.width }}
        onError={() => setFailed(true)}
        className="h-auto w-full rounded-control"
      />
      <figcaption className="text-muted-foreground text-sm leading-relaxed">
        {caption}
      </figcaption>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            ref={trigger}
            type="button"
            variant="outline"
            className="min-h-11"
            aria-label={`Enlarge screenshot: ${caption}`}
          >
            Enlarge screenshot
          </Button>
        </DialogTrigger>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus({ preventScroll: true });
          }}
          showCloseButton={false}
          className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] sm:max-w-6xl overflow-y-auto motion-reduce:animate-none"
        >
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-base leading-relaxed">
              Screenshot
            </DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 min-w-11 shrink-0"
              >
                Close
              </Button>
            </DialogClose>
          </div>
          <DialogDescription>{caption}</DialogDescription>
          <img
            src={medium.src}
            alt={medium.alt}
            style={{ maxWidth: medium.width ? medium.width * 2 : undefined }}
            className="h-auto w-full"
          />
        </DialogContent>
      </Dialog>
    </figure>
  );
}

export function PlatformBadges({ platforms }: { platforms: HelpPlatform[] }) {
  return platforms.map((platform) => (
    <Badge key={platform} variant="outline">
      {platformLabel.get(platform) ?? platform}
    </Badge>
  ));
}

function GuideMedia({ media }: { media: HelpMedia[] }) {
  const available = media.filter((medium) =>
    medium.type === "video"
      ? Boolean(medium.src && medium.captionsSrc)
      : Boolean(medium.src),
  );

  if (available.length === 0) return null;

  return (
    <section
      className="space-y-4"
      aria-label="Guide media"
      data-help-media-frame
    >
      {available.map((medium, index) =>
        medium.type === "screenshot" ? (
          <Screenshot key={`${medium.src}-${index}`} medium={medium} />
        ) : (
          <figure key={`${medium.src}-${index}`} className="space-y-3">
            <video
              src={medium.src}
              controls
              preload="metadata"
              poster={medium.posterSrc}
              className="w-full rounded-surface border shadow-sm"
              aria-label={medium.title}
            >
              <track kind="captions" src={medium.captionsSrc} default />
            </video>
            <details className="rounded-control border p-4 text-sm">
              <summary className="focus-attention min-h-12 cursor-pointer rounded-md py-3 font-medium">
                Transcript
              </summary>
              <p className="text-muted-foreground leading-relaxed">
                {medium.transcript}
              </p>
            </details>
          </figure>
        ),
      )}
    </section>
  );
}

export function GuideLink({ guide }: { guide: HelpGuide }) {
  return (
    <Link
      to="/help/$guideSlug"
      params={{ guideSlug: guide.slug }}
      className="focus-attention group flex min-h-24 items-center justify-between gap-4 rounded-surface border bg-card p-5 shadow-sm transition-colors hover:bg-accent/40"
      data-help-guide-slug={guide.slug}
    >
      <span className="min-w-0 space-y-2">
        <span className="block text-sm font-semibold">{guide.title}</span>
        <span className="text-muted-foreground block text-sm leading-relaxed">
          {guide.summary}
        </span>
        <span className="flex flex-wrap gap-2">
          <PlatformBadges platforms={guide.platforms} />
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}
