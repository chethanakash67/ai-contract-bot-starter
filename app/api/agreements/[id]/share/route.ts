import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { randomBytes } from "crypto";

function randomToken(len = 16) {
  return randomBytes(len).toString('hex');
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await requireSession();
  const { allowDownload = true, expiresInDays }: { allowDownload?: boolean; expiresInDays?: number } = await req.json().catch(() => ({}));
  const ag = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
  if (!ag) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let link = await prisma.publicLink.findFirst({ where: { agreementId: ag.id } });
  const expiresAt = typeof expiresInDays === 'number' ? new Date(Date.now() + expiresInDays * 86400_000) : null;
  if (!link) {
    link = await prisma.publicLink.create({ data: { agreementId: ag.id, token: randomToken(16), allowDownload: !!allowDownload, expiresAt: expiresAt || undefined } });
  } else {
    link = await prisma.publicLink.update({ where: { id: link.id }, data: { allowDownload: !!allowDownload, expiresAt: expiresAt || undefined } });
  }
  const base = process.env.APP_URL || new URL(req.url).origin;
  const url = `${base}/share/${link.token}`;
  return NextResponse.json({ url, token: link.token });
}
