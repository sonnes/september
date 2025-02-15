'use client';

import { useActionState } from 'react';

import { useSearchParams } from 'next/navigation';

import { Banner } from '@/components/banner';
import { Button } from '@/components/catalyst/button';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Heading } from '@/components/catalyst/heading';
import { Input } from '@/components/catalyst/input';

import { signIn, signInWithGoogle } from './actions';
import type { LoginResponse } from './actions';

const initialState: LoginResponse = {
  success: false,
  message: '',
  inputs: {
    email: '',
    password: '',
    next: '',
  },
};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/app/talk';

  const handleGoogleSignIn = async () => {
    await signInWithGoogle(next);
  };

  return (
    <form className="space-y-8" action={formAction} autoComplete="on">
      <input type="hidden" name="next" value={next} />
      <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 md:col-span-2">
        <div>
          <Heading level={2}>Welcome Back</Heading>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Please enter your credentials to access your account.
          </p>
        </div>
        <div className="col-span-full">
          <Button type="button" outline className="w-full" onClick={handleGoogleSignIn}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </Button>
        </div>

        <div className="relative col-span-full">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-300 dark:border-zinc-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              Or continue with
            </span>
          </div>
        </div>

        <div className="col-span-full">
          <Field>
            <Label>Email</Label>
            <Input
              name="email"
              type="email"
              defaultValue={state.inputs?.email}
              required
              placeholder="you@example.com"
            />
            {state.errors?.email && (
              <p className="mt-2 text-sm text-red-500">{state.errors.email.join(', ')}</p>
            )}
          </Field>
        </div>

        <div className="col-span-full">
          <Field>
            <Label>Password</Label>
            <Input
              name="password"
              type="password"
              defaultValue={state.inputs?.password}
              required
              placeholder="••••••••"
              minLength={8}
            />
            {state.errors?.password && (
              <p className="mt-2 text-sm text-red-500">{state.errors.password.join(', ')}</p>
            )}
          </Field>
        </div>

        {state.message && (
          <Banner
            type={state.success ? 'success' : 'error'}
            title={state.success ? 'Success' : 'Error'}
            message={state.message}
          />
        )}

        <div className="flex flex-col space-y-4">
          <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
            {isPending ? 'Signing in...' : 'Sign In with Email'}
          </Button>

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Don't have an account?{' '}
            <a href="/signup" className="text-blue-600 hover:text-blue-500 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </form>
  );
}
