"use client";
import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function EditAgreement({ params }: { params: { id: string }}) {
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState("");

  useEffect(() => {
    (async () => {
      const data = await fetch(`/api/agreements/${params.id}`).then(r=>r.json());
      setHtml(data?.draftHtml || "");
      setLoading(false);
    })();
  }, [params.id]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: html,
    onUpdate: ({ editor }) => setHtml(editor.getHTML())
  });

  if (loading || !editor) return <div className="p-6">Loading…</div>;

  async function generate() {
    await fetch(`/api/agreements/${params.id}/generate`, { method:"POST" });
    location.reload();
  }
  async function save() {
    await fetch(`/api/agreements/${params.id}`, { method:"PUT", body: JSON.stringify({ draftHtml: html })});
  }
  async function validate() {
    const r = await fetch(`/api/agreements/${params.id}/validate`, { method:"POST" });
    alert(JSON.stringify(await r.json(), null, 2));
  }
  async function toPdf() {
    const r = await fetch(`/api/agreements/${params.id}/pdf`, { method:"POST" });
    const { url } = await r.json();
    if (url) window.open(url, "_blank");
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex gap-2">
        <button onClick={generate} className="px-3 py-2 bg-blue-600 text-white rounded">AI Generate</button>
        <button onClick={save} className="px-3 py-2 bg-gray-900 text-white rounded">Save</button>
        <button onClick={validate} className="px-3 py-2 bg-amber-600 text-white rounded">Validate</button>
        <button onClick={toPdf} className="px-3 py-2 bg-black text-white rounded">Export PDF</button>
      </div>
      <div className="border rounded p-3 min-h-[60vh]">
        <EditorContent editor={editor} />
      </div>
    </main>
  );
}
