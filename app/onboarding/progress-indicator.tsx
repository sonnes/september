'use client';

import { CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  currentStep: number;
  completedSteps: Set<string>;
}

const steps = [
  { id: 'api-keys', label: 'API Keys', shortLabel: 'Keys' },
  { id: 'speech', label: 'Speech & Voice', shortLabel: 'Voice' },
  { id: 'suggestions', label: 'Suggestions', shortLabel: 'AI' },
];

export function ProgressIndicator({ currentStep, completedSteps }: ProgressIndicatorProps) {
  const getStepState = (stepIndex: number, stepId: string): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.has(stepId)) {
      return 'completed';
    }
    if (stepIndex === currentStep) {
      return 'current';
    }
    return 'upcoming';
  };

  return (
    <nav aria-label="Progress" className="w-full">
      {/* Step counter */}
      <p className="text-sm font-medium text-zinc-600 text-center mb-4">
        Step {currentStep + 1} of {steps.length}
      </p>

      {/* Desktop: Full horizontal layout with labels */}
      <ol className="hidden md:flex items-center justify-between w-full">
        {steps.map((step, index) => {
          const state = getStepState(index, step.id);
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="flex items-center flex-1">
              <div className="flex items-center w-full">
                {/* Step indicator */}
                <div
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                    state === 'completed' && 'bg-green-600 border-green-600',
                    state === 'current' && 'bg-indigo-600 border-indigo-600',
                    state === 'upcoming' && 'bg-white border-zinc-300'
                  )}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  {state === 'completed' ? (
                    <CheckIcon className="w-6 h-6 text-white" aria-hidden="true" />
                  ) : (
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        state === 'current' && 'text-white',
                        state === 'upcoming' && 'text-zinc-500'
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Step label */}
                <div className="ml-3 flex-shrink-0">
                  <span
                    className={cn(
                      'text-sm font-medium transition-colors',
                      state === 'completed' && 'text-green-700',
                      state === 'current' && 'text-indigo-700',
                      state === 'upcoming' && 'text-zinc-500'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4 transition-colors',
                    (state === 'completed' || (state === 'current' && completedSteps.has(steps[index + 1]?.id))) && 'bg-green-600',
                    state === 'current' && !completedSteps.has(steps[index + 1]?.id) && 'bg-zinc-300',
                    state === 'upcoming' && 'bg-zinc-300'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: Compact dots with current step label */}
      <div className="flex md:hidden flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          {steps.map((step, index) => {
            const state = getStepState(index, step.id);

            return (
              <div key={step.id} className="flex items-center">
                {/* Step dot */}
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full transition-all',
                    state === 'current' ? 'w-10 h-10 border-2' : 'w-8 h-8',
                    state === 'completed' && 'bg-green-600',
                    state === 'current' && 'bg-indigo-600 border-indigo-200',
                    state === 'upcoming' && 'bg-zinc-300'
                  )}
                  aria-current={state === 'current' ? 'step' : undefined}
                  aria-label={`${step.label}${state === 'completed' ? ' - Completed' : state === 'current' ? ' - Current' : ''}`}
                >
                  {state === 'completed' ? (
                    <CheckIcon className="w-5 h-5 text-white" aria-hidden="true" />
                  ) : state === 'current' ? (
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  ) : null}
                </div>

                {/* Connector dot */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full mx-1',
                      state === 'completed' ? 'bg-green-600' : 'bg-zinc-300'
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current step label */}
        <p className="text-sm font-medium text-indigo-700">
          {steps[currentStep].label}
        </p>
      </div>
    </nav>
  );
}
