import type { NextAuthConfig } from "next-auth";

/**
 * Runtime-agnostic slice of the Auth.js config — pages, callbacks and session
 * shape only. It must stay free of Node-only imports (`node:crypto`, the demo
 * store, bcrypt) so `proxy.ts` can verify the JWT cookie without pulling the
 * whole seeded dataset into the per-request bundle.
 *
 * The Credentials provider (which does need those) lives in `auth.ts`.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET || "om-logistics-demo-secret-key-12345",
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
