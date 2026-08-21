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
import { osName } from "./os";

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
  const [draft, setDraft] = useState<OnboardingDraft>({
    ...DEFAULT_DRAFT,
    name: osName,
  });
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
      <div className="flex h-dvh gap-2 bg-zinc-100 p-2">
        {/* ponytail: the sidebar uses indigo utilities directly. DESIGN.md's
            --sidebar tokens are worth adding once a second screen needs them. */}
        <aside className="flex w-72 shrink-0 flex-col gap-8 overflow-y-auto rounded-xl bg-indigo-600 px-6 py-8 text-white shadow-sm">
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

          <div>
            <h1 className="text-2xl leading-tight font-bold">
              Set up without the hard parts.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-indigo-100">
              Recommended choices are ready. You can connect extra services
              later.
            </p>
          </div>

          <ProgressNav current={current} draft={draft} />
        </aside>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl bg-white px-10 py-8 shadow-sm">
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
  return (
    <nav aria-label="Onboarding progress">
      <ol>
        {STEPS.map((step, index) => {
          const completed = current > index;
          const isCurrent = current === index;
          const isLast = index === STEPS.length - 1;
          const state = isCurrent
            ? "border-white bg-white text-indigo-600"
            : completed
              ? "border-indigo-200 bg-indigo-200 text-indigo-700"
              : "border-indigo-400 text-indigo-200";

          return (
            <li key={step.path}>
              <Link
                to={step.path}
                disabled={!canReach(step.path, draft)}
                aria-label={`Step ${index + 1}: ${step.label}${isCurrent ? ", current" : completed ? ", completed" : ""}`}
                className="flex items-center gap-3 rounded-md focus-visible:ring-[3px] focus-visible:ring-indigo-300 focus-visible:outline-none aria-disabled:cursor-default"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${state}`}
                >
                  {completed ? "✓" : index + 1}
                </span>
                <span
                  className={`text-sm font-semibold ${current >= index ? "text-white" : "text-indigo-200"}`}
                >
                  {step.label}
                </span>
              </Link>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`ml-4 block h-6 w-px ${completed ? "bg-indigo-200" : "bg-indigo-400"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
