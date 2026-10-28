import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = 'C:\\Users\\shuvo\\.gemini\\antigravity\\brain\\de721827-ddd8-4903-b53a-f28d490c334e';

async function verify() {
  console.log('Connecting Puppeteer to live server at http://localhost:3000...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Desktop 1440x960
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000/w/factor-labs', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));

  // 2. Test Command Palette interaction
  console.log('Testing Command Palette open...');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyK');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 600));

  await page.screenshot({ path: path.join(artifactDir, 'command-palette-open.png') });
  console.log('Captured command-palette-open.png');

  // Close Command Palette with Escape
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 400));

  // 3. Test Quick Create Modal interaction
  console.log('Testing Quick Create Modal...');
  const createButtons = await page.$$('button');
  let createBtnFound = false;
  for (const btn of createButtons) {
    const text = await (await btn.getProperty('textContent')).jsonValue();
    if (text.includes('Create') && !text.includes('Workspace')) {
      await btn.click();
      createBtnFound = true;
      break;
    }
  }

  if (createBtnFound) {
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(artifactDir, 'quick-create-modal.png') });
    console.log('Captured quick-create-modal.png');
    await page.keyboard.press('Escape'); // Or click close
  }

  // 4. Test Tablet Responsive View (768x1024 - iPad / Medium Viewport)
  console.log('Testing Tablet Viewport (768x1024)...');
  await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000/w/factor-labs', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(artifactDir, 'tablet-dashboard.png') });
  console.log('Captured tablet-dashboard.png');

  // 5. Check all primary route statuses
  const routesToTest = [
    '/w/factor-labs',
    '/w/factor-labs/projects/proj-real-estate',
    '/w/factor-labs/projects/proj-mobile-app',
    '/w/factor-labs/inbox',
    '/w/factor-labs/my-tasks',
    '/w/factor-labs/tasks',
    '/w/factor-labs/calendar',
    '/w/factor-labs/spaces',
    '/w/factor-labs/chat',
    '/w/factor-labs/docs',
    '/w/factor-labs/goals',
    '/w/factor-labs/time',
    '/w/factor-labs/automations',
    '/w/factor-labs/ai',
    '/w/factor-labs/settings/general',
  ];

  console.log('Verifying route status codes...');
  const routeResults = [];
  for (const r of routesToTest) {
    const res = await page.goto(`http://localhost:3000${r}`, { waitUntil: 'domcontentloaded' });
    const status = res.status();
    routeResults.push({ route: r, status });
  }

  await browser.close();

  console.log('\n--- Route Verification Summary ---');
  routeResults.forEach((r) => console.log(`[${r.status}] ${r.route}`));

  if (consoleErrors.length > 0) {
    console.warn('\nClient Console Warnings/Errors:');
    consoleErrors.forEach((e) => console.warn(' - ', e));
  } else {
    console.log('\nClient Console: 0 runtime errors detected.');
  }
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

