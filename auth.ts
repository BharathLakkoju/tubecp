import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import NeonAdapter from "@auth/neon-adapter";
import { getConfiguredOAuthProviders } from "@/lib/auth-providers";
import { createDbPool } from "@/lib/db";
import { ensureUserSubscription } from "@/lib/billing/subscription";

function buildProviders(): NextAuthConfig["providers"] {
  const providers: NextAuthConfig["providers"] = [];
  const configured = getConfiguredOAuthProviders();

  if (configured.includes("google")) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    );
  }

  if (configured.includes("github")) {
    providers.push(
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      })
    );
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const pool = createDbPool();

  return {
    adapter: NeonAdapter(pool),
    providers: buildProviders(),
    pages: {
      signIn: "/sign-in",
    },
    session: {
      strategy: "database",
    },
    // Required for ngrok / Vercel preview hosts; set AUTH_URL in production.
    trustHost: true,
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          session.user.id = String(user.id);
        }
        return session;
      },
    },
    events: {
      async createUser({ user }) {
        if (user.id) {
          await ensureUserSubscription(String(user.id));
        }
      },
    },
  };
});
