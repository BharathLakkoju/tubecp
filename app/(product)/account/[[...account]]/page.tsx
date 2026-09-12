import AccountProfile from "@/components/AccountProfile";
import MobileNavToggle from "@/components/MobileNavToggle";

export default function AccountPage() {
  if (process.env.E2E_AUTH_BYPASS === "true") {
    return (
      <div className="app-panel" data-testid="e2e-account">
        <div className="app-panel-scroll">
          <header className="border-b border-border pb-4">
            <div className="app-inline-header-row">
              <MobileNavToggle />
              <div className="app-inline-header-text">
                <h1 className="font-mono text-lg font-semibold text-text">
                  Account
                </h1>
                <p className="mt-2 font-mono text-[13px] text-text-muted">
                  Authentication is bypassed in E2E test mode.
                </p>
              </div>
            </div>
          </header>
        </div>
      </div>
    );
  }

  return (
    <div className="app-panel">
      <div className="app-panel-scroll">
        <header className="mb-6 border-b border-border pb-4">
          <div className="app-inline-header-row">
            <MobileNavToggle />
            <div className="app-inline-header-text">
              <h1 className="font-mono text-lg font-semibold text-text">
                Account
              </h1>
              <p className="mt-2 font-mono text-[13px] text-text-muted">
                Profile and password settings.
              </p>
            </div>
          </div>
        </header>
        <AccountProfile />
      </div>
    </div>
  );
}
