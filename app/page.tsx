export default function Home() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-semibold">AI Contract Bot — Starter</h1>
      <p className="text-gray-600">Generate, edit, export, and sign agreements.</p>
      <a href="/new" className="inline-block px-4 py-2 rounded bg-black text-white">Create New Agreement</a>
    </main>
  );
}
