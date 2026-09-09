import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (process.env.E2E_AUTH_BYPASS === "true") {
    return (
      <div
        data-testid="e2e-sign-in"
        style={{ display: "flex", justifyContent: "center", padding: "4rem 1rem" }}
      >
        <div>
          <h1>Sign in</h1>
          <p>Authentication is bypassed in E2E test mode.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "4rem 1rem" }}>
      <SignIn />
    </div>
  );
}
