import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  MessageCircle,
  Search,
  Video,
  Wrench,
} from "lucide-react";

import {
  HELP_CATEGORIES,
  HELP_HOME_SHORTCUTS,
  HELP_PLATFORMS,
  groupHelpGuides,
  helpGuide,
  searchHelpGuides,
  type HelpGuide,
  type HelpMedia,
  type HelpPlatform,
  type HelpScreenshot,
} from "@september/core/rules/help";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@september/ui/components/dialog";
import { Badge } from "@september/ui/components/badge";
import { Button } from "@september/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@september/ui/components/card";
import { Callout } from "@september/ui/components/callout";
import { Input } from "@september/ui/components/input";
import { Label } from "@september/ui/components/label";
import { ScreenHeader } from "@september/app-ui/blocks/screen";
import { documentTitle } from "@september/core/rules/titles";

const platformLabel = new Map(
  HELP_PLATFORMS.map((platform) => [platform.key, platform.label]),
);

// Navigation memory lasts only in this app window; Help queries are not persisted.
const homePosition = { query: "", scrollTop: 0 };

export function HelpScreen({ guideSlug }: { guideSlug?: string }) {
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroll.current)
      scroll.current.scrollTop = guideSlug ? 0 : homePosition.scrollTop;
  }, [guideSlug]);
  let content;
  let name;

  if (guideSlug) {
    const guide = helpGuide(guideSlug);
    content = guide ? <GuideScreen guide={guide} /> : <MissingGuide />;
    name = guide?.title;
  } else {
    content = <HelpHome />;
  }

  return (
    <>
      <title>{documentTitle(name, "Help")}</title>
      <ScreenHeader>
        <span className="text-sm font-medium">Help</span>
      </ScreenHeader>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 md:p-4"
        ref={scroll}
        onScroll={(event) => {
          if (!guideSlug)
            homePosition.scrollTop = event.currentTarget.scrollTop;
        }}
        data-help-scroll
      >
        {content}
      </div>
    </>
  );
}

function HelpHome() {
  const [query, setQuery] = useState(() => homePosition.query);
  const input = useRef<HTMLInputElement>(null);
  function changeQuery(value: string) {
    homePosition.query = value;
    homePosition.scrollTop = 0;
    setQuery(value);
  }
  function openCategory(id: string) {
    flushSync(() => changeQuery(""));
    const heading = document.getElementById(`help-category-${id}-title`);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
  }
  const searching = query.trim().length > 0;
  const results = searchHelpGuides(query);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-6 md:py-8">
      <header className="space-y-2">
        <p className="text-primary text-sm font-medium">Help</p>
        <h1 className="text-3xl font-bold tracking-tight">
          What do you want to do?
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Choose a common task, or find a step-by-step guide for September.
        </p>
      </header>

      <section aria-labelledby="quick-help-title" data-help-shortcuts>
        <h2 id="quick-help-title" className="sr-only">
          Quick help
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {HELP_HOME_SHORTCUTS.map((shortcut, index) => {
            const Icon = [MessageCircle, Wrench, Video][index] ?? CircleHelp;
            const content = (
              <>
                <span className="bg-accent text-accent-foreground flex size-11 shrink-0 items-center justify-center rounded-control">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="space-y-2 text-left">
                    <span className="block text-base font-semibold">
                      {shortcut.title}
                    </span>
                    {shortcut.target.type === "guide" &&
                    helpGuide(shortcut.target.slug)?.platforms.length === 1 ? (
                      <span className="block">
                        <PlatformBadges
                          platforms={helpGuide(shortcut.target.slug)!.platforms}
                        />
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-muted-foreground size-5 shrink-0"
                  />
                </span>
              </>
            );

            const className =
              "bg-card text-card-foreground focus-visible:ring-ring/50 flex min-h-28 items-center gap-4 rounded-surface border p-5 shadow-sm outline-none transition-colors hover:bg-accent/40 focus-visible:ring-[3px]";

            return shortcut.target.type === "guide" ? (
              <Link
                key={shortcut.title}
                to="/help/$guideSlug"
                params={{ guideSlug: shortcut.target.slug }}
                className={className}
              >
                {content}
              </Link>
            ) : (
              <a
                key={shortcut.title}
                href={`#help-category-${shortcut.target.categoryId}`}
                onClick={(event) => {
                  event.preventDefault();
                  if (shortcut.target.type === "category")
                    openCategory(shortcut.target.categoryId);
                }}
                className={className}
              >
                {content}
              </a>
            );
          })}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="help-search-label">
        <Label
          id="help-search-label"
          htmlFor="help-search"
          className="text-base font-semibold"
        >
          Search Help
        </Label>
        <div className="relative max-w-2xl">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
          />
          <Input
            ref={input}
            id="help-search"
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Try ‘sound’, ‘phrases’, or ‘FaceTime’"
            className="h-12 pl-12"
            data-help-search
          />
        </div>
      </section>

      {searching ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 self-start"
          onClick={() => {
            changeQuery("");
            input.current?.focus();
          }}
        >
          Clear search
        </Button>
      ) : null}

      <nav aria-label="Help categories" className="flex flex-wrap gap-3">
        {HELP_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            asChild
            variant="outline"
            className="min-h-11 h-auto whitespace-normal py-3 text-left"
          >
            <a
              href={`#help-category-${category.id}`}
              onClick={(event) => {
                event.preventDefault();
                openCategory(category.id);
              }}
            >
              {category.title}
            </a>
          </Button>
        ))}
      </nav>

      {searching ? (
        <section
          className="space-y-4"
          aria-live="polite"
          aria-labelledby="search-results-title"
        >
          <div className="space-y-1">
            <h2 id="search-results-title" className="text-xl font-semibold">
              Search results
            </h2>
            <p className="text-muted-foreground text-sm">
              {results.length === 1 ? "1 guide" : `${results.length} guides`}
            </p>
          </div>
          {results.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {results.map((guide) => (
                <GuideLink key={guide.slug} guide={guide} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="space-y-2 text-center">
                <h3 className="text-base font-semibold">No matching guide</h3>
                <p className="text-muted-foreground text-sm">
                  Try fewer words, or clear the search to browse every task.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      ) : (
        <section
          className="space-y-6"
          aria-labelledby="browse-help-title"
          data-help-categories
        >
          <h2 id="browse-help-title" className="text-xl font-semibold">
            Browse by task
          </h2>
          {groupHelpGuides().map(({ category, guides }) => (
            <section
              key={category.id}
              id={`help-category-${category.id}`}
              className="scroll-mt-6 space-y-3"
              aria-labelledby={`help-category-${category.id}-title`}
              data-help-category={category.id}
            >
              <div className="space-y-1">
                <h3
                  id={`help-category-${category.id}-title`}
                  tabIndex={-1}
                  className="scroll-mt-6 rounded-control text-base font-semibold focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {category.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {category.summary}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {guides.map((guide) => (
                  <GuideLink key={guide.slug} guide={guide} />
                ))}
              </div>
            </section>
          ))}
        </section>
      )}
    </div>
  );
}

function GuideLink({ guide }: { guide: HelpGuide }) {
  return (
    <Link
      to="/help/$guideSlug"
      params={{ guideSlug: guide.slug }}
      className="focus-visible:ring-ring/50 group flex min-h-24 items-center justify-between gap-4 rounded-surface border bg-card p-5 shadow-sm outline-none transition-colors hover:bg-accent/40 focus-visible:ring-[3px]"
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

function GuideScreen({ guide }: { guide: HelpGuide }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 md:py-8">
      <Button asChild variant="ghost" size="lg" className="-ml-4 min-h-11">
        <Link to="/help">
          <ArrowLeft aria-hidden="true" />
          All Help
        </Link>
      </Button>
      <HelpGuideContent guide={guide} />
    </div>
  );
}

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
                <span aria-hidden="true" className="text-primary font-semibold">
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
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
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

function PlatformBadges({ platforms }: { platforms: HelpPlatform[] }) {
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
              <summary className="min-h-11 cursor-pointer py-3 font-medium">
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

function MissingGuide() {
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Guide not found</CardTitle>
        <CardDescription>This Help link may be out of date.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="lg" className="min-h-11">
          <Link to="/help">Return to Help</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
