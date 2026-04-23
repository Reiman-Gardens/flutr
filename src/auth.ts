import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, institutions } from "@/lib/schema";
import { normalizeRole } from "@/lib/authz";
import authConfig from "@/auth.config";

// Full NextAuth instance (Node runtime only — imports bcrypt and the Drizzle client).
// Middleware must NOT import from this file; it uses `src/auth.config.ts` directly.

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;
        if (!email || !password) return null;

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

        const valid = await bcrypt.compare(password, row.password_hash);
        if (!valid) return null;

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
});
