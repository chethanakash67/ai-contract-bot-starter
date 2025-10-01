import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildAgreementLatex } from "@/lib/latex";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession();
    const ag = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
    if (!ag) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    let v: any = {};
    try { v = ag.variables ? JSON.parse(ag.variables as any) : {}; } catch {}

    const kind = ag.kind || 'contract';
    const title = kind === 'proposal' ? 'Project Proposal' : 'Agreement';
    const parties = {
      a: v.discloser_name,
      b: v.recipient_name,
      provider: v.provider_name,
      client: v.client_name,
    };
    const tex = buildAgreementLatex({
      kind,
      title,
      parties,
      period: { start: v.start_date, end: v.end_date },
      jurisdiction: v.jurisdiction,
      description: v.description,
      fees: v.fees,
      timeline: v.timeline,
      bodyHtml: ag.draftHtml || null,
      documentDate: v.effective_date || v.start_date || (ag.createdAt ? ag.createdAt.toISOString() : undefined),
      watermark: 'VA',
    });

    return new NextResponse(Buffer.from(tex, 'utf8'), {
      headers: {
        'Content-Type': 'application/x-tex; charset=utf-8',
        'Content-Disposition': `attachment; filename=agreement-${ag.id}.tex`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
