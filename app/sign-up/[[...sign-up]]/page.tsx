import PageShell from "@/components/PageShell";
import SubpageNav from "@/components/SubpageNav";
import AuthFormShell from "@/components/AuthFormShell";
import { AuthSignUp } from "@/components/AuthClerk";

export default function SignUpPage() {
  return (
    <PageShell>
      <div className="flex min-h-dvh flex-col">
        <SubpageNav />
        <div className="page-container flex-1">
          <AuthFormShell
            title="Create your account"
            subtitle="Start researching YouTube topics and turn videos into chattable knowledge bases."
          >
            <AuthSignUp />
          </AuthFormShell>
        </div>
      </div>
    </PageShell>
  );
}
