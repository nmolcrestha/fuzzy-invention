import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { env } from "@/env";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  return (
    <AuthCard
      title="Create your account"
      description="Build and publish your website in minutes. No coding needed."
    >
      <SignupForm googleEnabled={googleEnabled} />
    </AuthCard>
  );
}
