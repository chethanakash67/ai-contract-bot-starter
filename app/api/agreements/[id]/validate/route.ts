import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const ag = await prisma.agreement.findUnique({ where: { id: params.id } });
  const v: any = ag?.variables || {};
  const errors: string[] = [];
  if (!v.discloser_name || !v.recipient_name) errors.push("Parties missing");
  if (!v.effective_date) errors.push("Effective date missing");
  if (!v.term_months) errors.push("Term missing");
  if (!v.jurisdiction) errors.push("Governing law missing");
  return NextResponse.json({ ok: errors.length === 0, errors });
}
