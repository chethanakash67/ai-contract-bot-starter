"use client";
import { useRouter } from "next/navigation";

export default function ActionsClient({ id, status }: { id: string; status: 'draft' | 'completed' | 'accepted' }) {
  const router = useRouter();

  async function exportPdf() {
    try {
      const resp = await fetch(`/api/agreements/${id}/pdf`, { method: 'POST' });
      const data = await resp.json().catch(() => ({}));
      const url = data?.url || `/api/agreements/${id}/pdf`;
      window.open(url, '_blank');
    } catch {}
  }

  async function finalize() {
    try {
      await fetch(`/api/agreements/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) });
      router.refresh();
    } catch {}
  }

  return (
    <span className="inline-flex gap-2">
      <button onClick={exportPdf} className="px-2 py-1 border rounded" type="button">Export PDF</button>
      <button onClick={finalize} disabled={status !== 'draft'} className="px-2 py-1 border rounded disabled:opacity-50" type="button">Final</button>
    </span>
  );
}
