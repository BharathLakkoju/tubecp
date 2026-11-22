import { redirect } from "next/navigation";
import { auth } from "@/auth";
import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import AuthFormShell from "@/components/AuthFormShell";
import { SignInForm } from "@/components/AuthForms";
import { getConfiguredOAuthProviders, oauthProvidersToShow } from "@/lib/auth-providers";
import { isCheckoutCallback, resolveAuthCallbackUrl } from "@/lib/billing/checkout-flow";

type SearchParams = {
  callbackUrl?: string;
  plan?: string;
  error?: string;
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const configuredProviders = getConfiguredOAuthProviders();
  const providers = oauthProvidersToShow(configuredProviders);
  const callbackUrl = resolveAuthCallbackUrl(params);
  const upgrading = isCheckoutCallback(callbackUrl);

  if (process.env.E2E_AUTH_BYPASS !== "true") {
    const session = await auth();
    if (session?.user) {
      redirect(callbackUrl.startsWith("/") ? callbackUrl : "/app");
    }
  }

  if (process.env.E2E_AUTH_BYPASS === "true") {
    return (
      <MarketingLayout>
        <div data-testid="e2e-sign-in" className="flex min-h-dvh flex-col">
          <SiteNav variant="landing" />
          <div id="main-content" className="flex-1">
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
    <MarketingLayout>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <div id="main-content" className="flex-1">
          <AuthFormShell
            title={upgrading ? "Sign in to continue" : "Welcome back"}
            subtitle={
              upgrading
                ? "Sign in or create an account to complete your upgrade. Your free plan stays active until payment succeeds."
                : "Sign in with email and password, or continue with Google or GitHub."
            }
          >
            <SignInForm
              providers={providers}
              configuredProviders={configuredProviders}
              callbackUrl={callbackUrl}
              oauthError={params.error}
            />
          </AuthFormShell>
        </div>
      </div>
    </MarketingLayout>
  );
}
