import { createContext, useContext, type Dispatch, type SetStateAction } from "react";

import type { OnboardingDraft } from "@september/core/rules/onboarding";

interface DraftValue {
  draft: OnboardingDraft;
  setDraft: Dispatch<SetStateAction<OnboardingDraft>>;
}

/** The answers of the setup steps, before the last step keeps them. */
export const DraftContext = createContext<DraftValue | null>(null);

export function useDraft(): DraftValue {
  const value = useContext(DraftContext);
  if (!value) throw new Error("useDraft needs the onboarding layout");
  return value;
}
