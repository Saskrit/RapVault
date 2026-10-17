import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <PageShell>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </PageShell>
  );
}
