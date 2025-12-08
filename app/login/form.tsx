'use client';

import { useActionState } from 'react';
import React from 'react';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { useToast } from '@/hooks/use-toast';

import { signInWithEmail, signInWithGoogle } from './actions';
import type { LoginResponse } from './actions';

const initialState: LoginResponse = {
  success: false,
  message: '',
  inputs: {
    email: '',
    next: '',
  },
};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const { show } = useToast();

  React.useEffect(() => {
    if (state.message) {
      show({
        type: state.success ? 'success' : 'error',
        title: state.success ? 'Success' : 'Error',
        message: state.message,
      });
    }
    // Only run when state.message changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.message]);

  const handleGoogleSignIn = async () => {
    await signInWithGoogle(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} method="POST" autoComplete="on">
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="mb-2">
              <Image
                src="/logo.png"
                alt="September"
                width={64}
                height={64}
                className="rounded-lg"
              />
            </div>
            <h1 className="text-xl font-bold">Welcome to September</h1>
            <FieldDescription>Enter your email to receive a login link</FieldDescription>
          </div>
          <input type="hidden" name="next" value={next} />
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              defaultValue={state.inputs?.email}
            />
            {state.errors?.email && (
              <p className="mt-2 text-sm text-destructive">{state.errors.email.join(', ')}</p>
            )}
          </Field>
          <Field>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Sending login link...' : 'Send Login Link'}
            </Button>
          </Field>
          <FieldSeparator>Or</FieldSeparator>
          <Field>
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isPending}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Continue with Google
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
