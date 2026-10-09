"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || linkError) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          {authErrorMessage({ code: linkError ?? "INVALID_TOKEN" })}
        </p>
        <Button nativeButton={false} render={<Link href="/forgot-password" />} className="w-full">
          Request a new link
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));

    if (newPassword !== String(form.get("confirm"))) {
      setError("The two passwords don't match.");
      return;
    }

    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token: token! });

    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }

    toast.success(
      "Password updated. You've been logged out of all devices. Log in with your new password.",
    );
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            autoFocus
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm">Repeat new password</FieldLabel>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>

        {error && <FieldError>{error}</FieldError>}

        <FieldDescription>For your security, this logs you out on every device.</FieldDescription>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          Save new password
        </Button>
      </FieldGroup>
    </form>
  );
}
