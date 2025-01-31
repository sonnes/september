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

export function SignInDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirectTo: "/talk",
      });

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }

      onClose();
    } catch (err) {
      setError("Something went wrong");
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Sign in</DialogTitle>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
          </div>
        </DialogBody>
        <DialogActions>
          <Button type="button" plain onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Sign in</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
