import PageShell from "@/components/PageShell";
import SiteNav from "@/components/SiteNav";
import AuthFormShell from "@/components/AuthFormShell";
import { SignUpForm } from "@/components/AuthForms";
import { getConfiguredOAuthProviders } from "@/lib/auth-providers";

export default function SignUpPage() {
  const providers = getConfiguredOAuthProviders();

  return (
    <PageShell showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <div className="page-container flex-1">
          <AuthFormShell
            title="Create your account"
            subtitle="Sign up with your name and email, or continue with Google or GitHub."
          >
            <SignUpForm providers={providers} />
          </AuthFormShell>
        </div>
      </div>
    </PageShell>
  );
}
