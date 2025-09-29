import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set(["draft","review","out_for_signature","executed","void"]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}) {
  const { status } = await req.json();
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await prisma.agreement.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json({ ok: true });
}

