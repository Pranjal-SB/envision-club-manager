import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * A bcrypt hash of a value nobody can supply. Compared against when the email
 * does not exist, so a missing account and a wrong password take the same time
 * to reject — otherwise response latency enumerates who is in the club.
 */
const DUMMY_HASH = "$2b$12$UESaABgGcbZm0FJOmnDuE.UOa/rf3fckX.NUk92SFeX.PRxjuGoUe";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The Credentials provider REQUIRES the JWT strategy. Auth.js throws
  // UnsupportedStrategy with a database strategy, because credentials users are
  // never written to an adapter and so cannot be looked up by session token.
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = String(raw?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(raw?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, passwordHash: true },
        });

        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        return ok && user ? { id: user.id } : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    /**
     * The token carries identity and nothing else. Role and project membership
     * are deliberately absent: an admin demoted mid-session would otherwise keep
     * a cookie asserting ADMIN until it expired. Both are read fresh from the
     * database in guard.ts on every decision.
     */
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
