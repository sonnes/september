'use client';

import { useActionState } from 'react';

import { useSearchParams } from 'next/navigation';

import { signIn } from '@/app/actions/user';
import type { LoginResponse } from '@/app/actions/user';
import { Banner } from '@/components/banner';
import { Button } from '@/components/catalyst/button';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Heading } from '@/components/catalyst/heading';
import { Input } from '@/components/catalyst/input';

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

  return (
    <form className="space-y-8" action={formAction} autoComplete="on">
      <input type="hidden" name="next" value={searchParams.get('next') || '/app/talk'} />
      <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 md:col-span-2">
        <div>
          <Heading level={2}>Welcome Back</Heading>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Please enter your credentials to access your account.
          </p>
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
            />
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
            {isPending ? 'Signing in...' : 'Sign In'}
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
