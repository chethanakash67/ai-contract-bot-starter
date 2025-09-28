import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateId, ...vars } = body || {};

    let tplId: string | undefined = typeof templateId === "string" ? templateId.trim() : undefined;

    // Fallback: if no templateId provided, use or create the default one
    if (!tplId) {
      let tpl = await prisma.template.findFirst({ where: { name: "Balanced NDA v1" } });
      if (!tpl) {
        tpl = await prisma.template.create({
          data: {
            name: "Balanced NDA v1",
            type: "nda",
            content: {
              parties: { discloser: "{{discloser_name}}", recipient: "{{recipient_name}}" },
              body: `
<h1>Mutual Non-Disclosure Agreement</h1>
<p>Effective Date: {{effective_date}}</p>
<p>Between {{discloser_name}} and {{recipient_name}}.</p>
<h2>Confidential Information</h2>
<p>Information disclosed by either party that is marked or reasonably considered confidential…</p>
<h2>Term</h2>
<p>This Agreement lasts {{term_months}} months from the Effective Date.</p>
<h2>Governing Law</h2>
<p>{{jurisdiction}} law applies.</p>
<h2>Signatures</h2>
<p>— {{discloser_name}} / {{recipient_name}}</p>`
            }
          }
        });
      }
      tplId = tpl.id;
    }

    const ag = await prisma.agreement.create({
      data: { templateId: tplId, orgId: "demo-org", variables: vars, status: "draft" }
    });
    return NextResponse.json({ id: ag.id });
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
