import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

const ALLOWED = new Set(["draft", "completed", "accepted"]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}) {
  const s = await requireSession();
  const { status } = await req.json();
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const found = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.agreement.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json({ ok: true });
}
