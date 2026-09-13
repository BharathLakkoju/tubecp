import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import AuthFormShell from "@/components/AuthFormShell";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";

type SearchParams = {
  token?: string;
};

export default async function VerifyEmailPage({
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
            title="Verify email"
            subtitle="Confirming your Tubecp account email address."
          >
            <VerifyEmailForm token={token} />
          </AuthFormShell>
        </div>
      </div>
    </MarketingLayout>
  );
}
