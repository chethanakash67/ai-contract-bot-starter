import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { sha256 } from "js-sha256";
import { launchChromium } from "@/lib/launchChromium";

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
  const ag = await prisma.agreement.findUnique({ where: { id: params.id } });
  if (!ag?.draftHtml) return NextResponse.json({ error: "No draft" }, { status: 400 });

  const browser = await launchChromium();
  const page = await browser.newPage();
  await page.setContent(`<html><head><meta charSet="utf-8"></head><body>${ag.draftHtml}</body></html>`, { waitUntil: "load" });
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "20mm", bottom: "20mm", left: "16mm", right: "16mm" } });
  await browser.close();

  // If S3 configured, upload; otherwise return a data URL so it works locally
  if (process.env.S3_BUCKET && process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
    const key = `agreements/${ag.id}.pdf`;
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: pdfBuffer, ContentType: "application/pdf" }));
    const hash = sha256(pdfBuffer);
    const url = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;
    await prisma.agreement.update({ where: { id: ag.id }, data: { pdfUrl: url, hash } });
    return NextResponse.json({ url, storage: "s3" });
  } else {
    const base64 = Buffer.from(pdfBuffer).toString("base64");
    const url = `data:application/pdf;base64,${base64}`;
    const hash = sha256(pdfBuffer);
    await prisma.agreement.update({ where: { id: ag.id }, data: { pdfUrl: url, hash } });
    return NextResponse.json({ url, storage: "inline" });
  }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
