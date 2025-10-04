import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const binJS = join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
if (!fs.existsSync(binJS)) {
  console.error('Cannot find Next.js CLI at', binJS);
  process.exit(1);
}

// Tune environment for faster dev and fewer cache-related stalls
const env = { ...process.env };
env.NEXT_DISABLE_WEBPACK_CACHE = env.NEXT_DISABLE_WEBPACK_CACHE ?? '1';
// Increase Node heap for large workspaces without relying on global shell config
const nodeOpts = env.NODE_OPTIONS ? `${env.NODE_OPTIONS} --max-old-space-size=4096` : '--max-old-space-size=4096';
env.NODE_OPTIONS = nodeOpts;

// Prefer Turbopack for faster HMR; allow opt-out via NO_TURBO=1
const args = ['dev'];
if (env.NO_TURBO !== '1') args.push('--turbo');

// Pass through any user-provided args
args.push(...process.argv.slice(2));

// Run Next CLI via Node to avoid Windows .cmd spawn issues
const child = spawn(process.execPath, [binJS, ...args], {
  stdio: 'inherit',
  cwd: projectRoot,
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

child.on('error', (err) => {
  console.error('Failed to start Next dev server:', err);
  process.exit(1);
});
