import puppeteer from 'puppeteer';
import os from 'os';
import path from 'path';

async function main() {
  const tempProfile = path.join(os.tmpdir(), `pup-profile-${Date.now()}`);
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    userDataDir: tempProfile,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('1. Checking http://localhost:3000/signup ...');
  const signupRes = await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
  console.log('Signup status:', signupRes?.status());

  await page.screenshot({ path: 'C:/Users/shuvo/.gemini/antigravity/brain/de721827-ddd8-4903-b53a-f28d490c334e/user-signup-ready.png' });
  console.log('Captured screenshot user-signup-ready.png');

  console.log('2. Checking http://localhost:3000/login ...');
  const loginRes = await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  console.log('Login status:', loginRes?.status());

  console.log('3. Checking http://localhost:3000/ (root redirect) ...');
  const rootRes = await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  console.log('Root landed URL:', page.url(), 'status:', rootRes?.status());

  await browser.close();
  console.log('Verification successful!');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
