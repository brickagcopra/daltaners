const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../apps/customer-web/public/images/products');
const THUMB_DIR = path.join(OUT_DIR, 'thumb');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(THUMB_DIR, { recursive: true });

// Product definitions: [filename, label, bgColor, accentColor, emoji/icon-text]
const products = [
  // Grocery — Rice
  ['sinandomeng-5kg', 'Sinandomeng\nPremium Rice\n5kg', '#F5E6CA', '#8B6914', '🍚'],
  ['dinorado-5kg', 'Dinorado\nRice 5kg', '#FAF0DB', '#A0722D', '🍚'],
  ['organic-brown-rice-2kg', 'Organic\nBrown Rice\n2kg', '#D2B48C', '#5C3D1A', '🌾'],

  // Grocery — Canned Goods
  ['century-tuna-155g', 'Century Tuna\nFlakes in Oil\n155g', '#1E90FF', '#FFFFFF', '🐟'],
  ['ligo-sardines-155g', 'Ligo Sardines\nTomato Sauce\n155g', '#DC143C', '#FFD700', '🐟'],
  ['cdo-karne-norte-150g', 'CDO Karne Norte\nCorned Beef\n150g', '#B22222', '#FFFFFF', '🥩'],

  // Grocery — Noodles
  ['lucky-me-6pk', 'Lucky Me!\nPancit Canton\n6-Pack', '#FF8C00', '#FFFFFF', '🍜'],
  ['nissin-cup-noodles-60g', 'Nissin Cup\nNoodles\nSeafood 60g', '#FF4500', '#FFFFFF', '🍜'],

  // Grocery — Beverages
  ['kopiko-brown-coffee', 'Kopiko Brown\nCoffee 3-in-1\n10 Sachets', '#3E1F00', '#FFD700', '☕'],
  ['c2-green-tea-500ml', 'C2 Green Tea\nApple\n500ml', '#228B22', '#FFFFFF', '🍵'],

  // Grocery — Condiments
  ['datu-puti-soy-sauce-1l', 'Datu Puti\nSoy Sauce\n1 Liter', '#1A0A00', '#C8A200', '🫘'],
  ['silver-swan-patis-350ml', 'Silver Swan\nFish Sauce\n350ml', '#8B4513', '#FFD700', '🐟'],
  ['mama-sitas-sinigang', 'Mama Sita\'s\nSinigang Mix\nSampaloc', '#FF6347', '#FFFFFF', '🌶️'],

  // Grocery — Snacks
  ['chippy-bbq-110g', 'Chippy\nBarbecue\n110g', '#FF4500', '#FFD700', '🌽'],
  ['boy-bawang-100g', 'Boy Bawang\nCornick Garlic\n100g', '#DAA520', '#8B0000', '🌽'],

  // Grocery — Cooking
  ['minola-coconut-oil-1l', 'Minola\nCoconut Oil\n1 Liter', '#FFFACD', '#228B22', '🥥'],

  // Grocery — Fresh Produce
  ['kangkong-250g', 'Kangkong\nWater Spinach\n250g', '#2E8B57', '#FFFFFF', '🥬'],
  ['carabao-mango', 'Carabao\nMango\nper kg', '#FFD700', '#FF8C00', '🥭'],

  // Grocery — Meat & Fish
  ['pork-liempo-kg', 'Pork Liempo\nBelly\nper kg', '#FFB6C1', '#8B0000', '🥩'],
  ['bangus-boneless', 'Bangus\nBoneless\nper kg', '#87CEEB', '#005A8B', '🐟'],

  // Grocery — Bakery
  ['pandesal-10pcs', 'Pandesal\n10 pieces', '#DEB887', '#8B4513', '🍞'],

  // Grocery — Dried Fish
  ['tuyo-200g', 'Tuyo\nDried Herring\n200g', '#CD853F', '#5C3317', '🐟'],

  // Grocery — Dairy
  ['alaska-evaporada-370ml', 'Alaska\nEvaporada\n370ml', '#4169E1', '#FFFFFF', '🥛'],

  // Grocery — Sugar
  ['washed-sugar-1kg', 'Washed Sugar\n1kg', '#FFFAF0', '#8B7355', '🍬'],

  // Restaurant — Filipino Dishes
  ['chicken-adobo', 'Chicken\nAdobo', '#5C3317', '#FFD700', '🍗'],
  ['sinigang-baboy', 'Sinigang\nna Baboy', '#FF6347', '#90EE90', '🍲'],
  ['kare-kare-family', 'Kare-Kare\nFamily', '#FF8C00', '#8B4513', '🍲'],
  ['lechon-kawali', 'Lechon\nKawali', '#CD853F', '#8B0000', '🍖'],
  ['bistek-tagalog', 'Bistek\nTagalog', '#8B4513', '#FFD700', '🥩'],
  ['halo-halo', 'Halo-Halo\nSpecial', '#DDA0DD', '#4B0082', '🍧'],
  ['palabok-solo', 'Palabok\nFiesta', '#FF8C00', '#FF4500', '🍜'],

  // Pharmacy
  ['biogesic-10s', 'Biogesic\nParacetamol\n500mg 10s', '#FFFFFF', '#0066CC', '💊'],
  ['neozep-forte-10s', 'Neozep Forte\n10 Tablets', '#FF4500', '#FFFFFF', '💊'],
  ['kremil-s-10s', 'Kremil-S\nAntacid\n10 Tablets', '#228B22', '#FFFFFF', '💊'],
  ['poten-cee-100s', 'Poten-Cee\nVitamin C\n500mg 100s', '#FFA500', '#FFFFFF', '💊'],
  ['safeguard-135g', 'Safeguard\nPure White\nSoap 135g', '#4169E1', '#FFFFFF', '🧼'],
  ['alaxan-fr-10s', 'Alaxan FR\n10 Capsules', '#DC143C', '#FFFFFF', '💊'],

  // Electronics
  ['phone-case', 'Universal\nPhone Case', '#1A1A2E', '#00D4FF', '📱'],
  ['usbc-charger-65w', 'USB-C\nFast Charger\n65W', '#F0F0F0', '#333333', '🔌'],
  ['usbc-lightning-1m', 'USB-C to\nLightning\nCable 1m', '#F0F0F0', '#555555', '🔗'],
];

async function generateImage(filename, label, bgColor, textColor, emoji, width = 400, height = 400) {
  const lines = label.split('\n');
  const fontSize = width > 200 ? 28 : 16;
  const emojiSize = width > 200 ? 64 : 36;
  const lineHeight = fontSize + 6;
  const totalTextHeight = lines.length * lineHeight;
  const startY = height / 2 + 20;

  const textElements = lines.map((line, i) =>
    `<text x="${width/2}" y="${startY + i * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${escapeXml(line)}</text>`
  ).join('\n    ');

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}" rx="12"/>
  <text x="${width/2}" y="${height/2 - totalTextHeight/2 - 10}" font-size="${emojiSize}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  ${textElements}
</svg>`;

  const mainPath = path.join(OUT_DIR, `${filename}.jpg`);
  const thumbPath = path.join(THUMB_DIR, `${filename}.jpg`);

  await sharp(Buffer.from(svg))
    .resize(width, height)
    .jpeg({ quality: 85 })
    .toFile(mainPath);

  await sharp(Buffer.from(svg))
    .resize(150, 150)
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  return mainPath;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function main() {
  console.log(`Generating ${products.length} product images...`);
  for (const [filename, label, bg, text, emoji] of products) {
    await generateImage(filename, label, bg, text, emoji);
    console.log(`  ✓ ${filename}.jpg`);
  }
  console.log(`\nDone! ${products.length} images + thumbnails generated in:`);
  console.log(`  ${OUT_DIR}`);
  console.log(`  ${THUMB_DIR}`);
}

main().catch(console.error);
