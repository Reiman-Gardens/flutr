import type { NextAuthConfig } from "next-auth";
import { authSecret } from "@/lib/auth-secret";

// Edge-safe base config (no providers, no DB, no bcrypt).
//
// - `src/middleware.ts` imports this directly so it can run on Edge runtime.
// - `src/auth.ts` extends this with the Credentials provider for Node runtime.
//
// Keeping providers out of this file prevents bcrypt/Drizzle from leaking into
// the Edge bundle. The `jwt` and `session` callbacks only touch the token/session
// objects, so they are safe on Edge.

export default {
  secret: authSecret,
  // Providers are added in `src/auth.ts`. Required here by the `NextAuthConfig` type,
  // but intentionally empty so this config stays Edge-safe.
  providers: [],
  callbacks: {
    // Persist role + institutionId + institutionSlug into the JWT when the user signs in.
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.institutionId = user.institutionId;
        if (user.institutionSlug) token.institutionSlug = user.institutionSlug;
      }
      return token;
    },

    // Surface id, role, institutionId, and institutionSlug on session.user for client use.
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.institutionId = token.institutionId;
      if (token.institutionSlug) session.user.institutionSlug = token.institutionSlug;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
