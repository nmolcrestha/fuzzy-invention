"use client";

import { Loader2Icon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient, signUp } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { DEFAULT_AUTHED_PATH } from "@/lib/safe-redirect";

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    setPending(true);
    setError(null);

    const { error } = await signUp.email({
      name: String(form.get("name")).trim(),
      email,
      password: String(form.get("password")),
      callbackURL: DEFAULT_AUTHED_PATH,
    });

    setPending(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setSentTo(email);
  }

  async function resend() {
    if (!sentTo) return;
    const { error } = await authClient.sendVerificationEmail({
      email: sentTo,
      callbackURL: DEFAULT_AUTHED_PATH,
    });
    if (error) toast.error(authErrorMessage(error));
    else toast.success(`We sent a new link to ${sentTo}.`);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <MailCheckIcon className="size-6" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 className="font-semibold">Check your inbox</h2>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{sentTo}</span>. Click it to finish
            creating your account.
          </p>
        </div>
        <Button variant="outline" onClick={resend}>
          Send the link again
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <Input id="name" name="name" autoComplete="name" required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
        </Field>

        {error && <FieldError>{error}</FieldError>}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? "Creating your account…" : "Create account"}
        </Button>

        {googleEnabled && <GoogleButton callbackUrl={DEFAULT_AUTHED_PATH} />}

        <FieldDescription className="text-center">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Log in
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
