import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';

const artifactDir = 'C:\\Users\\shuvo\\.gemini\\antigravity\\brain\\de721827-ddd8-4903-b53a-f28d490c334e';

async function verifyAll() {
  console.log('--- Starting OneDesk Comprehensive Verification ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    userDataDir: path.join(os.tmpdir(), 'edge_verify_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });

  // 1. Login as Joy Sarkar
  console.log('1. Authenticating as Joy Sarkar (joy185c@gmail.com)...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'joy185c@gmail.com');
  await page.type('input[type="password"]', 'Password123!Secure');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await new Promise((r) => setTimeout(r, 4000));
  console.log(`  Current page after login: ${page.url()}`);

  // 2. Inspect FABRIQ Dashboard
  console.log('2. Inspecting FABRIQ Dashboard (http://localhost:3000/w/fabriq)...');
  await page.goto('http://localhost:3000/w/fabriq', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3000));

  const dashboardText = await page.evaluate(() => document.body.innerText);
  const hasSarahChen = dashboardText.includes('Sarah Chen');
  const hasMarcusVance = dashboardText.includes('Marcus Vance');
  const hasElenaRostova = dashboardText.includes('Elena Rostova');
  const hasMobileBanking = dashboardText.includes('Mobile Banking App');

  console.log(`  Dashboard dummy data audit:`);
  console.log(`    - Sarah Chen present? ${hasSarahChen}`);
  console.log(`    - Marcus Vance present? ${hasMarcusVance}`);
  console.log(`    - Elena Rostova present? ${hasElenaRostova}`);
  console.log(`    - Mobile Banking App present? ${hasMobileBanking}`);

  const dashboardScreenshot = path.join(artifactDir, 'fabriq-dashboard-clean.png');
  await page.screenshot({ path: dashboardScreenshot });
  console.log(`  ✓ Saved FABRIQ dashboard screenshot: ${dashboardScreenshot}`);

  // 3. Inspect Chat Hub
  console.log('3. Inspecting Chat Hub (http://localhost:3000/w/fabriq/chat)...');
  await page.goto('http://localhost:3000/w/fabriq/chat', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3000));

  // If no textarea, click the first channel button in sidebar
  let hasTextarea = await page.$('textarea');
  if (!hasTextarea) {
    console.log('  Selecting channel in sidebar...');
    const chanButtons = await page.$$('button');
    for (const b of chanButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && (text.includes('announcements') || text.includes('general'))) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 4. Send Rich Markdown & LaTeX Message
  console.log('4. Testing Universal Markdown, KaTeX & Currency formatting...');
  await page.type('textarea', 'Sprint architecture: **Core Milestone** for `$WEB-1$`. Formula: $E=mc^2$. Budget: $250. Code: `pnpm build`');
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 3000));

  const chatScreenshot = path.join(artifactDir, 'fabriq-chat-rich-rendering.png');
  await page.screenshot({ path: chatScreenshot });
  console.log(`  ✓ Saved FABRIQ chat screenshot: ${chatScreenshot}`);

  // 5. Open Members Drawer
  console.log('5. Testing Channel Members & Moderation Drawer...');
  const membersBtn = await page.$('button[title="Channel Members"]');
  if (membersBtn) {
    await membersBtn.click();
    await new Promise((r) => setTimeout(r, 2000));
    const membersDrawerScreenshot = path.join(artifactDir, 'fabriq-chat-members-drawer.png');
    await page.screenshot({ path: membersDrawerScreenshot });
    console.log(`  ✓ Saved Channel Members Drawer screenshot: ${membersDrawerScreenshot}`);

    // Close drawer
    const closeBtn = await page.$('button[aria-label="Close"]') || await page.$('button:has-text("✕")') || await page.$('.lucide-x');
    if (closeBtn) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));
  } else {
    console.log('  ⚠️ Channel Members button not found by title');
  }

  // 6. Test @Mention Suggestion Autocomplete
  console.log('6. Testing @Mention autocomplete in composer...');
  await page.type('textarea', ' Hello @');
  await new Promise((r) => setTimeout(r, 1500));

  const mentionScreenshot = path.join(artifactDir, 'fabriq-mention-autocomplete.png');
  await page.screenshot({ path: mentionScreenshot });
  console.log(`  ✓ Saved mention autocomplete screenshot: ${mentionScreenshot}`);

  await browser.close();
  console.log('--- Verification Completed Successfully! ---');
}

verifyAll().catch(console.error);
