import PageShell from "@/components/PageShell";
import SubpageNav from "@/components/SubpageNav";
import AuthFormShell from "@/components/AuthFormShell";
import { AuthSignIn } from "@/components/AuthClerk";

export default function SignInPage() {
  if (process.env.E2E_AUTH_BYPASS === "true") {
    return (
      <PageShell>
        <div data-testid="e2e-sign-in" className="flex min-h-dvh flex-col">
          <SubpageNav />
          <div className="page-container flex-1">
            <AuthFormShell
              title="Sign in"
              subtitle="Authentication is bypassed in E2E test mode."
            >
              <div />
            </AuthFormShell>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex min-h-dvh flex-col">
        <SubpageNav />
        <div className="page-container flex-1">
          <AuthFormShell
            title="Welcome back"
            subtitle="Sign in to start researching YouTube topics and building knowledge bases."
          >
            <AuthSignIn />
          </AuthFormShell>
        </div>
      </div>
    </PageShell>
  );
}
