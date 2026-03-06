import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
const logs = [];

page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error' || type === 'warning') {
    errors.push(`[${type}] ${text}`);
  } else {
    logs.push(`[${type}] ${text}`);
  }
});

page.on('pageerror', err => {
  errors.push(`[PAGE ERROR] ${err.message}`);
});

page.on('requestfailed', req => {
  errors.push(`[NETWORK FAIL] ${req.url()} - ${req.failure()?.errorText}`);
});

await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });

// Wait a bit for React to render
await new Promise(r => setTimeout(r, 3000));

// Take screenshot
await page.screenshot({ path: 'scripts/screenshot-home.png', fullPage: true });

// Try clicking a category card
const categoryLinks = await page.$$('a[href*="/search?category="]');
console.log(`\nFound ${categoryLinks.length} category links`);

if (categoryLinks.length > 0) {
  const href = await categoryLinks[0].evaluate(el => el.href);
  console.log(`First category link href: ${href}`);
  await categoryLinks[0].click();
  await new Promise(r => setTimeout(r, 2000));
  console.log(`After click, current URL: ${page.url()}`);
  await page.screenshot({ path: 'scripts/screenshot-after-click.png', fullPage: true });
}

// Try the search box
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
await new Promise(r => setTimeout(r, 1000));
const searchInput = await page.$('input[type="text"]');
if (searchInput) {
  await searchInput.click();
  await searchInput.type('rice');
  console.log(`\nTyped "rice" in search box`);
  await new Promise(r => setTimeout(r, 1000));
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 2000));
  console.log(`After search, current URL: ${page.url()}`);
  await page.screenshot({ path: 'scripts/screenshot-after-search.png', fullPage: true });
}

console.log('\n=== CONSOLE ERRORS ===');
errors.forEach(e => console.log(e));
console.log(`\nTotal errors: ${errors.length}`);
console.log(`Total logs: ${logs.length}`);

await browser.close();
