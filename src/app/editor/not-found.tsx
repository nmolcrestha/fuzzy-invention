import { SearchXIcon } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";

export default function EditorNotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <EmptyState
        icon={SearchXIcon}
        title="We couldn't find that page"
        description="It may have been deleted, or the link is wrong."
        action={<ButtonLink href="/dashboard">Go to your sites</ButtonLink>}
        className="w-full max-w-lg"
      />
    </div>
  );
}
