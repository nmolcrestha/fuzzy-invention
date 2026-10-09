import { LayersIcon } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayersIcon className="size-4" aria-hidden />
        </span>
        Side Quest
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
