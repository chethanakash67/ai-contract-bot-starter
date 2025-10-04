// app/page.tsx (HomePage.tsx)
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Trash2, FileText, ArrowRight } from "lucide-react";
import { useLoading } from "./components/LoadingContext";

interface Agreement {
  id: string;
  discloser_name: string;
  recipient_name: string;
  createdAt: string;
  status: 'draft' | 'completed' | 'accepted';
}

export default function HomePage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const { start: startLoading, stop: stopLoading } = useLoading();

  async function fetchAgreements(s?: string) {
    try {
      startLoading();
      const qs = s ? `?status=${encodeURIComponent(s)}` : '';
      const response = await fetch(`/api/agreements${qs}`, { cache: 'no-store' });
      let json: unknown = [];
      try {
        json = await response.json();
      } catch (_) {
        json = [];
      }

      // API should return an array; if it doesn't (e.g. error object), guard.
      const list = Array.isArray(json)
        ? json
        : Array.isArray((json as any)?.items)
          ? (json as any).items
          : [];

      if (!response.ok) {
        console.error('Failed to fetch agreements:', json);
      }
      setAgreements(list as Agreement[]);
    } catch (error) {
      console.error("Failed to fetch agreements:", error);
      setAgreements([]);
    } finally {
      setLoading(false);
      stopLoading();
    }
  }

  useEffect(() => {
    fetchAgreements(status);
  }, [status]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    if (!confirm('Are you sure you want to delete this agreement?')) return;

    try {
      startLoading();
      const response = await fetch(`/api/agreements/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      await fetchAgreements(); // Refresh list
    } catch (error) {
      console.error("Deletion failed:", error);
    } finally {
      stopLoading();
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contract Dashboard</h1>
        <Link href="/new" onClick={() => startLoading()} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors shadow-sm">
          <Plus size={18} />
          New Agreement
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Filter:</label>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">All</option>
          <option value="draft">draft</option>
          <option value="completed">completed</option>
          <option value="accepted">accepted</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading agreements...</div>
      ) : agreements.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg bg-white">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No agreements found</h3>
            <p className="mt-1 text-sm text-gray-500">Create a new agreement to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(agreements) ? agreements : []).map((agreement) => {
            const title = [agreement.discloser_name, agreement.recipient_name].filter(Boolean).join(' & ') || 'Untitled Agreement';
            return (
            <Link key={agreement.id} href={`/agreements/${agreement.id}/edit`} onClick={() => startLoading()} className="block group bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-lg text-gray-800">{title}</p>
                  <span className={(() => {
                    const base = 'text-xs font-medium px-2 py-1 rounded-full';
                    if (agreement.status === 'completed') return `${base} bg-amber-100 text-amber-800`;
                    if (agreement.status === 'accepted') return `${base} bg-green-100 text-green-800`;
                    return `${base} bg-blue-100 text-blue-800`;
                  })()}>{agreement.status || 'draft'}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Created: {new Date(agreement.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="border-t p-4 flex justify-between items-center bg-gray-50 rounded-b-lg">
                <button onClick={(e) => handleDelete(agreement.id, e)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors">
                  <Trash2 size={18} />
                </button>
                <div className="flex items-center gap-1 text-sm font-medium text-gray-600 group-hover:text-black">
                  Edit Document <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          )})}
        </div>
      )}
    </main>
  );
}
