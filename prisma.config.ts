import { defineConfig } from "prisma/config";

// Prisma 7 does not auto-load .env; load it when present (Node ≥ 20.12).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file — DEMO_MODE does not need a database.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Empty is fine for `prisma generate`; migrate/seed require a real DATABASE_URL.
    url: process.env.DATABASE_URL ?? "",
  },
});
