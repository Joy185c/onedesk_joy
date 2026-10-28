import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';

const artifactDir = 'C:\\Users\\shuvo\\.gemini\\antigravity\\brain\\de721827-ddd8-4903-b53a-f28d490c334e';

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

async function run() {
  console.log('Starting next server on port 3009...');
  const nextBin = path.resolve('node_modules', 'next', 'dist', 'bin', 'next');
  const server = spawn('node', [nextBin, 'start', '-p', '3009'], {
    cwd: 'D:\\onedesk',
    stdio: 'ignore',
  });

  try {
    await waitForServer('http://localhost:3009/w/factor-labs');
    console.log('Next.js server is ready. Launching Edge via Puppeteer...');

    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();

    // 1. Desktop Dashboard
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3009/w/factor-labs', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(artifactDir, 'dashboard.png'), fullPage: false });
    console.log('Captured dashboard.png');

    // 2. Focused Sidebar View (1200x800)
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
    await page.screenshot({ path: path.join(artifactDir, 'sidebar.png') });
    console.log('Captured sidebar.png');

    // 3. Project Overview Screen
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3009/w/factor-labs/projects/proj-real-estate', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(artifactDir, 'project-overview.png'), fullPage: false });
    console.log('Captured project-overview.png');

    // 4. Mobile Responsive View (iPhone 14 / modern mobile 390x844)
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3009/w/factor-labs', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(artifactDir, 'mobile-dashboard.png'), fullPage: false });
    console.log('Captured mobile-dashboard.png');

    await browser.close();
    console.log('All visual captures completed successfully!');
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
