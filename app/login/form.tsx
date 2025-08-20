'use client';

import { useActionState } from 'react';
import React from 'react';

import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
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
  const next = searchParams.get('next') || '/talk';
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
    <div className="flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
          Login
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
          <form action={formAction} method="POST" className="space-y-6" autoComplete="on">
            <input type="hidden" name="next" value={next} />
            <TextInput
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              label="Email address"
              defaultValue={state.inputs?.email}
            />
            {state.errors?.email && (
              <p className="mt-2 text-sm text-red-500">{state.errors.email.join(', ')}</p>
            )}

            <div>
              <Button type="submit" className="flex w-full justify-center" disabled={isPending}>
                {isPending ? 'Sending login link...' : 'Send Login Link'}
              </Button>
            </div>
          </form>

          <div>
            <div className="relative mt-10">
              <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm/6 font-medium">
                <span className="bg-white px-6 text-gray-900">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <Button
                type="button"
                color="zinc"
                className="w-full flex items-center justify-center gap-3 ring-1 ring-inset ring-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-transparent"
                onClick={handleGoogleSignIn}
                disabled={isPending}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                  <path
                    d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                    fill="#EA4335"
                  />
                  <path
                    d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26540 14.29L1.27539 17.385C3.25539 21.31 7.31040 24.0001 12.0004 24.0001Z"
                    fill="#34A853"
                  />
                </svg>
                <span className="text-sm/6 font-semibold">Google</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
