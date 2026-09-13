import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import AuthFormShell from "@/components/AuthFormShell";
import { ForgotPasswordForm } from "@/components/AuthForms";

export default function ForgotPasswordPage() {
  return (
    <MarketingLayout showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <div className="page-container flex-1">
          <AuthFormShell
            title="Reset password"
            subtitle="For accounts created with email and password only. Google and GitHub sign-in cannot be reset here."
          >
            <ForgotPasswordForm />
          </AuthFormShell>
        </div>
      </div>
    </MarketingLayout>
  );
}
