import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  await prisma.$connect();
  // ---------- NDA Template ----------
  const ndaContent = JSON.stringify({
    parties: { discloser: "{{discloser_name}}", recipient: "{{recipient_name}}" },
    body: `
<h1>Mutual Non-Disclosure Agreement (NDA)</h1>

<h2>1. Parties</h2>
<p>This Agreement is between <strong>{{discloser_name}}</strong> ("Disclosing Party") and <strong>{{recipient_name}}</strong> ("Receiving Party").</p>

<h2>2. Purpose</h2>
<p>The parties wish to discuss and explore <strong>{{description}}</strong> ("Purpose"), which may involve sharing confidential information.</p>

<h2>3. Confidential Information</h2>
<p>"Confidential Information" includes all non-public information disclosed by either party, including but not limited to business plans, client lists, financial data, or trade secrets.</p>

<h2>4. Obligations of Receiving Party</h2>
<ul>
<li>Maintain confidentiality of the information.</li>
<li>Use the information solely for the Purpose.</li>
<li>Do not disclose the information to third parties without prior written consent.</li>
</ul>

<h2>5. Exclusions</h2>
<ul>
<li>Information that is publicly known.</li>
<li>Information independently developed by the Receiving Party.</li>
<li>Information received legally from a third party.</li>
</ul>

<h2>6. Term</h2>
<p>This Agreement is effective from <strong>{{start_date}}</strong> to <strong>{{end_date}}</strong>.</p>

<h2>7. Return or Destruction</h2>
<p>Upon request, all confidential information must be returned or destroyed by the Receiving Party.</p>

<h2>8. Governing Law</h2>
<p>This Agreement shall be governed by the laws of <strong>{{jurisdiction}}</strong>.</p>

<h2>9. Signatures</h2>
<table>
<tr><td>Disclosing Party: {{discloser_name}}</td><td>Receiving Party: {{recipient_name}}</td></tr>
<tr><td>Signature: _____________________</td><td>Signature: _____________________</td></tr>
<tr><td>Date: __________</td><td>Date: __________</td></tr>
</table>
`
  });

  // Do not execute on the root client when using an interactive transaction later.
  // We'll run these with the `tx` client inside $transaction.

  // ---------- Service Agreement Template ----------
  const svcContent = JSON.stringify({
    parties: { provider: "{{provider_name}}", client: "{{client_name}}" },
    body: `
<h1>Service Agreement</h1>

<h2>1. Parties</h2>
<p>This Agreement is between <strong>{{provider_name}}</strong> ("Provider") and <strong>{{client_name}}</strong> ("Client").</p>

<h2>2. Purpose</h2>
<p>The Provider agrees to deliver services for <strong>{{description}}</strong> ("Project").</p>

<h2>3. Services</h2>
<ul>
<li>Provider will deliver the services described in the attached Statement of Work (SOW).</li>
<li>Services will be completed according to milestones and timelines defined in the SOW.</li>
</ul>

<h2>4. Fees</h2>
<p>Total fees: {{fees}}. Payment terms as agreed in SOW.</p>

<h2>5. Term & Termination</h2>
<ul>
<li>Effective from <strong>{{start_date}}</strong> to <strong>{{end_date}}</strong>.</li>
<li>Either party may terminate for material breach after 30 days' written notice.</li>
</ul>

<h2>6. Intellectual Property & Confidentiality</h2>
<ul>
<li>Each party retains its pre-existing IP.</li>
<li>Confidentiality obligations apply to non-public information.</li>
</ul>

<h2>7. Governing Law</h2>
<p>This Agreement shall be governed by the laws of <strong>{{jurisdiction}}</strong>.</p>

<h2>8. Signatures</h2>
<table>
<tr><td>Provider: {{provider_name}}</td><td>Client: {{client_name}}</td></tr>
<tr><td>Signature: _____________________</td><td>Signature: _____________________</td></tr>
<tr><td>Date: __________</td><td>Date: __________</td></tr>
</table>
`
  });

  // see note above

  // ---------- Proposal Template ----------
  const proposalContent = JSON.stringify({
    parties: { provider: "{{provider_name}}", client: "{{client_name}}" },
    body: `
<h1>Project Proposal</h1>

<h2>1. Prepared For</h2>
<p><strong>{{client_name}}</strong></p>

<h2>2. Prepared By</h2>
<p><strong>{{provider_name}}</strong></p>

<h2>3. Executive Summary</h2>
<p>{{description}}</p>

<h2>4. Scope of Work</h2>
<ul>
<li>Detail deliverables, milestones, and acceptance criteria.</li>
<li>Include any assumptions or dependencies.</li>
</ul>

<h2>5. Timeline</h2>
<p>Expected timeline: {{timeline}} (from {{start_date}} to {{end_date}}).</p>

<h2>6. Pricing</h2>
<p>Estimated budget: {{budget}}.</p>

<h2>7. Terms</h2>
<p>Standard terms apply. Governing law: <strong>{{jurisdiction}}</strong>.</p>

<h2>8. Signatures</h2>
<table>
<tr><td>Provider: {{provider_name}}</td><td>Client: {{client_name}}</td></tr>
<tr><td>Signature: _____________________</td><td>Signature: _____________________</td></tr>
<tr><td>Date: __________</td><td>Date: __________</td></tr>
</table>
`
  });

  // see note above

  // ---------- Seed Sample Clauses ----------
  const seeded = await prisma.$transaction(async (tx) => {
    const [tpl, svc, prop] = await Promise.all([
      tx.template.upsert({
        where: { name: "Balanced NDA v2" },
        update: { type: "nda", content: ndaContent },
        create: { name: "Balanced NDA v2", type: "nda", content: ndaContent },
      }),
      tx.template.upsert({
        where: { name: "Service Agreement v2" },
        update: { type: "service", content: svcContent },
        create: { name: "Service Agreement v2", type: "service", content: svcContent },
      }),
      tx.template.upsert({
        where: { name: "Proposal v2" },
        update: { type: "proposal", content: proposalContent },
        create: { name: "Proposal v2", type: "proposal", content: proposalContent },
      }),
    ]);

    // Make clause seeding idempotent and avoid duplicates
    await tx.clause.deleteMany({});
    await tx.clause.createMany({
      data: [
        {
          title: "Force Majeure",
          body:
            "<p>Neither party is liable for delays caused by events beyond reasonable control, including natural disasters, acts of government, or strikes.</p>",
          tags: JSON.stringify(["force_majeure", "neutral"]),
          jurisdiction: null,
          risk: "balanced",
        },
        {
          title: "Limitation of Liability (Cap 100%)",
          body:
            "<p>Liability is capped at the total fees paid in the 12 months preceding the claim. No indirect or consequential damages.</p>",
          tags: JSON.stringify(["liability", "cap", "msa"]),
          jurisdiction: "india",
          risk: "balanced",
        },
      ],
      // skipDuplicates: true,
    });

    return { tpl, svc, prop };
  });

  console.log("Seeded templates:", seeded.tpl.id, seeded.svc.id, seeded.prop.id);
}

main().finally(() => prisma.$disconnect());
