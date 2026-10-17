import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export default function RegisterPage() {
  return (
    <PageShell>
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </PageShell>
  );
}
