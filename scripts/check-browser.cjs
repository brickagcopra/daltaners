const puppeteer = require('puppeteer');
const path = require('path');
const outDir = path.join(__dirname, '..');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('[ERR] ' + msg.text());
  });
  page.on('pageerror', err => errors.push('[PAGE] ' + err.message));
  page.on('requestfailed', req => errors.push('[NET] ' + req.url() + ' - ' + (req.failure() ? req.failure().errorText : 'failed')));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'screenshot-home.png', fullPage: true });

  const links = await page.$$('a[href*="/search"]');
  console.log('Search links found: ' + links.length);

  const catLinks = await page.$$('a[href*="category="]');
  console.log('Category links found: ' + catLinks.length);

  const inputs = await page.$$('input[type="text"]');
  console.log('Text inputs found: ' + inputs.length);

  // Test clicking a category
  if (catLinks.length > 0) {
    const href = await catLinks[0].evaluate(el => el.getAttribute('href'));
    console.log('First category href: ' + href);
    await catLinks[0].click();
    await new Promise(r => setTimeout(r, 3000));
    console.log('After category click URL: ' + page.url());
    await page.screenshot({ path: 'screenshot-category.png', fullPage: true });
  }

  // Go back and test search
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  const searchInput = await page.$('input[type="text"]');
  if (searchInput) {
    await searchInput.click();
    await searchInput.type('rice', { delay: 50 });
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 3000));
    console.log('After search URL: ' + page.url());
    await page.screenshot({ path: 'screenshot-search.png', fullPage: true });
  }

  // Check the search page
  await page.goto('http://localhost:5173/search', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'screenshot-searchpage.png', fullPage: true });

  const searchPageCats = await page.$$('button');
  console.log('Buttons on search page: ' + searchPageCats.length);

  console.log('\n=== ERRORS (' + errors.length + ') ===');
  errors.forEach(e => console.log(e));

  await browser.close();
})();
