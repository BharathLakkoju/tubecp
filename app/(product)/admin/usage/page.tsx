import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminUsageDashboard from "@/components/AdminUsageDashboard";
import { isAdminUserId } from "@/lib/admin";

export default async function AdminUsagePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !isAdminUserId(userId)) {
    redirect("/app");
  }

  return (
    <div className="app-panel">
      <div className="app-panel-scroll">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-lg font-semibold text-text">Operator usage</h1>
            <p className="mt-1 font-mono text-[13px] text-text-muted">
              Daily API cost signals across active users.
            </p>
          </div>
          <Link href="/account" className="btn-ghost" prefetch={false}>
            ← Account
          </Link>
        </div>
        <AdminUsageDashboard />
      </div>
    </div>
  );
}
