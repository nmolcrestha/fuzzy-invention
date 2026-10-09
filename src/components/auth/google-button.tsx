"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export function GoogleButton({ callbackUrl }: { callbackUrl: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const { error } = await signIn.social({ provider: "google", callbackURL: callbackUrl });
    if (error) {
      toast.error(authErrorMessage(error));
      setPending(false);
    }
    // On success the browser is redirected to Google, so keep the pending state.
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={pending}
      onClick={handleClick}
    >
      {pending && <Loader2Icon className="animate-spin" aria-hidden />}
      Continue with Google
    </Button>
  );
}
