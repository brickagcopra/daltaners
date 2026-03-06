import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Collect console warnings/errors only
const issues = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    const text = msg.text();
    if (!text.includes('React Router Future Flag') && !text.includes('React DevTools') && !text.includes('i18next')) {
      issues.push(`[${msg.type()}] ${text}`);
    }
  }
});
page.on('pageerror', (err) => issues.push(`[PAGE_ERROR] ${err.message}`));
page.on('requestfailed', (req) => issues.push(`[REQ_FAIL] ${req.method()} ${req.url()}`));

// Test pages
const pages = [
  { url: 'http://localhost:5173/food', name: 'Food Page', screenshot: 'scripts/debug-food.png' },
  { url: 'http://localhost:5173/pharmacy', name: 'Pharmacy Page', screenshot: 'scripts/debug-pharmacy.png' },
  { url: 'http://localhost:5173/search?q=rice', name: 'Search Page', screenshot: 'scripts/debug-search.png' },
];

for (const p of pages) {
  issues.length = 0;
  console.log(`\n=== ${p.name.toUpperCase()} ===`);
  try {
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    console.log('Navigation error:', e.message);
  }
  await page.waitForTimeout(2000);

  const bodyText = await page.textContent('body');
  const visibleText = bodyText?.trim().substring(0, 400);
  console.log('Visible text:', visibleText);

  if (issues.length > 0) {
    console.log('Issues:');
    issues.forEach((i) => console.log('  ', i));
  } else {
    console.log('No issues!');
  }

  await page.screenshot({ path: p.screenshot, fullPage: true });
  console.log(`Screenshot: ${p.screenshot}`);
}

await browser.close();
