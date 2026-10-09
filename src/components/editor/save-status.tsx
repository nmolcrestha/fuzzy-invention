"use client";

import { AlertTriangleIcon, CheckIcon, CloudOffIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { useEditor } from "./store";

/** Always-visible save state (requirement §8.1). */
export function SaveStatus({ onRetry }: { onRetry: () => void }) {
  const status = useEditor((state) => state.status);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      {status.state === "saved" && (
        <>
          <CheckIcon className="size-4 text-emerald-600" aria-hidden />
          <span>Draft saved</span>
        </>
      )}
      {(status.state === "pending" || status.state === "saving") && (
        <>
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          <span>Saving…</span>
        </>
      )}
      {status.state === "offline" && (
        <>
          <CloudOffIcon className="size-4 text-amber-600" aria-hidden />
          <span>Offline. Changes will save when you reconnect.</span>
        </>
      )}
      {status.state === "error" && <RetryStatus retryInMs={status.retryInMs} onRetry={onRetry} />}
      {status.state === "conflict" && (
        <>
          <AlertTriangleIcon className="size-4 text-destructive" aria-hidden />
          <span className="text-destructive">Not saved</span>
        </>
      )}
    </div>
  );
}

function RetryStatus({ retryInMs, onRetry }: { retryInMs: number; onRetry: () => void }) {
  const [deadline] = useState(() => Date.now() + retryInMs);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));

  return (
    <>
      <AlertTriangleIcon className="size-4 text-amber-600" aria-hidden />
      <span>Couldn&apos;t save. Retrying{seconds > 0 ? ` in ${seconds}s` : "…"}</span>
      <Button variant="link" size="sm" className="h-auto px-1" onClick={onRetry}>
        Retry now
      </Button>
    </>
  );
}
