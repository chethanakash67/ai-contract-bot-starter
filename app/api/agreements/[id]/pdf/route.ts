import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { sha256 } from "js-sha256";
import { launchChromium } from "@/lib/launchChromium";
import { requireSession } from "@/lib/auth";

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
  }
});

export async function POST(_: Request, { params }: { params: { id: string }}) {
  try {
  const s = await requireSession();
  const ag = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
  if (!ag?.draftHtml) return NextResponse.json({ error: "No draft" }, { status: 400 });

  const browser = await launchChromium();
  const page = await browser.newPage();
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
  const htmlDoc = `<!DOCTYPE html><html><head><meta charSet=\"utf-8\"><style>${baseStyles}</style></head><body><div class=\"latex-prose\">${ag.draftHtml}</div></body></html>`;
  await page.setContent(htmlDoc, { waitUntil: "load" });
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "20mm", bottom: "20mm", left: "16mm", right: "16mm" } });
  await browser.close();

  // If S3 configured (not placeholder), upload; otherwise store inline data URL. On failure, fall back to inline.
  const s3Configured = Boolean(
    process.env.S3_BUCKET && process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
  ) && !/REPLACE_ME/i.test(
    `${process.env.S3_BUCKET}${process.env.S3_ENDPOINT}${process.env.S3_ACCESS_KEY_ID}${process.env.S3_SECRET_ACCESS_KEY}`
  );
  if (s3Configured) {
    try {
      const key = `agreements/${ag.id}.pdf`;
      await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: pdfBuffer, ContentType: "application/pdf" }));
      const hash = sha256(pdfBuffer);
      const url = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;
      await prisma.agreement.update({ where: { id: ag.id }, data: { pdfUrl: url, hash } });
      const base = process.env.APP_URL || "";
      return NextResponse.json({ url: `${base}/api/agreements/${ag.id}/pdf`, storage: "s3" });
    } catch (e) {
      // Fall through to inline
    }
  }
  {
    const base64 = Buffer.from(pdfBuffer).toString("base64");
    const url = `data:application/pdf;base64,${base64}`;
    const hash = sha256(pdfBuffer);
    await prisma.agreement.update({ where: { id: ag.id }, data: { pdfUrl: url, hash } });
    const base = process.env.APP_URL || "";
    return NextResponse.json({ url: `${base}/api/agreements/${ag.id}/pdf`, storage: "inline" });
  }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string }}) {
  try {
    const s = await requireSession();
    const ag = await prisma.agreement.findFirst({ where: { id: params.id, orgId: s.orgId } });
    if (!ag?.pdfUrl) return NextResponse.json({ error: "No PDF" }, { status: 404 });
    const url = ag.pdfUrl;
    if (/^data:application\/pdf;base64,/.test(url)) {
      const base64 = url.replace(/^data:application\/pdf;base64,/, "");
      const buf = Buffer.from(base64, "base64");
      return new NextResponse(buf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=agreement.pdf" } });
    }
    if (/^https?:/i.test(url)) {
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ error: "Invalid stored PDF URL" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

