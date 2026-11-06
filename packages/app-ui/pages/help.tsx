import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CircleHelp, MessageCircle, Search, Video, Wrench, type LucideIcon } from "lucide-react";
import { HELP_CATEGORIES, HELP_HOME_SHORTCUTS, type HelpGuide, type HelpHomeShortcut } from "@september/core/rules/help/catalog";
import { groupHelpGuides, helpGuide, searchHelpGuides } from "@september/core/rules/help/search";
import { Button } from "@september/ui/components/button";
import { Card, CardContent } from "@september/ui/components/card";
import { Input } from "@september/ui/components/input";
import { Label } from "@september/ui/components/label";
import { ScreenHeader } from "@september/app-ui/blocks/screen";
import { documentTitle } from "@september/core/rules/titles";
import { GuideLink, HelpGuideContent, PlatformBadges } from "@september/app-ui/blocks/help-guide";

const shortcutKey = ({ target }: HelpHomeShortcut) =>
  target.type === "guide" ? target.slug : target.categoryId;

const SHORTCUT_ICONS: Record<string, LucideIcon> = {
  "speak-your-first-message": MessageCircle,
  "fix-a-problem": Wrench,
  "speak-into-facetime-or-zoom": Video,
};

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
    content = guide ? <GuideScreen guide={guide} /> : null;
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
  const count = results.length === 1 ? "1 guide" : `${results.length} guides`;
  // The count waits until the typing stops, so a screen reader says it once
  // and does not talk over each key.
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const wait = setTimeout(() => setAnnounced(searching ? count : ""), 800);
    return () => clearTimeout(wait);
  }, [searching, count]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-6 md:py-8">
      <header className="space-y-2">
        <p className="text-brand text-sm font-medium">Help</p>
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
          {HELP_HOME_SHORTCUTS.map((shortcut) => {
            const Icon = SHORTCUT_ICONS[shortcutKey(shortcut)] ?? CircleHelp;
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
              "focus-attention bg-card text-card-foreground flex min-h-28 items-center gap-4 rounded-surface border p-5 shadow-sm transition-colors hover:bg-accent/40";

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

      <p role="status" className="sr-only">
        {announced}
      </p>

      {searching ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
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
            className="h-auto whitespace-normal py-3 text-left"
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
        <section className="space-y-4" aria-labelledby="search-results-title">
          <div className="space-y-1">
            <h2 id="search-results-title" className="text-xl font-semibold">
              Search results
            </h2>
            <p className="text-muted-foreground text-sm">{count}</p>
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
                  className="focus-attention scroll-mt-6 rounded-control text-base font-semibold"
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
