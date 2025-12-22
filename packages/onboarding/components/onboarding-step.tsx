'use client';

import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import type { StepProps } from '../types';

export function OnboardingStep({
  title,
  description,
  children,
  stepNumber,
  isActive,
  isCompleted,
  onComplete,
}: StepProps) {
  return (
    <Card className={`mb-4 ${!isActive && 'hidden'}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                Step {stepNumber}: {title}
              </h3>
              {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
            {isActive && (
              <>
                <p className="mt-2 text-muted-foreground">{description}</p>
                <div className="mt-4">{children}</div>
                <div className="mt-4">
                  <Button onClick={onComplete}>Complete Step</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
