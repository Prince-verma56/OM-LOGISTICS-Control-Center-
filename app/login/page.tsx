import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border bg-card p-6 shadow-sm md:p-8">
        <LoginForm />
      </div>
    </div>
  );
}
