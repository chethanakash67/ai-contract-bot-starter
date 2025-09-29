import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: { id: string }}) {
  const ag = await prisma.agreement.findUnique({ where: { id: params.id } });
  return NextResponse.json(ag);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string }}) {
  const body = await req.json();
  await prisma.agreement.update({ where: { id: params.id }, data: { draftHtml: body.draftHtml } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string }}) {
  try {
    await prisma.agreement.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 400 });
  }
}
