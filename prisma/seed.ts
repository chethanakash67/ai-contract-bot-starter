
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const ndaContent = JSON.stringify({
    parties: { discloser: "{{discloser_name}}", recipient: "{{recipient_name}}" },
    body: `
<h1>Mutual Non-Disclosure Agreement</h1>
<p>Parties: {{discloser_name}} and {{recipient_name}}</p>
<p>Agreement Period: {{start_date}} to {{end_date}}</p>
<h2>Confidential Information</h2>
<p>Information disclosed by either party that is marked or reasonably considered confidential…</p>
<h2>Governing Law</h2>
<p>{{jurisdiction}} law applies.</p>
<h2>Description</h2>
<p>{{description}}</p>
<h2>Signatures</h2>
<p>— {{discloser_name}} / {{recipient_name}}</p>`
  });

  let tpl = await prisma.template.upsert({
    where: { name: "Balanced NDA v1" },
    update: { type: "nda", content: ndaContent },
    create: { name: "Balanced NDA v1", type: "nda", content: ndaContent }
  });

  // Ensure a Service Agreement template exists
  const svcContent = JSON.stringify({
    parties: { provider: "{{provider_name}}", client: "{{client_name}}" },
    body: `
<h1>Service Agreement</h1>
<p>Between {{provider_name}} ("Provider") and {{client_name}} ("Client").</p>
<p>Agreement Period: {{start_date}} to {{end_date}}</p>
<h2>Services</h2>
<p>Provider will deliver the services described in the attached Statement of Work.</p>
<h2>Fees</h2>
<p>Fees: {{fees}}.</p>
<h2>Term & Termination</h2>
<p>Either party may terminate for material breach after 30 days' notice.</p>
<h2>IP & Confidentiality</h2>
<p>Each party retains its pre-existing IP. Confidentiality obligations apply to non-public information.</p>
<h2>Governing Law</h2>
<p>{{jurisdiction}} law applies.</p>
<h2>Description</h2>
<p>{{description}}</p>
<h2>Signatures</h2>
<p>— {{provider_name}} / {{client_name}}</p>`
  });

  let svc = await prisma.template.upsert({
    where: { name: "Service Agreement v1" },
    update: { type: "service", content: svcContent },
    create: { name: "Service Agreement v1", type: "service", content: svcContent }
  });

  await prisma.clause.createMany({
    data: [
      { title: "Force Majeure", body: "<p>Neither party is liable for delays caused by events beyond reasonable control…</p>", tags: JSON.stringify(["force_majeure","neutral"]), jurisdiction: null, risk: "balanced" },
      { title: "Limitation of Liability (Cap 100%)", body: "<p>Liability is capped at the total fees paid in the 12 months preceding the claim…</p>", tags: JSON.stringify(["liability","cap","msa"]), jurisdiction: "india", risk: "balanced" }
    ]
  });

  console.log("Seeded templates:", tpl.id, svc.id);
}

main().finally(()=>prisma.$disconnect());
