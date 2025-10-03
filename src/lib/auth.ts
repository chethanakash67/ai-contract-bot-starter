import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export type Session = {
  userId: string;
  orgId: string;
  email: string;
};

export async function getSession(): Promise<Session | null> {
  try {
    const jar = cookies();
    const uid = jar.get("uid")?.value;
    const email = jar.get("uem")?.value;
    if (!uid) return null;
    const membership = await prisma.membership.findFirst({ where: { userId: uid }, include: { user: true, org: true } });
    if (!membership) return null;
    return { userId: uid, orgId: membership.orgId, email: email || membership.user.email };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("Unauthorized");
  return s;
}

export async function ensureUserAndOrg(email: string) {
  const e = email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email: e } });
  if (!user) user = await prisma.user.create({ data: { email: e } });
  let membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  if (!membership) {
    const org = await prisma.organization.create({ data: { name: `${e}-org` } });
    membership = await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: "owner" } });
  }
  return { user, membership };
}

