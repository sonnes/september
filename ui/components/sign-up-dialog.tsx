"use client";

import {
  Dialog,
  DialogTitle,
  DialogBody,
  DialogActions,
} from "@/components/catalyst/dialog";
import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { Field, Label } from "@/components/catalyst/fieldset";
import { useState } from "react";
import { signIn } from "next-auth/react";

export function SignUpDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, name, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sign up");
      }

      await signIn("credentials", {
        email,
        password,
        redirectTo: "/talk",
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Sign up</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 font-medium">{error}</div>
            )}
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </Field>
          </div>
        </DialogBody>
        <DialogActions>
          <Button type="button" plain onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Sign up</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
