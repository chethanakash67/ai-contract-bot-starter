
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  let tpl = await prisma.template.findFirst({ where: { name: "Balanced NDA v1" } });
  if (!tpl) {
    tpl = await prisma.template.create({
      data: {
        name: "Balanced NDA v1",
        type: "nda",
        content: {
          parties: { discloser: "{{discloser_name}}", recipient: "{{recipient_name}}" },
          body: `
<h1>Mutual Non-Disclosure Agreement</h1>
<p>Effective Date: {{effective_date}}</p>
<p>Between {{discloser_name}} and {{recipient_name}}.</p>
<h2>Confidential Information</h2>
<p>Information disclosed by either party that is marked or reasonably considered confidential…</p>
<h2>Term</h2>
<p>This Agreement lasts {{term_months}} months from the Effective Date.</p>
<h2>Governing Law</h2>
<p>{{jurisdiction}} law applies.</p>
<h2>Signatures</h2>
<p>— {{discloser_name}} / {{recipient_name}}</p>`
        }
      }
    });
  }

  await prisma.clause.createMany({
    data: [
      { title: "Force Majeure", body: "<p>Neither party is liable for delays caused by events beyond reasonable control…</p>", tags: ["force_majeure","neutral"], jurisdiction: null, risk: "balanced" },
      { title: "Limitation of Liability (Cap 100%)", body: "<p>Liability is capped at the total fees paid in the 12 months preceding the claim…</p>", tags: ["liability","cap","msa"], jurisdiction: "india", risk: "balanced" }
    ],
    skipDuplicates: true
  });

  console.log("Seeded template:", tpl.id);
}

main().finally(()=>prisma.$disconnect());
