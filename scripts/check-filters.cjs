const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const requests = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('[ERR] ' + msg.text());
  });
  page.on('pageerror', err => errors.push('[PAGE] ' + err.message));
  page.on('requestfailed', req => errors.push('[NET] ' + req.url() + ' - ' + (req.failure() ? req.failure().errorText : 'failed')));
  page.on('response', res => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      requests.push('[' + res.status() + '] ' + res.url());
    }
  });

  // Go to search page
  await page.goto('http://localhost:5173/search', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'screenshot-filters-1-initial.png', fullPage: true });
  console.log('1. Search page loaded. URL: ' + page.url());

  // Click "Most Popular" sort
  const buttons = await page.$$('button');
  let popularBtn = null;
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text === 'Most Popular') { popularBtn = btn; break; }
  }
  if (popularBtn) {
    await popularBtn.click();
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'screenshot-filters-2-popular.png', fullPage: true });
    console.log('2. Clicked "Most Popular". URL: ' + page.url());
  } else {
    console.log('2. "Most Popular" button not found!');
  }

  // Click "Price: Low to High" sort
  let priceBtn = null;
  const buttons2 = await page.$$('button');
  for (const btn of buttons2) {
    const text = await btn.evaluate(el => el.textContent);
    if (text === 'Price: Low to High') { priceBtn = btn; break; }
  }
  if (priceBtn) {
    await priceBtn.click();
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'screenshot-filters-3-price.png', fullPage: true });
    console.log('3. Clicked "Price: Low to High". URL: ' + page.url());
  }

  // Click "Filters" button to expand price range
  let filtersBtn = null;
  const buttons3 = await page.$$('button');
  for (const btn of buttons3) {
    const text = await btn.evaluate(el => el.textContent.trim());
    if (text.includes('Filters')) { filtersBtn = btn; break; }
  }
  if (filtersBtn) {
    await filtersBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshot-filters-4-expanded.png', fullPage: true });
    console.log('4. Expanded price filters.');

    // Click "Under PHP 100"
    const buttons4 = await page.$$('button');
    let priceRangeBtn = null;
    for (const btn of buttons4) {
      const text = await btn.evaluate(el => el.textContent);
      if (text === 'Under PHP 100') { priceRangeBtn = btn; break; }
    }
    if (priceRangeBtn) {
      await priceRangeBtn.click();
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: 'screenshot-filters-5-under100.png', fullPage: true });
      console.log('5. Clicked "Under PHP 100". URL: ' + page.url());
    }
  }

  // Click a category pill
  const catButtons = await page.$$('button');
  let catBtn = null;
  for (const btn of catButtons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text.includes('Snacks')) { catBtn = btn; break; }
  }
  if (catBtn) {
    await catBtn.click();
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'screenshot-filters-6-snacks.png', fullPage: true });
    console.log('6. Clicked "Snacks" category. URL: ' + page.url());
  }

  console.log('\n=== API ERRORS ===');
  requests.forEach(r => console.log(r));
  console.log('\n=== CONSOLE ERRORS ===');
  errors.forEach(e => console.log(e));

  await browser.close();
})();
