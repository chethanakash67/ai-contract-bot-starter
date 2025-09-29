// app/new/page.tsx (NewAgreementPage.tsx)
"use client";
import { useForm, Controller } from "react-hook-form";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Shield, Briefcase } from "lucide-react";
import Link from "next/link";

const templates = [
  { id: 'nda', name: 'Non-Disclosure', icon: <Shield size={24}/>, desc: 'A standard mutual non-disclosure agreement.' },
  { id: 'service', name: 'Service Agreement', icon: <Briefcase size={24}/>, desc: 'For contractors and service providers.' },
  { id: 'custom', name: 'Custom', icon: <FileText size={24}/>, desc: 'Start with a blank custom agreement.' },
];

type AgreementForm = {
  templateId: string;
  discloser_name: string;
  recipient_name: string;
  effective_date: string;
  start_date?: string;
  end_date?: string;
  term_months: string;
  jurisdiction: string;
  description?: string;
  // Service agreement fields
  provider_name?: string;
  client_name?: string;
  fees?: string;
  payment_terms?: string;
};

export default function NewAgreementPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('nda');
  const router = useRouter();
  const today = new Date();
  const isoToday = today.toISOString().split('T')[0];
  const oneYearLater = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  const { register, handleSubmit, control, formState: { isSubmitting }, setValue, watch } = useForm<AgreementForm>({
    defaultValues: {
      templateId: "nda",
      discloser_name: "",
      recipient_name: "",
      effective_date: isoToday,
      start_date: isoToday,
      end_date: oneYearLater,
      term_months: "24",
      jurisdiction: "India",
      description: "",
      provider_name: "",
      client_name: "",
      fees: "",
      payment_terms: ""
    }
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setValue('templateId', templateId);
  }

  const onSubmit = async (data: any) => {
    const promise = fetch("/api/agreements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err)));

    toast.promise(promise, {
      loading: 'Creating agreement...',
      success: (json) => {
        router.push(`/agreements/${json.id}/edit`);
        return 'Agreement created successfully!';
      },
      error: (err) => err.error || "Failed to create agreement.",
    });
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">New Agreement</h1>
          <Link href="/" className="text-sm text-gray-600 hover:text-black">&larr; Back to Dashboard</Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-8 border rounded-lg shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">1. Choose a Template</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {templates.map(template => (
              <button key={template.id} type="button" onClick={() => handleTemplateSelect(template.id)}
                className={`p-4 border rounded-lg text-left transition-all ${selectedTemplate === template.id ? 'border-black ring-2 ring-black' : 'hover:border-gray-400'}`}>
                {template.icon}
                <p className="font-semibold mt-2">{template.name}</p>
                <p className="text-sm text-gray-500">{template.desc}</p>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Template ID (optional)</label>
            <input {...register("templateId")} onChange={(e) => setSelectedTemplate(e.target.value || selectedTemplate)} placeholder="Paste a Template ID (cuid) to override"
              className="border p-2 w-full rounded-md font-mono text-sm" />
            <p className="text-xs text-gray-500 mt-1">Leave blank to use the selected card. To add your own template, run `npx prisma studio` and create one under Template, then paste its `id` here.</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-800">2. Fill in the Details</h2>
          {selectedTemplate === 'service' ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input {...register("provider_name", { required: true })} placeholder="Provider Name" className="border p-2 w-full rounded-md" />
              <input {...register("client_name", { required: true })} placeholder="Client Name" className="border p-2 w-full rounded-md" />
              <input type="date" {...register("start_date", { required: true })} className="border p-2 w-full rounded-md" placeholder="Start Date" />
              <input type="date" {...register("end_date", { required: true })} className="border p-2 w-full rounded-md" placeholder="End Date" />
              <input {...register("fees")} placeholder="Fees (e.g., $10,000)" className="border p-2 w-full rounded-md" />
              <input {...register("jurisdiction")} placeholder="Governing Law (e.g., India)" className="border p-2 w-full rounded-md" />
              <div className="sm:col-span-2">
                <textarea {...register("description")} placeholder="Describe the scope, deliverables, milestones, or any special terms..." rows={4} className="border p-2 w-full rounded-md" />
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input {...register("discloser_name", { required: true })} placeholder="Discloser Name" className="border p-2 w-full rounded-md" />
              <input {...register("recipient_name", { required: true })} placeholder="Recipient Name" className="border p-2 w-full rounded-md" />
              <input type="date" {...register("start_date", { required: true })} className="border p-2 w-full rounded-md" placeholder="Start Date" />
              <input type="date" {...register("end_date", { required: true })} className="border p-2 w-full rounded-md" placeholder="End Date" />
              <input {...register("jurisdiction")} placeholder="Governing Law (e.g., India)" className="border p-2 w-full rounded-md" />
              <div className="sm:col-span-2">
                <textarea {...register("description")} placeholder="Describe the purpose, confidentiality scope, or any specific carve-outs..." rows={4} className="border p-2 w-full rounded-md" />
              </div>
            </div>
          )}
        </div>

        <button disabled={isSubmitting} className="w-full px-4 py-3 rounded-md bg-black text-white font-semibold disabled:bg-gray-400 hover:bg-gray-800 transition-colors">
          {isSubmitting ? "Creating..." : "Create & Continue"}
        </button>
      </form>
    </main>
  );
}
