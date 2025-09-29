import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const items = await prisma.agreement.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    const withNames = items.map((a: any) => {
      let v: any = {};
      try { v = a.variables ? JSON.parse(a.variables) : {}; } catch { v = {}; }
      const discloser = v.discloser_name || v.provider_name || v.party_a || '';
      const recipient = v.recipient_name || v.client_name || v.party_b || '';
      const nameA = String(discloser || '').trim();
      const nameB = String(recipient || '').trim();
      const displayA = nameA || 'Untitled';
      const displayB = nameB || '';
      return { ...a, discloser_name: displayA, recipient_name: displayB };
    });
    return NextResponse.json(withNames);
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateId, ...vars } = body || {};

    let tplId: string | undefined = typeof templateId === "string" ? templateId.trim() : undefined;

    // Resolve common slugs to actual template IDs
    async function resolveTemplateId(slug?: string): Promise<string> {
      if (!slug) {
        const t = await prisma.template.findFirst({ where: { type: 'nda' }, orderBy: { createdAt: 'desc' } })
          || await prisma.template.findFirst({ where: { name: "Balanced NDA v1" } });
        if (!t) throw new Error('No default template found');
        return t.id;
      }
      // If it looks like a cuid, try fetch by id
      if (/^c[a-z0-9]{20,}$/i.test(slug)) {
        const t = await prisma.template.findUnique({ where: { id: slug } });
        if (t) return t.id;
      }
      const key = slug.toLowerCase();
      if (key === 'nda') {
        const t = await prisma.template.findFirst({ where: { type: 'nda' }, orderBy: { createdAt: 'desc' } });
        if (t) return t.id;
      } else if (key === 'service' || key === 'msa' || key.includes('service')) {
        const t = await prisma.template.findFirst({ where: { type: 'service' }, orderBy: { createdAt: 'desc' } });
        if (t) return t.id;
      } else if (key === 'custom' || key === 'blank') {
        let t = await prisma.template.findFirst({ where: { type: 'custom' } });
        if (!t) {
          t = await prisma.template.create({ data: { name: 'Custom Blank', type: 'custom', content: JSON.stringify({ body: '<h1>Untitled Agreement</h1><p>Start drafting…</p>' }) } });
        }
        return t.id;
      }
      // Fallback to name match
      const t = await prisma.template.findFirst({ where: { name: slug } });
      if (t) return t.id;
      // Finally: default to NDA
      const def = await prisma.template.findFirst({ where: { type: 'nda' }, orderBy: { createdAt: 'desc' } })
        || await prisma.template.findFirst({ where: { name: 'Balanced NDA v1' } });
      if (!def) throw new Error('No default template found');
      return def.id;
    }

    tplId = await resolveTemplateId(tplId);

    const ag = await prisma.agreement.create({
      data: { templateId: tplId, orgId: "demo-org", variables: JSON.stringify(vars || {}), status: "draft" }
    });
    return NextResponse.json({ id: ag.id });
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    const code = err?.code;
    if (code === "P1001" || /Can't reach database server/i.test(message)) {
      return NextResponse.json(
        {
          error: "Database unreachable",
          hint:
            "Start Postgres: `docker compose up -d` then run `npx prisma db push` and `npm run seed`.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
