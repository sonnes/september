"use client";

import { useState } from "react";
import { Heading } from "@/components/catalyst/heading";
import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import SingleColumnLayout from "@/layouts/single-column";
import { Field, Label } from "@/components/catalyst/fieldset";
import { signIn } from "next-auth/react";

function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirectTo: "/talk",
      });

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 pb-12 md:grid-cols-3">
        <div>
          <Heading level={2}>Welcome Back</Heading>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Please enter your credentials to access your account.
          </p>
        </div>

        <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 md:col-span-2">
          <div className="col-span-full">
            <Field>
              <Label>Email</Label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
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
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="••••••••"
              />
            </Field>
          </div>

          <div className="col-span-full flex items-center justify-between">
            <a
              href="#"
              className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm text-center">{error}</div>}

      <div className="flex flex-col space-y-4">
        <Button type="submit" className="w-full sm:w-auto">
          Sign In
        </Button>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don't have an account?{" "}
          <a
            href="/signup"
            className="text-blue-600 hover:text-blue-500 hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <SingleColumnLayout title="Login" color="cyan">
      <div className="p-6">
        <LoginForm />
      </div>
    </SingleColumnLayout>
  );
}
