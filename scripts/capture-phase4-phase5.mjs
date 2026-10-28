import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = 'C:\\Users\\shuvo\\.gemini\\antigravity\\brain\\de721827-ddd8-4903-b53a-f28d490c334e';

async function capturePhase4And5() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });

  const routes = [
    { url: 'http://localhost:3000/w/fabriq/chat', file: 'phase4-chat-hub.png' },
    { url: 'http://localhost:3000/w/fabriq/inbox', file: 'phase4-inbox.png' },
    { url: 'http://localhost:3000/w/fabriq/docs', file: 'phase5-docs-wiki.png' },
    { url: 'http://localhost:3000/w/fabriq/goals', file: 'phase5-goals-okrs.png' },
    { url: 'http://localhost:3000/w/fabriq/time', file: 'phase5-time-tracking.png' },
    { url: 'http://localhost:3000/w/fabriq/calendar', file: 'phase5-calendar.png' },
    { url: 'http://localhost:3000/w/fabriq/my-tasks', file: 'phase5-my-tasks.png' },
    { url: 'http://localhost:3000/w/fabriq/team', file: 'phase5-team-directory.png' },
  ];

  for (const r of routes) {
    try {
      console.log(`Navigating to ${r.url}...`);
      await page.goto(r.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise((res) => setTimeout(res, 1200));
      const targetPath = path.join(artifactDir, r.file);
      await page.screenshot({ path: targetPath });
      console.log(`✓ Saved ${r.file}`);
    } catch (err) {
      console.error(`Failed ${r.file}:`, err.message);
    }
  }

  await browser.close();
  console.log('Finished capturing Phase 4 & 5 screenshots.');
}

capturePhase4And5().catch(console.error);
