// app/agreements/[id]/edit/page.tsx (EditAgreementPage.tsx)
"use client";
import { useEffect, useState, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import toast from "react-hot-toast";
import Link from "next/link";
import { Save, ShieldCheck, FileDown, FileType2, Share2, FileCode2, AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import "./editor.css";
import { FontSize } from "@/lib/tiptap/fontSize";
import { FontFamily } from "@/lib/tiptap/fontFamily";
import { BlockStyle } from "@/lib/tiptap/blockStyle";

const FONT_SIZE_OPTIONS = [
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "22", value: "22px" },
  { label: "28", value: "28px" },
];

const FONT_FAMILY_OPTIONS = [
  { label: "Arial (Sans)", value: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { label: "Calibri (Sans)", value: 'Calibri, "Segoe UI", Roboto, "Helvetica Neue", sans-serif' },
  { label: "Inter (Sans)", value: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"' },
  { label: "Times New Roman (Serif)", value: '"Times New Roman", Times, serif' },
  { label: "Georgia (Serif)", value: 'Georgia, "Times New Roman", Times, serif' },
  { label: "Garamond (Serif)", value: 'Garamond, Baskerville, "Times New Roman", Times, serif' },
  { label: "Courier New (Mono)", value: '"Courier New", Courier, monospace' },
  { label: "JetBrains Mono (Mono)", value: '"JetBrains Mono", "Courier New", monospace' },
];

const HEADING_OPTIONS: { label: string; level: 0 | 1 | 2 | 3 }[] = [
  { label: "Paragraph", level: 0 },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
];

interface AgreementData {
  discloser_name?: string;
  recipient_name?: string;
  draftHtml: string;
  status?: 'draft' | 'completed' | 'accepted';
}

export default function EditAgreementPage({ params }: { params: { id: string } }) {
  const [agreementData, setAgreementData] = useState<AgreementData | null>(null);
  const [html, setHtml] = useState("");
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [actionStates, setActionStates] = useState({ isGenerating: false, isValidating: false, isExporting: false, isExportingDocx: false, isExportingTex: false, isSharing: false });
  const [selVersion, setSelVersion] = useState(0);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

  const autosaveTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetch(`/api/agreements/${params.id}`).then(r => r.json()).then(async (data) => {
      // derive names if missing
      let discloser = data?.discloser_name;
      let recipient = data?.recipient_name;
      try {
        const v = data?.variables ? JSON.parse(data.variables) : {};
        discloser = discloser || v.discloser_name || v.provider_name || v.party_a || '';
        recipient = recipient || v.recipient_name || v.client_name || v.party_b || '';
      } catch {}
      setAgreementData({ ...data, discloser_name: discloser, recipient_name: recipient });
      setHtml(data?.draftHtml || "");
      // Auto-generate first draft if empty and still in draft
      if ((!data?.draftHtml || String(data.draftHtml).trim() === '') && (data?.status === 'draft')) {
        try {
          await fetch(`/api/agreements/${params.id}/generate`, { method: 'POST' });
          const refreshed = await fetch(`/api/agreements/${params.id}`).then(r => r.json());
          setHtml(refreshed?.draftHtml || '');
          setAgreementData((prev) => ({ ...(refreshed || prev), discloser_name: discloser, recipient_name: recipient }));
          editor?.commands.setContent(refreshed?.draftHtml || '', false);
        } catch {
          // non-fatal
        }
      }
    }).catch(() => toast.error("Failed to load agreement."));
  }, [params.id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      TextStyle,
      FontSize,
      FontFamily,
      BlockStyle,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: html,
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved');
      setHtml(editor.getHTML());
      clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = setTimeout(() => handleAction('save'), 1500);
    },
    onSelectionUpdate: () => setSelVersion(v => v + 1),
    editorProps: { attributes: { class: 'latex-prose focus:outline-none px-16 py-14' } },
  }, []);

  // Load initial content into a stable editor instance
  useEffect(() => {
    if (editor && agreementData) {
      editor.commands.setContent(agreementData.draftHtml || '', false);
    }
  }, [editor, agreementData?.draftHtml]);

  useEffect(() => {
    if (!editor) return;
    const status = agreementData?.status || 'draft';
    editor.setEditable(status === 'draft');
  }, [editor, agreementData?.status]);

  const handleAction = async (action: 'generate' | 'save' | 'validate' | 'toPdf' | 'toDocx' | 'toTex' | 'share') => {
    const actionKeyMap = { generate: 'isGenerating', validate: 'isValidating', toPdf: 'isExporting', toDocx: 'isExportingDocx', toTex: 'isExportingTex', share: 'isSharing' } as const;
    
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
        case 'validate': {
          const res = await fetch(`/api/agreements/${params.id}/validate`, { method: "POST" });
          const j = await res.json();
          const errs = (j?.errors || []) as string[];
          if (errs.length > 0) {
            throw new Error(`Validation failed:\n- ${errs.join('\n- ')}`);
          }
          return j;
        }
        case 'toPdf':
          await fetch(`/api/agreements/${params.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftHtml: html }) });
          const pdfRes = await fetch(`/api/agreements/${params.id}/pdf`, { method: "POST" });
          const pdfData = await pdfRes.json();
          if (!pdfData.url) throw new Error(pdfData.error || 'No PDF URL returned');
          window.open(pdfData.url, "_blank");
          break;
        case 'toDocx': {
          await fetch(`/api/agreements/${params.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftHtml: html }) });
          const resp = await fetch(`/api/agreements/${params.id}/docx`, { method: 'POST' });
          if (!resp.ok) {
            let msg = 'DOCX export failed';
            try { const j = await resp.json(); msg = j?.error || msg; } catch {}
            throw new Error(msg);
          }
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const ct = resp.headers.get('content-type') || '';
          const ext = /msword/i.test(ct) ? 'doc' : 'docx';
          a.download = `agreement-${params.id}.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }
        case 'share': {
          const res = await fetch(`/api/agreements/${params.id}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allowDownload: true }) });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Share failed');
          await navigator.clipboard.writeText(data.url);
          return { message: 'Share link copied', url: data.url } as any;
        }
        case 'toTex': {
          await fetch(`/api/agreements/${params.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftHtml: html }) });
          const resp = await fetch(`/api/agreements/${params.id}/latex`, { method: 'POST' });
          if (!resp.ok) {
            let msg = 'LaTeX export failed';
            try { const j = await resp.json(); msg = j?.error || msg; } catch {}
            throw new Error(msg);
          }
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `agreement-${params.id}.tex`;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }
      }
    })();

    toast.promise(promise, {
      loading: `${action.charAt(0).toUpperCase() + action.slice(1)}ing...`,
      success: (data) => {
        if (action === 'save') setSaveStatus('saved');
        if (action === 'validate') return `Validation passed. No issues found.`;
        if (action === 'share') return (data?.message || 'Share link ready');
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
        <button onClick={() => handleAction('validate')} disabled={actionStates.isValidating || agreementData.status !== 'draft'} className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-md disabled:bg-amber-300">
          <ShieldCheck size={18}/> {actionStates.isValidating ? "Validating..." : "Validate"}
        </button>
        <button onClick={() => handleAction('toPdf')} disabled={actionStates.isExporting || agreementData.status !== 'draft'} className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-md disabled:bg-gray-500">
          <FileDown size={18}/> {actionStates.isExporting ? "Exporting..." : "Export PDF"}
        </button>
        <button onClick={() => handleAction('toDocx')} disabled={actionStates.isExportingDocx || agreementData.status !== 'draft'} className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-md disabled:bg-gray-500">
          <FileType2 size={18}/> {actionStates.isExportingDocx ? "Exporting..." : "Export DOCX"}
        </button>
        <button onClick={() => handleAction('toTex')} disabled={actionStates.isExportingTex || agreementData.status !== 'draft'} className="flex items-center gap-2 px-3 py-2 bg-purple-700 text-white rounded-md disabled:bg-purple-400">
          <FileCode2 size={18}/> {actionStates.isExportingTex ? "Exporting..." : "Export LaTeX"}
        </button>
        <button onClick={() => handleAction('share')} disabled={actionStates.isSharing || agreementData.status !== 'draft'} className="flex items-center gap-2 px-3 py-2 bg-green-700 text-white rounded-md disabled:bg-green-400">
          <Share2 size={18}/> {actionStates.isSharing ? "Sharing..." : "Get Share Link"}
        </button>
        <button disabled={agreementData.status !== 'draft'} onClick={async () => {
            try {
              await fetch(`/api/agreements/${params.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) });
              setAgreementData((d) => d ? { ...d, status: 'completed' } : d);
              toast.success('Marked as completed');
            } catch { toast.error('Failed'); }
          }} className="flex items-center gap-2 px-3 py-2 bg-amber-700 text-white rounded-md">
          Final
        </button>
        <button disabled={!(agreementData.status === 'completed')} onClick={async () => {
            try {
              await fetch(`/api/agreements/${params.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'accepted' }) });
              setAgreementData((d) => d ? { ...d, status: 'accepted' } : d);
              toast.success('Marked as accepted');
            } catch { toast.error('Failed'); }
          }} className="flex items-center gap-2 px-3 py-2 bg-emerald-700 text-white rounded-md">
          {agreementData.status === 'accepted' ? 'Marked Acceptance' : 'Mark Accepted'}
        </button>
        <div className="flex-grow"></div>
        <div className="text-sm text-gray-500 flex items-center gap-2">
            <Save size={16} className={saveStatus === 'saving' ? 'animate-spin' : ''}/>
            <span>{saveStatus === 'unsaved' ? 'Unsaved changes' : saveStatus === 'saving' ? 'Saving...' : 'All changes saved'}</span>
        </div>
      </div>
      
      <div className="editor-wrapper min-h-[75vh]">
        <div className="editor-toolbar">
          <div className="toolbar-group">
            <select
              className="toolbar-select"
              value={(() => {
                if (!editor) return 0;
                if (editor.isActive('heading', { level: 1 })) return 1;
                if (editor.isActive('heading', { level: 2 })) return 2;
                if (editor.isActive('heading', { level: 3 })) return 3;
                return 0;
              })()}
              onChange={(event) => {
                if (!editor) return;
                const level = Number(event.target.value) as 0 | 1 | 2 | 3;
                if (level === 0) editor.chain().focus().setParagraph().run();
                else editor.chain().focus().toggleHeading({ level }).run();
              }}
            >
              {HEADING_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.level}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-group">
            <button className={`toolbar-btn ${editor?.isActive('bold') ? 'is-active' : ''}`} onClick={() => editor?.chain().focus().toggleBold().run()} type="button">B</button>
            <button className={`toolbar-btn ${editor?.isActive('italic') ? 'is-active' : ''}`} onClick={() => editor?.chain().focus().toggleItalic().run()} type="button"><span className="italic">I</span></button>
            <button className={`toolbar-btn ${editor?.isActive('underline') ? 'is-active' : ''}`} onClick={() => editor?.chain().focus().toggleUnderline().run()} type="button"><span className="underline">U</span></button>
          </div>

          <div className="toolbar-group">
            <button className={`toolbar-btn ${editor?.isActive('bulletList') ? 'is-active' : ''}`} onClick={() => editor?.chain().focus().toggleBulletList().run()} type="button">• List</button>
            <button className={`toolbar-btn ${editor?.isActive('orderedList') ? 'is-active' : ''}`} onClick={() => editor?.chain().focus().toggleOrderedList().run()} type="button">1. List</button>
          </div>

          <div className="toolbar-group">
            <button title="Align Left" className={`toolbar-btn ${editor?.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`} onClick={() => editor?.chain().focus().setTextAlign('left').run()} type="button"><AlignLeft size={16} /></button>
            <button title="Align Center" className={`toolbar-btn ${editor?.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`} onClick={() => editor?.chain().focus().setTextAlign('center').run()} type="button"><AlignCenter size={16} /></button>
            <button title="Align Right" className={`toolbar-btn ${editor?.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`} onClick={() => editor?.chain().focus().setTextAlign('right').run()} type="button"><AlignRight size={16} /></button>
            <button title="Justify" className={`toolbar-btn ${editor?.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}`} onClick={() => editor?.chain().focus().setTextAlign('justify').run()} type="button"><AlignJustify size={16} /></button>
          </div>

          <div className="toolbar-group" onBlur={() => setTimeout(()=>setSizeMenuOpen(false), 100)}>
            {(() => {
              function currentFontSizePx(): number {
                if (!editor) return 16;
                const markSz = (editor.getAttributes('textStyle') as any)?.fontSize;
                const paraSz = (editor.getAttributes('paragraph') as any)?.fontSize;
                const headSz = (editor.getAttributes('heading') as any)?.fontSize;
                let raw: any = markSz || paraSz || headSz;
                if (!raw && editor.isActive('heading', { level: 1 })) raw = `${Math.round(1.85*16)}px`;
                if (!raw && editor.isActive('heading', { level: 2 })) raw = `${Math.round(1.35*16)}px`;
                if (!raw && editor.isActive('heading', { level: 3 })) raw = `${Math.round(1.15*16)}px`;
                const m = String(raw || '16px').match(/[\d\.]+/);
                const n = m ? Number(m[0]) : 16;
                return Number.isFinite(n) ? n : 16;
              }
              const value = currentFontSizePx();
              return (
                <>
                  <input
                    type="number"
                    min={8}
                    max={96}
                    step={1}
                    className="toolbar-select"
                    placeholder="Size"
                    value={value as any}
                    onChange={(e) => {
                      if (!editor) return;
                      const n = Math.max(8, Math.min(96, Number(e.target.value) || value));
                      (editor.chain() as any).focus().setFontSize(`${n}px`).setBlockFontSize(`${n}px`).run();
                    }}
                    title="Font size (px)"
                    onFocus={() => setSizeMenuOpen(false)}
                  />
                  <button type="button" className="toolbar-btn" title="Font size options" onClick={() => setSizeMenuOpen(o=>!o)}>▼</button>
                  {sizeMenuOpen && (
                    <div className="absolute mt-10 bg-white border rounded shadow p-1 z-10">
                      {FONT_SIZE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className="block px-3 py-1 w-full text-left hover:bg-gray-100"
                          onClick={() => {
                            if (!editor) return;
                            (editor.chain() as any).focus().setFontSize(opt.value).setBlockFontSize(opt.value).run();
                            setSizeMenuOpen(false);
                          }}
                        >{opt.label}px</button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
            
            <select
              className="toolbar-select"
              value={(() => {
                if (!editor) return FONT_FAMILY_OPTIONS[0].value;
                const markFm = (editor.getAttributes('textStyle') as any)?.fontFamily;
                const paraFm = (editor.getAttributes('paragraph') as any)?.fontFamily;
                const headFm = (editor.getAttributes('heading') as any)?.fontFamily;
                return markFm || paraFm || headFm || FONT_FAMILY_OPTIONS[0].value;
              })()}
              onChange={(event) => {
                if (!editor) return;
                const value = event.target.value;
                if (value) {
                  (editor.chain() as any).focus().setFontFamily(value).setBlockFontFamily(value).run();
                }
              }}
            >
              {FONT_FAMILY_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {/* Removed "+ Page" button that inserted page-breaks */}
          </div>
        </div>
        <EditorContent editor={editor} className={`latex-editor ${agreementData.status !== 'draft' ? 'pointer-events-none opacity-75' : ''}`} />
      </div>
    </main>
  );
}
