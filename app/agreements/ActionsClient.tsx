"use client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ActionsClient({ id, status }: { id: string; status: 'draft' | 'completed' | 'accepted' }) {
  const router = useRouter();

  async function exportPdf() {
    try {
      const resp = await fetch(`/api/agreements/${id}/pdf`, { method: 'POST' });
      const data = await resp.json().catch(() => ({}));
      const url = data?.url || `/api/agreements/${id}/pdf`;
      window.open(url, '_blank');
    } catch (e) {
      toast.error('PDF export failed');
    }
  }

  async function finalize() {
    try {
      await fetch(`/api/agreements/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) });
      router.refresh();
      toast.success('Marked as completed');
    } catch (e) {
      toast.error('Failed to mark completed');
    }
  }

  async function shareEmail() {
    try {
      const resp = await fetch(`/api/agreements/${id}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allowDownload: true }) });
      if (!resp.ok) throw new Error('Share link failed');
      const data = await resp.json();
      const url = data?.url as string | undefined;
      const subject = encodeURIComponent('Agreement for Review');
      const body = encodeURIComponent(`Please review and respond:\n\n${url}`);
      if (url) {
        try { await navigator.clipboard.writeText(url); } catch {}
        const href = `mailto:?subject=${subject}&body=${body}`;
        // Navigate directly to mailto to avoid popup blockers
        window.location.href = href;
        toast.success('Share link copied to clipboard');
      } else {
        throw new Error('No URL returned');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Share email failed');
    }
  }

  return (
    <span className="inline-flex gap-2">
      <button onClick={exportPdf} className="px-2 py-1 border rounded" type="button">Export PDF</button>
      <button onClick={finalize} disabled={status !== 'draft'} className="px-2 py-1 border rounded disabled:opacity-50" type="button">Final</button>
      <button onClick={shareEmail} className="px-2 py-1 border rounded" type="button">Share Email</button>
    </span>
  );
}
