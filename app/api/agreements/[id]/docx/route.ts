import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import HtmlDocx from "html-docx-js";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession();
    const ag = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
    if (!ag?.draftHtml) return NextResponse.json({ error: "No draft" }, { status: 400 });
    const baseStyles = `
      body { margin: 0; padding: 0; }
      .latex-prose { font-family: Arial, \"Helvetica Neue\", Helvetica, sans-serif; font-size: 16px; line-height: 1.7; color: #111; max-width: 7.5in; margin: 0 auto; }
      .latex-prose h1,.latex-prose h2,.latex-prose h3{ text-transform: uppercase; letter-spacing: .12em; margin: 1.5em 0 .75em; font-weight: 800; }
      .latex-prose h1{ font-size: 2.25rem; }
      .latex-prose h2{ font-size: 1.75rem; }
      .latex-prose h3{ font-size: 1.35rem; }
      .latex-prose p{ margin: 0 0 1em; }
      .latex-prose table{ border-collapse: collapse; width: 100%; margin: 1em 0; }
      .latex-prose th,.latex-prose td{ border: 1px solid #d1d5db; padding: .5em .65em; }
      .page-break { page-break-after: always; break-after: page; }
    `;
    const html = `<!DOCTYPE html><html><head><meta charSet="utf-8"><style>${baseStyles}</style></head><body><div class="latex-prose">${ag.draftHtml}</div></body></html>`;
    try {
      const asBlob = (HtmlDocx as any)?.asBlob || (HtmlDocx as any)?.default?.asBlob;
      if (typeof asBlob !== 'function') throw new Error('html-docx-js not available');
      const blob: any = asBlob(html);
      const arrayBuffer = await (blob as any).arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename=agreement-${ag.id}.docx`
        }
      });
    } catch (e) {
      // Fallback: deliver Word-compatible HTML as .doc
      const fallback = Buffer.from(html, 'utf8');
      return new NextResponse(fallback as any, {
        headers: {
          "Content-Type": "application/msword; charset=utf-8",
          "Content-Disposition": `attachment; filename=agreement-${ag.id}.doc`
        }
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
