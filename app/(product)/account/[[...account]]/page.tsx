import Link from "next/link";
import { auth } from "@/auth";
import AccountProfile from "@/components/AccountProfile";
import AppPage from "@/components/tubecp/AppPage";
import { PageHeading } from "@/components/tubecp/FormKit";
import { shouldShowTeamWorkspace } from "@/lib/account/team-workspace";
import { isAdminUserId } from "@/lib/admin";

export default async function AccountPage() {
  const session = await auth();
  const showAdminLink = session?.user?.id ? isAdminUserId(session.user.id) : false;
  const showTeamWorkspace = await shouldShowTeamWorkspace(session?.user?.id);

  if (process.env.E2E_AUTH_BYPASS === "true") {
    return (
      <AppPage width="reading">
        <div data-testid="e2e-account">
          <PageHeading title="Account" description="Authentication is bypassed in E2E test mode." />
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage width="reading">
      <div className="flex flex-col gap-6 pt-4">
        <PageHeading title="Account" description="Profile, password, and integrations." />
        <p className="text-body-sm text-foreground-secondary">
          <Link href="/account/billing" prefetch={false} className="text-primary underline underline-offset-2">
            Billing &amp; plans
          </Link>
          {showAdminLink && (
            <>
              {" · "}
              <Link href="/admin/usage" prefetch={false} className="text-primary underline underline-offset-2">
                Operator usage dashboard
              </Link>
            </>
          )}
        </p>
        <AccountProfile showTeamWorkspace={showTeamWorkspace} />
      </div>
    </AppPage>
  );
}
