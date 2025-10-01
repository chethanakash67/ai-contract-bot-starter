import Link from "next/link";
import { cookies } from "next/headers";

async function fetchAgreements(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const jar = cookies();
  const cookieHeader = jar.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  const base = process.env.APP_URL || '';
  const url = `${base}/api/agreements${qs}`.replace(/^[/]{2,}/, '/');
  const res = await fetch(url, { cache: 'no-store', headers: { cookie: cookieHeader } });
  if (!res.ok) throw new Error('Failed to load agreements');
  return res.json();
}

export default async function AgreementsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams?.status;
  const items = await fetchAgreements(status);
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agreements</h1>
        <Link href="/new" className="px-3 py-2 bg-black text-white rounded">New Agreement</Link>
      </div>
      <form className="flex items-center gap-2" action="/agreements" method="get">
        <label className="text-sm text-gray-600">Filter:</label>
        <select name="status" defaultValue={status || ''} className="border rounded px-2 py-1 text-sm">
          <option value="">All</option>
          <option value="draft">draft</option>
          <option value="completed">completed</option>
          <option value="accepted">accepted</option>
        </select>
        <button type="submit" className="px-2 py-1 border rounded">Apply</button>
      </form>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a: any) => (
              <tr key={a.id} className="border-t">
                <td className="p-3 font-mono text-xs"><Link href={`/agreements/${a.id}/edit`}>{a.id.slice(0,8)}…</Link></td>
                <td className="p-3">{a.status}</td>
                <td className="p-3 text-gray-500">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="p-3 space-x-2">
                  <Link href={`/agreements/${a.id}/edit`} className="px-2 py-1 border rounded">Edit</Link>
                  <ActionsClient id={a.id} status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
import ActionsClient from './ActionsClient';
