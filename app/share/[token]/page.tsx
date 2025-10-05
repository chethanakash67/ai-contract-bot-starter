import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

async function loadByToken(token: string) {
  const link = await prisma.publicLink.findFirst({ where: { token } });
  if (!link) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;
  const ag = await prisma.agreement.findUnique({ where: { id: link.agreementId } });
  if (!ag) return null;
  // Log view event
  try {
    const h = headers();
    const ip = h.get("x-forwarded-for") || h.get("x-real-ip") || "";
    const ua = h.get("user-agent") || "";
    await prisma.viewEvent.create({ data: { agreementId: ag.id, ip, ua } });
  } catch {}
  return { link, ag };
}

export default async function ShareView({ params }: { params: { token: string } }) {
  const data = await loadByToken(params.token);
  if (!data) return <main className="max-w-3xl mx-auto p-6"><p>Link invalid or expired.</p></main>;
  const { ag, link } = data;
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Shared Document</h1>
      <div className="bg-white border rounded-lg p-4">
        <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: ag?.draftHtml || "<p>No content</p>" }} />
      </div>
      {link.allowDownload && ag?.pdfUrl ? (
        <a href={`/api/share/${link.token}/pdf`} target="_blank" className="inline-block mt-4 px-3 py-2 bg-black text-white rounded">Download PDF</a>
      ) : null}
    </main>
  );
}

