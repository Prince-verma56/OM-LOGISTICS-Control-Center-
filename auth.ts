import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { compareSync } from "bcryptjs";
import { authConfig } from "@/auth.config";
import { getRepositories } from "@/data/repositories";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Full Auth.js instance — the shared config plus the Credentials provider,
 * which needs bcrypt and the repository registry. Only import this from server
 * code that runs in the Node.js runtime (route handlers, `withApi`); `proxy.ts`
 * builds its own lightweight instance from `authConfig` instead.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await getRepositories().users.getByEmail(email);

        if (!user || !user.passwordHash) return null;
        if (!compareSync(password, user.passwordHash)) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
