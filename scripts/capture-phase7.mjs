import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';

const artifactDir = 'C:\\Users\\shuvo\\.gemini\\antigravity\\brain\\de721827-ddd8-4903-b53a-f28d490c334e';

async function capturePhase7() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    userDataDir: path.join(os.tmpdir(), 'edge_phase7_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });

  const routes = [
    { url: 'http://localhost:3000/this-page-does-not-exist-test', file: 'phase7-404-recovery.png' },
    { url: 'http://localhost:3000/w/factor-labs', file: 'phase7-owner-command-center.png' },
    { url: 'http://localhost:3000/w/factor-labs/settings', file: 'phase7-workspace-governance.png' },
  ];

  for (const r of routes) {
    try {
      console.log(`Navigating to ${r.url}...`);
      await page.goto(r.url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await new Promise((res) => setTimeout(res, 2000));
      const targetPath = path.join(artifactDir, r.file);
      await page.screenshot({ path: targetPath });
      console.log(`✓ Saved ${r.file}`);
    } catch (err) {
      console.error(`Failed ${r.file}:`, err.message);
    }
  }

  await browser.close();
  console.log('Finished capturing Phase 7 screenshots.');
}

capturePhase7().catch(console.error);
