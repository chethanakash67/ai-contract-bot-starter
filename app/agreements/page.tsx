import Link from "next/link";

async function fetchAgreements() {
  const res = await fetch(`${process.env.APP_URL || ""}/api/agreements`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load agreements');
  return res.json();
}

export default async function AgreementsPage() {
  const items = await fetchAgreements();
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agreements</h1>
        <Link href="/new" className="px-3 py-2 bg-black text-white rounded">New Agreement</Link>
      </div>
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
                <td className="p-3">
                  <StatusSelect id={a.id} value={a.status} />
                </td>
                <td className="p-3 text-gray-500">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="p-3 space-x-2">
                  <Link href={`/agreements/${a.id}/edit`} className="px-2 py-1 border rounded">Edit</Link>
                  <form action={`/api/agreements/${a.id}/pdf`} method="post" className="inline">
                    <button className="px-2 py-1 border rounded" formMethod="post">Export PDF</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatusSelect({ id, value }: { id: string; value: string }) {
  async function update(formData: FormData) {
    'use server';
    const status = formData.get('status');
    try {
      await fetch(`${process.env.APP_URL || ''}/api/agreements/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }), headers: { 'Content-Type': 'application/json' } });
    } catch {}
  }
  return (
    <form action={update}>
      <select name="status" defaultValue={value} className="border rounded px-2 py-1 text-sm">
        <option value="draft">draft</option>
        <option value="review">review</option>
        <option value="out_for_signature">out_for_signature</option>
        <option value="executed">executed</option>
        <option value="void">void</option>
      </select>
      <button type="submit" className="ml-2 px-2 py-1 border rounded">Update</button>
    </form>
  );
}

