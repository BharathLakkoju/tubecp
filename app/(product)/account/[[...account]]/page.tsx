import Link from "next/link";
import { auth } from "@/auth";
import AccountProfile from "@/components/AccountProfile";
import MobileNavToggle from "@/components/MobileNavToggle";
import { shouldShowTeamWorkspace } from "@/lib/account/team-workspace";
import { isAdminUserId } from "@/lib/admin";

export default async function AccountPage() {
  const session = await auth();
  const showAdminLink = session?.user?.id ? isAdminUserId(session.user.id) : false;
  const showTeamWorkspace = await shouldShowTeamWorkspace(session?.user?.id);
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
        {showAdminLink && (
          <p className="mb-6 font-mono text-[13px] text-text-muted">
            <Link href="/admin/usage" className="text-accent underline-offset-2 hover:underline">
              Operator usage dashboard →
            </Link>
          </p>
        )}
        <AccountProfile showTeamWorkspace={showTeamWorkspace} />
      </div>
    </div>
  );
}
