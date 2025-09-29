// app/agreements/[id]/edit/page.tsx (EditAgreementPage.tsx)
"use client";
import { useEffect, useState, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import toast from "react-hot-toast";
import Link from "next/link";
import { Save, Bot, ShieldCheck, FileDown } from "lucide-react";

interface AgreementData {
  discloser_name: string;
  recipient_name: string;
  draftHtml: string;
}

export default function EditAgreementPage({ params }: { params: { id: string } }) {
  const [agreementData, setAgreementData] = useState<AgreementData | null>(null);
  const [html, setHtml] = useState("");
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [actionStates, setActionStates] = useState({ isGenerating: false, isValidating: false, isExporting: false });

  const autosaveTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetch(`/api/agreements/${params.id}`).then(r => r.json()).then(data => {
      setAgreementData(data);
      setHtml(data?.draftHtml || "");
    }).catch(() => toast.error("Failed to load agreement."));
  }, [params.id]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: html,
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved');
      setHtml(editor.getHTML());
      clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = setTimeout(() => handleAction('save'), 1500);
    },
    editorProps: { attributes: { class: 'prose max-w-none focus:outline-none p-4' } },
  }, [html]);

  const handleAction = async (action: 'generate' | 'save' | 'validate' | 'toPdf') => {
    const actionKeyMap = { generate: 'isGenerating', validate: 'isValidating', toPdf: 'isExporting' };
    
    if (action !== 'save') {
        const stateKey = actionKeyMap[action as keyof typeof actionKeyMap] as keyof typeof actionStates;
        setActionStates(prev => ({ ...prev, [stateKey]: true }));
    } else {
        setSaveStatus('saving');
    }

    const promise = (async () => {
      let result;
      switch (action) {
        case 'generate':
          await fetch(`/api/agreements/${params.id}/generate`, { method: "POST" });
          window.location.reload();
          break;
        case 'save':
          result = await fetch(`/api/agreements/${params.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftHtml: html }) });
          if (!result.ok) throw new Error('Failed to save');
          break;
        case 'validate':
          const res = await fetch(`/api/agreements/${params.id}/validate`, { method: "POST" });
          return res.json();
        case 'toPdf':
          const pdfRes = await fetch(`/api/agreements/${params.id}/pdf`, { method: "POST" });
          const pdfData = await pdfRes.json();
          if (!pdfData.url) throw new Error(pdfData.error || 'No PDF URL returned');
          window.open(pdfData.url, "_blank");
          break;
      }
    })();

    toast.promise(promise, {
      loading: `${action.charAt(0).toUpperCase() + action.slice(1)}ing...`,
      success: (data) => {
        if (action === 'save') setSaveStatus('saved');
        if (action === 'validate') return `Validation successful! Issues: ${data.issues?.length || 0}`;
        return `Action '${action}' completed!`;
      },
      error: (err) => {
        if (action === 'save') setSaveStatus('unsaved');
        return err?.message || `Failed to ${action}.`;
      }
    }).finally(() => {
        if (action !== 'save') {
            const stateKey = actionKeyMap[action as keyof typeof actionKeyMap] as keyof typeof actionStates;
            setActionStates(prev => ({ ...prev, [stateKey]: false }));
        }
    });
  };

  if (!editor || !agreementData) return <div className="p-6 text-center">Loading Editor...</div>;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="space-y-2">
        <Link href="/" className="text-sm text-gray-600 hover:text-black">&larr; Back to Dashboard</Link>
        <h1 className="text-2xl font-bold">Editing Agreement</h1>
        <p className="text-gray-500">Between <span className="font-medium text-gray-800">{agreementData.discloser_name}</span> and <span className="font-medium text-gray-800">{agreementData.recipient_name}</span></p>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 bg-white border rounded-lg shadow-sm">
        <button onClick={() => handleAction('generate')} disabled={actionStates.isGenerating} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-300">
          <Bot size={18}/> {actionStates.isGenerating ? "Generating..." : "AI Generate"}
        </button>
        <button onClick={() => handleAction('validate')} disabled={actionStates.isValidating} className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-md disabled:bg-amber-300">
          <ShieldCheck size={18}/> {actionStates.isValidating ? "Validating..." : "Validate"}
        </button>
        <button onClick={() => handleAction('toPdf')} disabled={actionStates.isExporting} className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-md disabled:bg-gray-500">
          <FileDown size={18}/> {actionStates.isExporting ? "Exporting..." : "Export PDF"}
        </button>
        <div className="flex-grow"></div>
        <div className="text-sm text-gray-500 flex items-center gap-2">
            <Save size={16} className={saveStatus === 'saving' ? 'animate-spin' : ''}/>
            <span>{saveStatus === 'unsaved' ? 'Unsaved changes' : saveStatus === 'saving' ? 'Saving...' : 'All changes saved'}</span>
        </div>
      </div>
      
      <div className="bg-white border rounded-lg shadow-sm min-h-[70vh]">
        <EditorContent editor={editor} />
      </div>
    </main>
  );
}