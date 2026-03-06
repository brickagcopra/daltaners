import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Collect console messages
const consoleLogs = [];
page.on('console', (msg) => {
  consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
});

// Collect page errors
const pageErrors = [];
page.on('pageerror', (err) => {
  pageErrors.push(err.message);
});

// Collect failed network requests
const failedRequests = [];
page.on('requestfailed', (req) => {
  failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
});

// Track API responses
const apiResponses = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('/api/v1/') || url.includes('mockServiceWorker')) {
    let body = '';
    try {
      body = (await res.text()).substring(0, 200);
    } catch {}
    apiResponses.push(`${res.status()} ${url.split('?')[0]} => ${body}`);
  }
});

console.log('--- Navigating to http://localhost:5173 ---');
try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
} catch (e) {
  console.log('Navigation timeout/error:', e.message);
}

// Wait a bit more for async data
await page.waitForTimeout(3000);

// Check what rendered
const rootHTML = await page.$eval('#root', (el) => el.innerHTML.substring(0, 500));
const bodyText = await page.textContent('body');
const visibleText = bodyText?.trim().substring(0, 500);

console.log('\n=== PAGE STATE ===');
console.log('Root HTML (first 500 chars):', rootHTML);
console.log('\nVisible text (first 500 chars):', visibleText);

console.log('\n=== CONSOLE LOGS ===');
consoleLogs.forEach((l) => console.log(l));

console.log('\n=== PAGE ERRORS ===');
pageErrors.forEach((e) => console.log(e));

console.log('\n=== FAILED REQUESTS ===');
failedRequests.forEach((r) => console.log(r));

console.log('\n=== API RESPONSES ===');
apiResponses.forEach((r) => console.log(r));

// Take screenshot
await page.screenshot({ path: 'scripts/debug-screenshot.png', fullPage: true });
console.log('\nScreenshot saved to scripts/debug-screenshot.png');

await browser.close();
