import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminUsageDashboard from "@/components/AdminUsageDashboard";
import AppPage from "@/components/tubecp/AppPage";
import { PageHeading } from "@/components/tubecp/FormKit";
import { isAdminUserId } from "@/lib/admin";

export default async function AdminUsagePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !isAdminUserId(userId)) {
    redirect("/app");
  }

  return (
    <AppPage>
      <div className="flex flex-col gap-6 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeading
            title="Operator usage"
            description="Daily API cost signals across active users."
          />
          <Link
            href="/account"
            prefetch={false}
            className="text-label text-primary underline-offset-2 hover:underline"
          >
            Back to account
          </Link>
        </div>
        <AdminUsageDashboard />
      </div>
    </AppPage>
  );
}
