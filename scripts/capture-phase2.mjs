import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = 'C:\\Users\\shuvo\\.gemini\\antigravity\\brain\\de721827-ddd8-4903-b53a-f28d490c334e';

async function capturePhase2() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });

  // 1. Login Page
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(artifactDir, 'login-page.png') });
  console.log('Captured login-page.png');

  // 2. Signup Page
  await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(artifactDir, 'signup-page.png') });
  console.log('Captured signup-page.png');

  // 3. Workspace Members Governance Page
  await page.goto('http://localhost:3000/w/factor-labs/settings/members', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(artifactDir, 'workspace-members.png') });
  console.log('Captured workspace-members.png');

  await browser.close();
}

capturePhase2().catch(console.error);

