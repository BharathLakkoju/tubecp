import PageShell from "@/components/PageShell";
import SiteNav from "@/components/SiteNav";
import FadeIn from "@/components/FadeIn";
import AccountHeader from "@/components/AccountHeader";
import AccountProfile from "@/components/AccountProfile";

export default function AccountPage() {
  if (process.env.E2E_AUTH_BYPASS === "true") {
    return (
      <PageShell showThemeSwitcher={false}>
        <div data-testid="e2e-account" className="flex min-h-dvh flex-col">
          <SiteNav variant="landing" />
          <div className="page-container flex-1">
            <header className="border-b border-border pb-4">
              <h1 className="font-mono text-lg font-semibold text-text">Account</h1>
              <p className="mt-2 font-mono text-[13px] text-text-muted">
                Authentication is bypassed in E2E test mode.
              </p>
            </header>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <div className="page-container-wide flex-1">
          <FadeIn>
            <AccountHeader />
            <div className="w-full pb-8">
              <AccountProfile />
            </div>
          </FadeIn>
        </div>
      </div>
    </PageShell>
  );
}
