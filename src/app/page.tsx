import { LayersIcon } from "lucide-react";

import { ButtonLink } from "@/components/button-link";

// Placeholder marketing page. The real landing page comes later.
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between p-6">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayersIcon className="size-4" aria-hidden />
          </span>
          Side Quest
        </span>
        <ButtonLink variant="ghost" href="/login">
          Log in
        </ButtonLink>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Your website, live in minutes
        </h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          Pick a template for your SaaS, company or restaurant, change the words and pictures, and
          publish. No coding needed.
        </p>
        <div className="flex gap-3">
          <ButtonLink size="lg" href="/signup">
            Get started free
          </ButtonLink>
          <ButtonLink size="lg" variant="outline" href="/login">
            Log in
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
