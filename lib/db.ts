import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getAppConfig } from "@/lib/config/app";

/**
 * PostgreSQL access (Prisma 7 + pg driver adapter).
 *
 * Not used in DEMO_MODE: the demo runs on in-memory repositories and needs no
 * database. Future Prisma repositories (data/repositories/prisma-*) will call
 * `getDb()`. Page components must never import this module.
 */

type GlobalWithPrisma = typeof globalThis & { __omPrisma?: PrismaClient };

export function isDatabaseConfigured(): boolean {
  return Boolean(getAppConfig().databaseUrl);
}

export function getDb(): PrismaClient {
  const url = getAppConfig().databaseUrl;
  if (!url) {
    throw new Error("DATABASE_URL is not configured. DEMO_MODE uses in-memory repositories and does not require a database.");
  }
  const scope = globalThis as GlobalWithPrisma;
  // Reuse one client across dev hot-reloads.
  scope.__omPrisma ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  return scope.__omPrisma;
}
