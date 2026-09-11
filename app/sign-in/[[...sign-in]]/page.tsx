import PageShell from "@/components/PageShell";
import SiteNav from "@/components/SiteNav";
import AuthFormShell from "@/components/AuthFormShell";
import { SignInForm } from "@/components/AuthForms";
import { getConfiguredOAuthProviders } from "@/lib/auth-providers";

export default function SignInPage() {
  const providers = getConfiguredOAuthProviders();

  if (process.env.E2E_AUTH_BYPASS === "true") {
    return (
      <PageShell showThemeSwitcher={false}>
        <div data-testid="e2e-sign-in" className="flex min-h-dvh flex-col">
          <SiteNav variant="landing" />
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
    <PageShell showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <div className="page-container flex-1">
          <AuthFormShell
            title="Welcome back"
            subtitle="Sign in with Google or GitHub to research YouTube topics and build knowledge bases."
          >
            <SignInForm providers={providers} />
          </AuthFormShell>
        </div>
      </div>
    </PageShell>
  );
}
