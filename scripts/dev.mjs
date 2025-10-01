#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import net from 'node:net';

function log(msg) { console.log(`[dev] ${msg}`); }
function warn(msg) { console.warn(`[dev] ${msg}`); }

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
  const obj = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    obj[m[1]] = v;
  }
  return obj;
}

function ensureEnv() {
  // Load .env.local then .env (local takes precedence)
  const envLocal = parseEnvFile('.env.local');
  const env = parseEnvFile('.env');
  for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v;
  for (const [k, v] of Object.entries(envLocal)) process.env[k] = v;
}

function parseDbUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname || '127.0.0.1';
    const port = u.port ? parseInt(u.port, 10) : 5432;
    return { host, port };
  } catch {
    return { host: '127.0.0.1', port: 5432 };
  }
}

function isPortOpen(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onEnd = (ok) => { try { socket.destroy(); } catch {} resolve(ok); };
    socket.setTimeout(timeoutMs);
    socket.once('error', () => onEnd(false));
    socket.once('timeout', () => onEnd(false));
    socket.connect(port, host, () => onEnd(true));
  });
}

function cmdExists(cmd, args = ['--version']) {
  try {
    const r = spawnSync(cmd, args, { stdio: 'ignore' });
    return r.status === 0 || r.status === null; // some versions return null status on success
  } catch {
    return false;
  }
}

async function upDockerIfNeeded() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { warn('DATABASE_URL not set; skipping DB bootstrap'); return; }
  if (dbUrl.startsWith('file:')) { log('SQLite detected; no Docker needed.'); return; }
  const { host, port } = parseDbUrl(dbUrl);
  const open = await isPortOpen(host, port);
  if (open) { log(`DB port ${host}:${port} is open`); return; }

  const hasDocker = cmdExists('docker');
  if (!hasDocker) { warn('Docker not found; cannot start Postgres automatically.'); return; }

  const composeArgs = ['compose', 'up', '-d'];
  log('Starting Postgres via `docker compose up -d`...');
  const up = spawnSync('docker', composeArgs, { stdio: 'inherit' });
  if (up.status !== 0) {
    warn('Failed to run docker compose up.');
    return;
  }

  // Wait for port to open
  const start = Date.now();
  const deadline = start + 60_000; // 60s
  while (Date.now() < deadline) {
    if (await isPortOpen(host, port)) {
      log('Postgres is accepting connections.');
      return;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  warn('Timed out waiting for Postgres to become ready.');
}

function runSync(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`);
}

function prismaEnv() {
  return {
    ...process.env,
    PRISMA_HIDE_UPDATE_MESSAGE: '1',
    PRISMA_HIDE_TIPS: '1',
  };
}

function filterPrismaOutput(text = '') {
  const lines = String(text).split(/\r?\n/);
  const keep = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { keep.push(line); continue; }
    if (/^Tip:/i.test(trimmed)) continue;
    if (/pris\.ly/i.test(trimmed)) continue;
    if (/Update available/i.test(trimmed)) continue;
    if (/^Start by importing your Prisma Client/i.test(trimmed)) continue;
    if (/^[┌│└]/.test(trimmed)) continue;
    keep.push(line);
  }
  return keep.join('\n');
}

function runPrisma(args) {
  const res = spawnSync('npx', ['prisma', ...args], { env: prismaEnv(), encoding: 'utf8' });
  const out = filterPrismaOutput(res.stdout);
  const err = filterPrismaOutput(res.stderr);
  if (out) process.stdout.write(out + (out.endsWith('\n') ? '' : '\n'));
  if (err) process.stderr.write(err + (err.endsWith('\n') ? '' : '\n'));
  if (res.status !== 0) throw new Error(`prisma ${args.join(' ')} failed`);
}

async function ensurePrisma() {
  try {
    runPrisma(['generate']);
  } catch {}
  try {
    runPrisma(['db', 'push']);
  } catch (e) {
    warn(`Prisma db push failed: ${e.message}`);
  }
  try {
    runSync('npm', ['run', 'seed']);
  } catch (e) {
    warn(`Seed failed (may already be seeded): ${e.message}`);
  }
}

async function main() {
  ensureEnv();
  await upDockerIfNeeded();
  await ensurePrisma();

  log('Starting Next.js dev server...');
  // const child = spawn('next', ['dev'], { stdio: 'inherit', env: process.env });
  const child = spawn('npx', ['next', 'dev'], { stdio: 'inherit', env: process.env, shell:true });
  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((e) => { console.error(e); process.exit(1); });
