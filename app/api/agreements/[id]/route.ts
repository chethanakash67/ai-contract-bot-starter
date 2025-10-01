import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: { id: string }}) {
  const s = await requireSession();
  const ag = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
  if (!ag) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let v: any = {};
  try { v = ag.variables ? JSON.parse(ag.variables as any) : {}; } catch {}
  const discloser = v.discloser_name || v.provider_name || v.party_a || '';
  const recipient = v.recipient_name || v.client_name || v.party_b || '';
  const nameA = String(discloser || '').trim();
  const nameB = String(recipient || '').trim();
  const withNames = { ...ag, discloser_name: nameA, recipient_name: nameB } as any;
  return NextResponse.json(withNames);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string }}) {
  const s = await requireSession();
  const body = await req.json();
  const found = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (found.status !== 'draft') {
    return NextResponse.json({ error: 'Agreement is read-only' }, { status: 400 });
  }
  await prisma.agreement.update({ where: { id: params.id }, data: { draftHtml: body.draftHtml } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string }}) {
  try {
    const s = await requireSession();
    const found = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.agreement.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 400 });
  }
}
