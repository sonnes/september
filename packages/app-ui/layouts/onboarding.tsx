import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";

import { BrandMark, BrandWordmark } from "@september/app-ui/blocks/brand";
import { HelpGuideContent } from "@september/app-ui/pages/help";
import { helpGuide } from "@september/core/rules/help";
import { Button } from "@september/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@september/ui/components/sheet";
import {
  canReach,
  DEFAULT_DRAFT,
  stepIndex,
  stepsFor,
  type OnboardingDraft,
  type StepPath,
} from "@platform/rules/onboarding";
import { osName } from "@platform/services/os";

interface DraftValue {
  draft: OnboardingDraft;
  setDraft: Dispatch<SetStateAction<OnboardingDraft>>;
}

const DraftContext = createContext<DraftValue | null>(null);
const SETUP_GUIDE = helpGuide("set-up-september")!;

export function useDraft(): DraftValue {
  const value = useContext(DraftContext);
  if (!value) throw new Error("useDraft needs the onboarding layout");
  return value;
}

// ponytail: the draft stays in memory until account persistence is ported.
export function OnboardingLayout() {
  const [draft, setDraft] = useState<OnboardingDraft>({
    ...DEFAULT_DRAFT,
    name: osName,
  });
  const value = useMemo(() => ({ draft, setDraft }), [draft]);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = stepIndex(pathname, draft);

  // A reload keeps the route but drops the draft, so send an unreachable step
  // back to the start.
  if (current > 0 && !canReach(pathname as StepPath, draft)) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <DraftContext.Provider value={value}>
      {/* Below `md` the indigo panel is a bar across the top; from `md` up it
          is the sidebar. DESIGN.md moves the app sidebar at the same width. */}
      <div className="flex h-dvh flex-col gap-2 bg-zinc-100 p-2 md:flex-row">
        {/* ponytail: the sidebar uses indigo utilities directly. DESIGN.md's
            --sidebar tokens are worth adding once a second screen needs them. */}
        <aside className="flex shrink-0 flex-row items-center gap-3 rounded-xl bg-indigo-600 px-3 py-3 text-white shadow-sm md:w-72 md:flex-col md:items-stretch md:gap-8 md:overflow-y-auto md:px-6 md:py-8">
          <div
            className="flex shrink-0 items-center gap-2"
            aria-label="September"
          >
            <BrandMark size={40} className="size-10 rounded-[11px]" />
            {/* The bar spends its width on the steps, so the wordmark waits
                for a screen that can hold both. The mark still names us. */}
            <BrandWordmark
              tone="inverse"
              aria-hidden="true"
              className="hidden text-xl sm:block"
            />
          </div>

          <div className="hidden md:block">
            <h1 className="text-2xl leading-tight font-bold">
              Set up without the hard parts.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-indigo-100">
              Recommended choices are ready. You can connect extra services
              later.
            </p>
          </div>

          <ProgressNav current={current} draft={draft} />

          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                aria-label="Help"
                className="size-11 shrink-0 justify-center border border-indigo-400 p-0 text-white hover:bg-indigo-500 hover:text-white md:mt-auto md:size-auto md:min-h-11 md:w-full md:justify-start md:px-4"
              >
                <CircleHelp aria-hidden="true" />
                <span className="hidden md:inline">Help</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle className="sr-only">{SETUP_GUIDE.title}</SheetTitle>
                <SheetDescription className="sr-only">
                  {SETUP_GUIDE.summary}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <HelpGuideContent guide={SETUP_GUIDE} />
              </div>
            </SheetContent>
          </Sheet>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-xl bg-white px-4 py-6 shadow-sm md:px-10 md:py-8">
          <Outlet />
        </main>
      </div>
    </DraftContext.Provider>
  );
}

function ProgressNav({
  current,
  draft,
}: {
  current: number;
  draft: OnboardingDraft;
}) {
  // Free setup owns no key, so its connect step never appears in the list.
  const steps = stepsFor(draft);

  return (
    // One list in both shapes, so a screen reader never hears the run twice:
    // it lies on its side in the bar and stands up in the sidebar.
    <nav
      aria-label="Onboarding progress"
      className="min-w-0 flex-1 md:flex-none"
    >
      <ol className="flex flex-row items-center justify-between gap-0.5 sm:justify-start md:flex-col md:items-stretch md:gap-0">
        {steps.map((step, index) => {
          const completed = current > index;
          const isCurrent = current === index;
          const isLast = index === steps.length - 1;
          const state = isCurrent
            ? "border-white bg-white text-indigo-600"
            : completed
              ? "border-indigo-200 bg-indigo-200 text-indigo-700"
              : "border-indigo-400 text-indigo-200";

          return (
            <li
              key={step.path}
              className="flex min-w-0 flex-row items-center gap-0.5 md:flex-col md:items-stretch md:gap-0"
            >
              {/* The padding below `md` is the touch target the bare 32px
                  circle does not give on a phone. */}
              <Link
                to={step.path}
                disabled={!canReach(step.path, draft)}
                aria-label={`Step ${index + 1}: ${step.label}${isCurrent ? ", current" : completed ? ", completed" : ""}`}
                className="flex items-center gap-3 rounded-full p-1 focus-visible:ring-[3px] focus-visible:ring-indigo-300 focus-visible:outline-none aria-disabled:cursor-default md:rounded-md md:p-0"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${state}`}
                >
                  {completed ? "✓" : index + 1}
                </span>
                {/* The bar has no room for five words, and the step title is
                    already the heading beside it. The link keeps its name. */}
                <span
                  className={`hidden text-sm font-semibold md:inline ${current >= index ? "text-white" : "text-indigo-200"}`}
                >
                  {step.label}
                </span>
              </Link>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`hidden h-px w-3 shrink sm:block md:ml-4 md:h-6 md:w-px md:shrink-0 ${completed ? "bg-indigo-200" : "bg-indigo-400"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
