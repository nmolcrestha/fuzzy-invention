import { SearchXIcon } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";

export default function DashboardNotFound() {
  return (
    <EmptyState
      icon={SearchXIcon}
      title="We couldn't find that website"
      description="It may have been deleted, or the link is wrong. Deleted websites can be restored from your sites list."
      action={<ButtonLink href="/dashboard">Go to your sites</ButtonLink>}
    />
  );
}
