"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FormAlert } from "@/components/tubecp/FormKit";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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
    return (
      <p role="status" className="flex items-center gap-2 text-body text-foreground-secondary">
        <Spinner />
        Verifying your email...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FormAlert kind={state === "success" ? "success" : "error"}>{message}</FormAlert>
      <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
        {state === "success" ? "Sign in" : "Back to sign in"}
      </Link>
    </div>
  );
}
