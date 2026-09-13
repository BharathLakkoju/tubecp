import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import AuthFormShell from "@/components/AuthFormShell";
import { ResetPasswordForm } from "@/components/AuthForms";

type SearchParams = {
  token?: string;
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <MarketingLayout showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <div className="page-container flex-1">
          <AuthFormShell
            title="Choose a new password"
            subtitle="Enter a new password for your account. This link expires after 1 hour."
          >
            <ResetPasswordForm token={token} />
          </AuthFormShell>
        </div>
      </div>
    </MarketingLayout>
  );
}
