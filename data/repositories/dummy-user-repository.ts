import type { UserRepository, UserRecord } from "./types";

import { hashSync } from "bcryptjs";

const demoAdminEmail = process.env.DEMO_ADMIN_EMAIL || "prince.dev@gmail.com";
const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD || "123456";

const DEMO_USERS: UserRecord[] = [
  {
    id: "usr_admin_001",
    name: "Admin",
    email: demoAdminEmail,
    passwordHash: hashSync(demoAdminPassword, 10),
    role: "ADMIN",
    status: "ACTIVE",
  },
];

export class DummyUserRepository implements UserRepository {
  async getByEmail(email: string): Promise<UserRecord | undefined> {
    return DEMO_USERS.find((u) => u.email === email);
  }

  async getById(id: string): Promise<UserRecord | undefined> {
    return DEMO_USERS.find((u) => u.id === id);
  }
}
