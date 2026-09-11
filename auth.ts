import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import NeonAdapter from "@auth/neon-adapter";
import { getConfiguredOAuthProviders } from "@/lib/auth-providers";
import { signInSchema } from "@/lib/auth-schemas";
import { createDbPool } from "@/lib/db";
import { ensureUserSubscription } from "@/lib/billing/subscription";
import { verifyUserPassword } from "@/lib/users";

function buildProviders(): NextAuthConfig["providers"] {
  const providers: NextAuthConfig["providers"] = [
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await verifyUserPassword(parsed.data.email, parsed.data.password);
        if (!user) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ];

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
    // Credentials provider requires JWT sessions in Auth.js.
    session: {
      strategy: "jwt",
    },
    trustHost: true,
    callbacks: {
      async jwt({ token, user }) {
        if (user?.id) {
          token.sub = String(user.id);
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user && token.sub) {
          session.user.id = token.sub;
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
