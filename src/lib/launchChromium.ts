import { chromium, type Browser } from 'playwright';
import { existsSync } from 'node:fs';

function detectLocalChrome(): string | undefined {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates: string[] = [];
  const platform = process.platform;
  if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    );
  } else if (platform === 'linux') {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    );
  } else if (platform === 'win32') {
    candidates.push(
      'C\\\x3a\\\x5cProgram Files\\\x5cGoogle\\\x5cChrome\\\x5cApplication\\\x5cchrome.exe',
      'C\\\x3a\\\x5cProgram Files (x86)\\\x5cGoogle\\\x5cChrome\\\x5cApplication\\\x5cchrome.exe'
    );
  }
  for (const p of candidates) if (existsSync(p)) return p;
  return undefined;
}

export async function launchChromium(): Promise<Browser> {
  try {
    // Try bundled Playwright Chromium first
    return await chromium.launch({ headless: true });
  } catch (e: any) {
    // Fallback to a locally installed Chrome/Chromium if available
    const local = detectLocalChrome();
    if (local) {
      try {
        return await chromium.launch({ headless: true, executablePath: local, args: ['--headless=new'] });
      } catch {}
    }
    // Try channel-based Chrome (uses system install if available)
    try {
      return await chromium.launch({ headless: true, channel: 'chrome' });
    } catch {}

    const msg = e?.message || String(e);
    throw new Error(
      `${msg}. Install Playwright browsers with: npx playwright install chromium (or set CHROME_PATH to your Chrome executable).`
    );
  }
}

