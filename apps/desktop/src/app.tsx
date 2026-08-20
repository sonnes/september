import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";

import {
  canReach,
  DEFAULT_DRAFT,
  stepIndex,
  STEPS,
  type OnboardingDraft,
  type StepPath,
} from "./onboarding";

interface DraftValue {
  draft: OnboardingDraft;
  setDraft: Dispatch<SetStateAction<OnboardingDraft>>;
}

const DraftContext = createContext<DraftValue | null>(null);

export function useDraft(): DraftValue {
  const value = useContext(DraftContext);
  if (!value) throw new Error("useDraft needs the onboarding layout");
  return value;
}

// ponytail: the draft stays in memory until account persistence is ported.
export function OnboardingLayout() {
  const [draft, setDraft] = useState<OnboardingDraft>(DEFAULT_DRAFT);
  const value = useMemo(() => ({ draft, setDraft }), [draft]);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = stepIndex(pathname);

  // A reload keeps the route but drops the draft, so send an unreachable step
  // back to the start.
  if (current > 0 && !canReach(pathname as StepPath, draft)) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <DraftContext.Provider value={value}>
      <div className="flex h-dvh flex-col bg-zinc-100 px-4 py-6">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
          <header className="shrink-0 rounded-xl bg-indigo-600 px-8 py-6 text-white">
            <div className="flex items-center gap-2" aria-label="September">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-[11px] border-[5px] border-indigo-800 bg-white font-brand text-xs font-bold text-indigo-600"
              >
                Sep
              </span>
              <span className="font-brand text-xl font-bold tracking-tight text-indigo-200">
                <strong className="font-bold text-white">Sep</strong>tember
              </span>
            </div>
            <h1 className="mt-5 text-3xl leading-tight font-bold">
              Set up without the hard parts.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-indigo-100">
              Recommended choices are ready. You can connect extra services
              later.
            </p>
          </header>

          <main className="mt-4 flex min-h-0 flex-1 flex-col rounded-xl bg-white p-6 shadow-sm sm:px-10 sm:py-8">
            <ProgressNav current={current} draft={draft} />
            <Outlet />
          </main>
        </div>
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
  return (
    <nav aria-label="Onboarding progress" className="mb-6 shrink-0">
      <ol className="flex items-center">
        {STEPS.map((step, index) => {
          const completed = current > index;
          const isCurrent = current === index;
          const isLast = index === STEPS.length - 1;
          const state = isCurrent
            ? "border-indigo-600 bg-indigo-600 text-white"
            : completed
              ? "border-indigo-600 bg-indigo-100 text-indigo-600"
              : "border-zinc-200 text-zinc-500";

          return (
            <li
              key={step.path}
              className={`flex items-center ${isLast ? "" : "flex-1"}`}
            >
              <Link
                to={step.path}
                disabled={!canReach(step.path, draft)}
                aria-label={`Step ${index + 1}: ${step.label}${isCurrent ? ", current" : completed ? ", completed" : ""}`}
                className="flex items-center gap-2.5 rounded-md focus-visible:ring-[3px] focus-visible:ring-indigo-500/50 focus-visible:outline-none aria-disabled:cursor-default"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${state}`}
                >
                  {completed ? "✓" : index + 1}
                </span>
                <span
                  className={`hidden text-sm font-semibold sm:block ${current >= index ? "text-zinc-900" : "text-zinc-500"}`}
                >
                  {step.label}
                </span>
              </Link>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`mx-3 h-px flex-1 ${completed ? "bg-indigo-600" : "bg-zinc-200"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
