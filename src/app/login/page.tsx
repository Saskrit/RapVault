import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export default function LoginPage() {
  return (
    <PageShell>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </PageShell>
  );
}
