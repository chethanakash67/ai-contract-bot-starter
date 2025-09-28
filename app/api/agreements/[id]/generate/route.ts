import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const ag = await prisma.agreement.findUnique({ where: { id: params.id } });
  if (!ag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tpl = await prisma.template.findUnique({ where: { id: ag.templateId } });
  const clauses = await prisma.clause.findMany({ where: { risk: "balanced" } });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: "You are a senior technology contracts lawyer. Write clear, enforceable business English." },
    { role: "user", content: `Base template (JSON with placeholders): ${JSON.stringify(tpl?.content)}` },
    { role: "user", content: `Filled variables JSON: ${JSON.stringify(ag.variables)}` },
    { role: "user", content: `Clause library (title, body, tags, j): ${JSON.stringify(clauses.map((c: any) => ({ title: c.title, body: c.body, tags: c.tags, j: c.jurisdiction })))}` },
    { role: "user", content: `Output: Valid HTML only, cohesive agreement for type=${tpl?.type}. Keep section numbering stable; no commentary.` }
  ];

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    temperature: 0.2
  });

  const html = res.choices[0]?.message?.content || "";
  await prisma.agreement.update({ where: { id: ag.id }, data: { draftHtml: html } });
  return NextResponse.json({ ok: true });
}
