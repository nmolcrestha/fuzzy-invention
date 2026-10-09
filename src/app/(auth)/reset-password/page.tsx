import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description="Pick something you haven't used before.">
      {/* The reset token arrives as ?token=, which is only known at request time. */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
