import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import AuthFormShell from "@/components/AuthFormShell";
import { SignInForm } from "@/components/AuthForms";
import { getConfiguredOAuthProviders } from "@/lib/auth-providers";
import { isCheckoutCallback, resolveAuthCallbackUrl } from "@/lib/billing/checkout-flow";

type SearchParams = {
  callbackUrl?: string;
  plan?: string;
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const providers = getConfiguredOAuthProviders();
  const callbackUrl = resolveAuthCallbackUrl(params);
  const upgrading = isCheckoutCallback(callbackUrl);

  if (process.env.E2E_AUTH_BYPASS === "true") {
    return (
      <MarketingLayout showThemeSwitcher={false}>
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
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <div className="page-container flex-1">
          <AuthFormShell
            title={upgrading ? "Sign in to continue" : "Welcome back"}
            subtitle={
              upgrading
                ? "Sign in or create an account to complete your upgrade. Your free plan stays active until payment succeeds."
                : "Sign in with email and password, or continue with Google or GitHub."
            }
          >
            <SignInForm providers={providers} callbackUrl={callbackUrl} />
          </AuthFormShell>
        </div>
      </div>
    </MarketingLayout>
  );
}
