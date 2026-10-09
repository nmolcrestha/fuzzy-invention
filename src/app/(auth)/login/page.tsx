import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { env } from "@/env";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  return (
    <AuthCard title="Welcome back" description="Log in to manage your websites.">
      {/* LoginForm reads ?callbackUrl, which is only known at request time. */}
      <Suspense>
        <LoginForm googleEnabled={googleEnabled} />
      </Suspense>
    </AuthCard>
  );
}
