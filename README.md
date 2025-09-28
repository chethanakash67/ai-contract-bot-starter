# AI Contract Bot — Starter Repo

A minimal Next.js (App Router + TypeScript) starter for a web-based **AI Proposal & Contract Generator** with TipTap editor, HTML→PDF export (Playwright), Prisma/Postgres, and Dropbox Sign (HelloSign) stubs.

## Quick Start

1. **Install prerequisites**
   - Node.js 20+
   - PostgreSQL (Neon/Supabase recommended)
   - (Optional) Cloudflare R2 / AWS S3 for PDF storage

2. **Install deps**
   ```bash
   npm install
   ```

3. **Set env vars**
   Copy `.env.example` to `.env.local` and fill:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `HELLOSIGN_API_KEY`
   - `S3_*` + `APP_URL`

4. **Prisma**
   ```bash
   npx prisma migrate dev -n init
   npm run seed
   ```

5. **Playwright (for server-side PDF)**
   ```bash
   npx playwright install --with-deps
   ```

6. **Run**
   ```bash
   npm run dev
   ```

Open http://localhost:3000/new — paste a Template ID from Prisma Studio (for now) and test:
- **AI Generate → Save → Validate → Export PDF**

> This is an MVP scaffold. Add auth, RBAC, template picker, parties UI, e-sign webhook verification, etc.

# ai-contract-bot-starter