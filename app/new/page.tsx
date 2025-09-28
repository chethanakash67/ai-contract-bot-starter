"use client";
import { useForm } from "react-hook-form";

export default function NewAgreement() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      templateId: "",
      discloser_name: "",
      recipient_name: "",
      effective_date: "",
      term_months: "24",
      jurisdiction: "India"
    }
  });

  const onSubmit = async (data:any) => {
    const res = await fetch("/api/agreements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      let details = "";
      try {
        const json = await res.json();
        details = json?.error || JSON.stringify(json);
      } catch {
        details = await res.text();
      }
      alert("Failed to create agreement: " + details);
      return;
    }
    const json = await res.json();
    if (!json.id) {
      alert("No agreement ID returned.");
      return;
    }
    window.location.href = `/agreements/${json.id}/edit`;
  };

  return (
    <main className="max-w-xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-semibold">New Agreement</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input {...register("templateId")} placeholder="Template ID (optional — default template used if blank)" className="border p-2 w-full" />
        <input {...register("discloser_name")} placeholder="Discloser Name" className="border p-2 w-full" />
        <input {...register("recipient_name")} placeholder="Recipient Name" className="border p-2 w-full" />
        <label className="block text-sm">Effective Date</label>
        <input type="date" {...register("effective_date")} className="border p-2 w-full" />
        <input {...register("term_months")} placeholder="Term (months)" className="border p-2 w-full" />
        <input {...register("jurisdiction")} placeholder="Governing law (e.g., India)" className="border p-2 w-full" />
        <button className="px-4 py-2 rounded bg-black text-white">Create</button>
      </form>
    </main>
  );
}
