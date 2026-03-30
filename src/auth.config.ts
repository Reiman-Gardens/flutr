import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { users, institutions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { normalizeRole } from "@/lib/authz";

// NextAuth configuration: Credentials provider using bcrypt-hashed passwords
// Important behavior:
// - `authorize` verifies the provided email/password against the DB using bcrypt.compare
// - On success we return a minimal `user` object. The `jwt` callback persists important
//   fields (role, institutionId, institutionSlug) into the token so they are available in
//   middlewares and server-side code without extra DB lookups.
// - The `session` callback copies those token fields onto `session.user` so client
//   code can easily access `role`, `institutionId`, and `institutionSlug` (read-only).

export default {
  providers: [
    Credentials({
      // We accept `email` + `password` form fields
      // We accept `email` + `password` form fields
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;
        if (!email || !password) return null;

        // Look up user by email with institution slug in a single join query.
        const [row] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            password_hash: users.password_hash,
            role: users.role,
            institution_id: users.institution_id,
            institution_slug: institutions.slug,
          })
          .from(users)
          .leftJoin(institutions, eq(users.institution_id, institutions.id))
          .where(eq(users.email, email))
          .limit(1);

        if (!row) return null;

        // Verify bcrypt password hash
        const valid = await bcrypt.compare(password, row.password_hash);
        if (!valid) return null;

        // Return the public session user object. We include `role`, `institutionId`,
        // and `institutionSlug` so they can be propagated into the JWT in the `jwt` callback.
        return {
          id: String(row.id),
          name: row.name,
          email: row.email,
          role: normalizeRole(row.role),
          institutionId: row.institution_id,
          institutionSlug: row.institution_slug ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    // Persist role + institutionId + institutionSlug into the JWT token when the user signs in.
    // This keeps authorization decisions fast and avoids repeated DB reads.
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.institutionId = user.institutionId;
        if (user.institutionSlug) token.institutionSlug = user.institutionSlug;
      }
      return token;
    },

    // Make sure session.user contains id, role, institutionId, and institutionSlug for client use.
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.institutionId = token.institutionId;
      if (token.institutionSlug) session.user.institutionSlug = token.institutionSlug;
      return session;
    },
  },
  // Redirect users to our custom login page
  // Redirect users to our custom login page
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
