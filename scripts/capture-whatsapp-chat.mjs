import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';

const artifactDir = 'C:\\Users\\shuvo\\.gemini\\antigravity\\brain\\de721827-ddd8-4903-b53a-f28d490c334e';

async function captureGeneralChat() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    userDataDir: path.join(os.tmpdir(), 'edge_chat_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });

  await page.goto('http://localhost:3000/w/factor-labs/chat', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise((res) => setTimeout(res, 1500));

  // Click on "# general" channel in the sidebar
  const channelButtons = await page.$$('button');
  for (const btn of channelButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('general')) {
      await btn.click();
      break;
    }
  }

  await new Promise((res) => setTimeout(res, 1500));
  const targetPath = path.join(artifactDir, 'whatsapp-chat-2sided-both.png');
  await page.screenshot({ path: targetPath });
  console.log(`✓ Saved both-sided chat screenshot to ${targetPath}`);

  await browser.close();
}

captureGeneralChat().catch(console.error);
