import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: { id: string }}) {
  try {
    const ag = await prisma.agreement.findUnique({ where: { id: params.id } });
    let v: any = {};
    if (typeof ag?.variables === "string") {
      try { v = JSON.parse(ag.variables); } catch { v = {}; }
    } else if (ag?.variables) {
      v = ag.variables as any;
    }
    const errors: string[] = [];
    if (!v.discloser_name && !v.provider_name) errors.push("Party A missing");
    if (!v.recipient_name && !v.client_name) errors.push("Party B missing");
    if (!v.start_date) errors.push("Start date missing");
    if (!v.end_date) errors.push("End date missing");
    if (!v.jurisdiction) errors.push("Governing law missing");
    // Optional: for service templates, encourage payment fields
    if ((v.provider_name || v.client_name) && (!v.fees || !v.payment_terms)) {
      errors.push("Payment details recommended (fees/payment_terms)");
    }
    return NextResponse.json({ ok: errors.length === 0, errors });
  } catch (e: any) {
    const msg = e?.message || String(e);
    return NextResponse.json({ ok: false, errors: [msg] }, { status: 500 });
  }
}
