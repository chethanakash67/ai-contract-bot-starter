import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import HelloSign from "hellosign-sdk";
import { requireSession } from "@/lib/auth";

export async function POST(_: Request, { params }: { params: { id: string }}) {
  if (!process.env.HELLOSIGN_API_KEY) {
    return NextResponse.json({ error: "HelloSign is not configured" }, { status: 400 });
  }
  const s = await requireSession();
  const ag = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
  if (!ag?.pdfUrl) return NextResponse.json({ error: "Generate PDF first" }, { status: 400 });

  const hellosign = HelloSign({ key: process.env.HELLOSIGN_API_KEY! });
  const parties = await prisma.party.findMany({ where: { agreementId: ag.id }, orderBy: { order: "asc" } });
  const signers = parties.map((p: any, idx: number) => ({ email_address: p.email, name: p.name, order: idx + 1 }));

  const res = await hellosign.signatureRequest.send({
    test_mode: 1,
    title: "Agreement for signature",
    subject: "Please sign the agreement",
    message: "Review and sign.",
    signers,
    files: [ag.pdfUrl!]
  });

  await prisma.signatureEvent.create({ data: { agreementId: ag.id, partyId: parties[0]?.id || "", type: "sent" } });
  return NextResponse.json({ ok: true, requestId: res.signature_request?.signature_request_id });
}
