import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
