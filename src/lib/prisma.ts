import { PrismaClient } from "@prisma/client";

// Normalize SQLite path for production (e.g., Render) where the repo dir may be read-only.
// If DATABASE_URL uses a relative SQLite path like `file:./dev.db` in production, rewrite to /tmp.
(() => {
  const u = process.env.DATABASE_URL || "";
  if (process.env.NODE_ENV === 'production' && /^file:(\.\/|\.\.|dev\.db|\.\\)/i.test(u)) {
    process.env.DATABASE_URL = 'file:/tmp/dev.db';
  }
})();

export const prisma = (global as any).prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") (global as any).prisma = prisma;
