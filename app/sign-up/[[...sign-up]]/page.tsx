import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import AuthFormShell from "@/components/AuthFormShell";
import { SignUpForm } from "@/components/AuthForms";
import { getConfiguredOAuthProviders } from "@/lib/auth-providers";
import { isCheckoutCallback, resolveAuthCallbackUrl } from "@/lib/billing/checkout-flow";

type SearchParams = {
  callbackUrl?: string;
  plan?: string;
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const providers = getConfiguredOAuthProviders();
  const callbackUrl = resolveAuthCallbackUrl(params);
  const upgrading = isCheckoutCallback(callbackUrl);

  return (
    <MarketingLayout>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <div id="main-content" className="flex-1">
          <AuthFormShell
            title={upgrading ? "Create your account" : "Create your account"}
            subtitle={
              upgrading
                ? "Create an account to continue to checkout. You stay on the free plan until payment completes."
                : "Sign up with your name and email, or continue with Google or GitHub."
            }
          >
            <SignUpForm providers={providers} callbackUrl={callbackUrl} />
          </AuthFormShell>
        </div>
      </div>
    </MarketingLayout>
  );
}
