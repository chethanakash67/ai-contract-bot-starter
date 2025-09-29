import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function maskDbUrl(url?: string) {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.password) u.password = "****";
    return u.toString();
  } catch {
    return "(unparseable)";
  }
}

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const masked = maskDbUrl(dbUrl);

  const test = async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
    }
  };

  const connectivity = await Promise.race([
    test(),
    new Promise((resolve) => setTimeout(() => resolve({ ok: false, error: "timeout" }), 2000))
  ]);

  return NextResponse.json({ dbUrl: masked, connectivity });
}

