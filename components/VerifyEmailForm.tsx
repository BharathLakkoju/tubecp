"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

type VerifyState = "pending" | "success" | "error";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, setState] = useState<VerifyState>("pending");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Missing verification token.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("error");
          setMessage(data.error ?? "Verification failed.");
          return;
        }
        setState("success");
        setMessage("Your email is verified. You can sign in now.");
      })
      .catch(() => {
        setState("error");
        setMessage("Verification failed. Please try again.");
      });
  }, [token]);

  if (state === "pending") {
    return <LoadingSpinner label="Verifying your email..." />;
  }

  return (
    <div className="auth-form">
      <p
        className={
          state === "success"
            ? "border border-border bg-surface px-4 py-3 font-mono text-[13px] text-text-muted"
            : "border border-red-500/40 bg-red-500/10 px-4 py-3 font-mono text-[13px] text-red-600 dark:text-red-400"
        }
      >
        {message}
      </p>
      <Link href="/sign-in" className="btn-primary inline-flex w-fit">
        {state === "success" ? "Sign in" : "Back to sign in"}
      </Link>
    </div>
  );
}
