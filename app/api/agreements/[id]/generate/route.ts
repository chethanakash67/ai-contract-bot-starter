import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const s = await requireSession();
  const ag = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
  if (!ag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve template by stored id or slug fallback
  let tpl = await prisma.template.findUnique({ where: { id: ag.templateId } });
  if (!tpl) {
    const key = (ag.templateId || '').toLowerCase();
    if (key) {
      if (key === 'nda') {
        tpl = await prisma.template.findFirst({ where: { type: 'nda' }, orderBy: { createdAt: 'desc' } });
      } else if (key === 'proposal') {
        tpl = await prisma.template.findFirst({ where: { type: 'proposal' }, orderBy: { createdAt: 'desc' } });
      } else if (key === 'service' || key === 'msa' || key.includes('service')) {
        tpl = await prisma.template.findFirst({ where: { type: 'service' }, orderBy: { createdAt: 'desc' } });
      } else if (key === 'custom' || key === 'blank') {
        tpl = await prisma.template.findFirst({ where: { type: 'custom' }, orderBy: { createdAt: 'desc' } });
      } else {
        tpl = await prisma.template.findFirst({ where: { name: ag.templateId } });
      }
    }
  }
  const clauses = await prisma.clause.findMany({ where: { risk: "balanced" } });
  let variablesJson: any = {};
  try { variablesJson = ag.variables ? JSON.parse(ag.variables as any) : {}; } catch { variablesJson = {}; }

  const requirements: string[] = [
    'Use start_date and end_date as the Agreement Period when provided.',
    'Include a Fees section using the variable: fees (omit payment terms entirely). Omit the section if fees is not provided.',
    "Add a Description section that expands the 'description' variable into 2–3 original paragraphs tailored to the agreement type. Do not echo it verbatim; elaborate scope, obligations, and constraints in neutral professional language.",
    'Ensure the Signatures section appears last in the document.',
    `Type is ${tpl?.type}. Keep valid, self-contained HTML only. Avoid commentary or markdown; output only the final HTML.`
  ];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: "You are a senior technology contracts lawyer. Write clear, enforceable business English." },
    { role: "user", content: `Base template (JSON with placeholders): ${tpl?.content || '{}'}` },
    { role: "user", content: `Filled variables JSON: ${JSON.stringify(variablesJson)}` },
    { role: "user", content: `Requirements:\n- ${requirements.join("\n- ")}` },
    { role: "user", content: `Clause library (title, body, tags, j): ${JSON.stringify(clauses.map((c: any) => ({ title: c.title, body: c.body, tags: c.tags, j: c.jurisdiction })))}` },
    { role: "user", content: `Output: Valid HTML only, cohesive agreement for type=${tpl?.type}. Keep section numbering stable; no commentary.` }
  ];

  if (!process.env.OPENAI_API_KEY) {
    // Fallback simple templater for local dev without OpenAI
    let base = {} as any;
    try { base = tpl?.content ? JSON.parse(tpl.content) : {}; } catch { base = {}; }
    const raw = String(base.body || "<p>No template body</p>");
    let filled = raw.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, k) => String(variablesJson?.[k] ?? ""));

    const insertBeforeSignatures = (html: string, section: string) => {
      const sigRe = /<h2[^>]*>\s*Signatures\s*<\/h2>/i;
      const match = html.match(sigRe);
      if (match && match.index !== undefined) {
        return html.slice(0, match.index) + section + html.slice(match.index);
      }
      return html + section;
    };

    if (variablesJson?.description && !/\bDescription\b/i.test(filled)) {
      const d = String(variablesJson.description);
      filled = insertBeforeSignatures(filled, `\n<h2>Description</h2>\n<p>${d}</p>`);
    }
    if (variablesJson?.fees && !/\bFees\b/i.test(filled)) {
      const fees = String(variablesJson.fees);
      filled = insertBeforeSignatures(filled, `\n<h2>Fees</h2>\n<p>Fees: ${fees}.</p>`);
    }
    await prisma.agreement.update({ where: { id: ag.id }, data: { draftHtml: filled } });
    return NextResponse.json({ ok: true, mode: "local" });
  }
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      temperature: 0.2
    });
    let html = res.choices[0]?.message?.content || "";
    const insertBeforeSignatures = (doc: string, section: string) => {
      const sigRe = /<h2[^>]*>\s*Signatures\s*<\/h2>/i;
      const match = doc.match(sigRe);
      if (match && match.index !== undefined) {
        return doc.slice(0, match.index) + section + doc.slice(match.index);
      }
      return doc + section;
    };
    // Safety: ensure key sections exist if variables present, and keep Signatures last
    if (variablesJson?.description && !/\bDescription\b/i.test(html)) {
      html = insertBeforeSignatures(html, `\n<h2>Description</h2>\n<p>${String(variablesJson.description)}</p>`);
    }
    if (variablesJson?.fees && !/\bFees\b/i.test(html)) {
      html = insertBeforeSignatures(html, `\n<h2>Fees</h2>\n<p>Fees: ${String(variablesJson.fees)}.</p>`);
    }
    await prisma.agreement.update({ where: { id: ag.id }, data: { draftHtml: html } });
    return NextResponse.json({ ok: true, mode: "openai" });
  } catch (e: any) {
    // Fallback on auth/network errors
    let base = {} as any;
    try { base = tpl?.content ? JSON.parse(tpl.content) : {}; } catch { base = {}; }
    const raw = String(base.body || "<p>No template body</p>");
    let filled = raw.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, k) => String(variablesJson?.[k] ?? ""));

    const insertBeforeSignatures = (html: string, section: string) => {
      const sigRe = /<h2[^>]*>\s*Signatures\s*<\/h2>/i;
      const match = html.match(sigRe);
      if (match && match.index !== undefined) {
        return html.slice(0, match.index) + section + html.slice(match.index);
      }
      return html + section;
    };
    if (variablesJson?.description && !/\bDescription\b/i.test(filled)) {
      filled = insertBeforeSignatures(filled, `\n<h2>Description</h2>\n<p>${String(variablesJson.description)}</p>`);
    }
    if (variablesJson?.fees && !/\bFees\b/i.test(filled)) {
      filled = insertBeforeSignatures(filled, `\n<h2>Fees</h2>\n<p>Fees: ${String(variablesJson.fees)}.</p>`);
    }
    await prisma.agreement.update({ where: { id: ag.id }, data: { draftHtml: filled } });
    return NextResponse.json({ ok: true, mode: "local-fallback", error: e?.message });
  }
}
