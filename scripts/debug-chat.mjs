import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    userDataDir: path.join(os.tmpdir(), 'edge_debug_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'joy185c@gmail.com');
  await page.type('input[type="password"]', 'Password123!Secure');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  await page.goto('http://localhost:3000/w/fabriq/chat', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3000));

  const text = await page.evaluate(() => document.body.innerText);
  console.log('--- Page text ---');
  console.log(text.slice(0, 1000));

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText);
  });
  console.log('Buttons:', buttons);

  await page.screenshot({ path: 'C:\\Users\\shuvo\\.gemini\\antigravity\\brain\\de721827-ddd8-4903-b53a-f28d490c334e\\chat-debug.png' });
  await browser.close();
}

run().catch(console.error);
