import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';

const artifactDir = 'C:\\Users\\shuvo\\.gemini\\antigravity\\brain\\de721827-ddd8-4903-b53a-f28d490c334e';

async function capture() {
  console.log('--- Capturing Upgraded Chat Experience ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    userDataDir: path.join(os.tmpdir(), 'edge_chat_upgrades_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });

  console.log('1. Navigating to Chat Hub (http://localhost:3000/w/factor-labs/chat)...');
  await page.goto('http://localhost:3000/w/factor-labs/chat', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  // Select general channel
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('general')) {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1500));

  // 1. Send Rich Message (Markdown, KaTeX, Currency, Code block)
  console.log('2. Sending Rich Message with LaTeX, GFM & Currency...');
  const richMsg = 'Roadmap update: **Sprint 1 Complete**! Formula: $E = mc^2$. Cost: $150. Check out `pnpm build` below.';
  await page.type('textarea', richMsg);
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 2000));

  const richChatPath = path.join(artifactDir, 'chat-rich-rendering-2sided.png');
  await page.screenshot({ path: richChatPath });
  console.log(`  ✓ Saved Rich Chat Screenshot to: ${richChatPath}`);

  // 2. Open Channel Members Drawer
  console.log('3. Opening Channel Members & Moderation Drawer...');
  const membersBtn = await page.$('button[title="Channel Members"]');
  if (membersBtn) {
    await membersBtn.click();
    await new Promise((r) => setTimeout(r, 1500));
    const drawerPath = path.join(artifactDir, 'chat-members-drawer-moderation.png');
    await page.screenshot({ path: drawerPath });
    console.log(`  ✓ Saved Channel Members Drawer Screenshot to: ${drawerPath}`);

    // Close drawer
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 800));
  } else {
    console.log('  ⚠️ Channel Members button not found');
  }

  // 3. Test @Mention Suggestion Autocomplete
  console.log('4. Testing @Mention Autocomplete in composer...');
  await page.type('textarea', ' Hey @');
  await new Promise((r) => setTimeout(r, 1500));

  const mentionPath = path.join(artifactDir, 'chat-mention-suggestions.png');
  await page.screenshot({ path: mentionPath });
  console.log(`  ✓ Saved Mention Suggestions Screenshot to: ${mentionPath}`);

  await browser.close();
  console.log('--- Capture Completed Successfully ---');
}

capture().catch(console.error);
