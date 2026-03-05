const img = (name: string) => `https://placehold.co/400x400/f3f4f6/374151?text=${encodeURIComponent(name)}`;
const thumb = (name: string) => `https://placehold.co/150x150/f3f4f6/374151?text=${encodeURIComponent(name)}`;

interface MockProduct {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  sku: string;
  barcode: string | null;
  brand: string | null;
  unit_type: string;
  unit_value: number;
  base_price: number;
  sale_price: number | null;
  cost_price: number;
  tax_rate: number;
  is_taxable: boolean;
  weight_grams: number;
  dimensions: unknown;
  is_active: boolean;
  is_featured: boolean;
  requires_prescription: boolean;
  is_perishable: boolean;
  shelf_life_days: number | null;
  nutritional_info: Record<string, unknown> | null;
  allergens: string[];
  dietary_tags: string[];
  rating_average: number;
  rating_count: number;
  total_sold: number;
  images: Array<{ id: string; product_id: string; url: string; thumbnail_url: string; alt_text: string; sort_order: number; is_primary: boolean }>;
  variants: unknown[];
  created_at: string;
  updated_at: string;
}

function makeProduct(
  id: string,
  storeId: string,
  categoryId: string,
  name: string,
  price: number,
  overrides: Partial<MockProduct> = {},
): MockProduct {
  return {
    id,
    store_id: storeId,
    category_id: categoryId,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
    description: `Fresh and high-quality ${name}. Sourced locally from Philippine farms and suppliers.`,
    short_description: name,
    sku: `SKU-${id}`,
    barcode: null,
    brand: null,
    unit_type: 'piece',
    unit_value: 1,
    base_price: price,
    sale_price: null,
    cost_price: price * 0.7,
    tax_rate: 0.12,
    is_taxable: true,
    weight_grams: 500,
    dimensions: null,
    is_active: true,
    is_featured: false,
    requires_prescription: false,
    is_perishable: false,
    shelf_life_days: null,
    nutritional_info: null,
    allergens: [],
    dietary_tags: [],
    rating_average: 4.5,
    rating_count: 100,
    total_sold: 500,
    images: [
      { id: `img-${id}`, product_id: id, url: img(name), thumbnail_url: thumb(name), alt_text: name, sort_order: 0, is_primary: true },
    ],
    variants: [],
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2026-02-20T10:00:00Z',
    ...overrides,
  };
}

export const products = [
  // ===== FRUITS & VEGETABLES (cat-001) =====
  makeProduct('prod-001', 'store-001', 'cat-001-a', 'Manila Mangoes (Carabao)', 180, {
    description: 'Sweet and juicy Carabao mangoes from Guimaras. The best mangoes in the world.',
    unit_type: 'kg', is_featured: true, is_perishable: true, shelf_life_days: 5,
    rating_average: 4.9, rating_count: 320, total_sold: 2100, barcode: '4801234567001',
  }),
  makeProduct('prod-002', 'store-006', 'cat-001-a', 'Calamansi (Bag of 20)', 35, {
    description: 'Fresh Philippine calamansi limes. Perfect for sawsawan, drinks, and cooking.',
    unit_type: 'pack', is_perishable: true, shelf_life_days: 7,
    rating_average: 4.6, rating_count: 450, total_sold: 3500, barcode: '4801234567002',
  }),
  makeProduct('prod-003', 'store-006', 'cat-001-b', 'Kamote (Sweet Potato)', 60, {
    description: 'Fresh Filipino kamote. Great for boiling, frying, or making kamote cue.',
    unit_type: 'kg', is_perishable: true, shelf_life_days: 14,
    rating_average: 4.4, rating_count: 200, total_sold: 1800,
  }),
  makeProduct('prod-004', 'store-002', 'cat-001-b', 'Malunggay (Moringa) Leaves', 45, {
    description: 'Fresh malunggay leaves. Superfood packed with vitamins. Essential for tinola.',
    unit_type: 'bundle', is_perishable: true, shelf_life_days: 3,
    rating_average: 4.7, rating_count: 180, total_sold: 2200, dietary_tags: ['superfood', 'organic'], barcode: '4801234567004',
  }),
  makeProduct('prod-005', 'store-006', 'cat-001-b', 'Kangkong (Water Spinach)', 30, {
    description: 'Fresh kangkong bunch. Perfect for adobong kangkong or sinigang.',
    unit_type: 'bundle', is_perishable: true, shelf_life_days: 3,
    rating_average: 4.3, rating_count: 290, total_sold: 4100,
  }),
  makeProduct('prod-006', 'store-006', 'cat-001-b', 'Talong (Eggplant)', 50, {
    description: 'Fresh Filipino eggplant. Ideal for tortang talong and pinakbet.',
    unit_type: 'kg', is_perishable: true, shelf_life_days: 7,
    rating_average: 4.5, rating_count: 160, total_sold: 1500, barcode: '4801234567006',
  }),
  makeProduct('prod-007', 'store-002', 'cat-001-a', 'Saging na Saba (Cooking Banana)', 40, {
    description: 'Saba bananas for banana cue, turon, and ginataang. Always fresh.',
    unit_type: 'bundle', is_perishable: true, shelf_life_days: 5,
    rating_average: 4.6, rating_count: 210, total_sold: 2800, barcode: '4801234567007',
  }),
  makeProduct('prod-008', 'store-002', 'cat-001-b', 'Sitaw (String Beans)', 55, {
    description: 'Fresh sitaw. Great for pinakbet, sinigang, and kare-kare.',
    unit_type: 'bundle', is_perishable: true, shelf_life_days: 4,
    rating_average: 4.3, rating_count: 120, total_sold: 980,
  }),

  // ===== MEAT & SEAFOOD (cat-002) =====
  makeProduct('prod-009', 'store-004', 'cat-002-c', 'Bangus (Milkfish) - Boneless', 220, {
    description: 'Premium boneless bangus from Dagupan. Ready to cook — perfect for sinigang, daing, or relleno.',
    unit_type: 'kg', is_perishable: true, shelf_life_days: 2, is_featured: true,
    rating_average: 4.8, rating_count: 450, total_sold: 3200, barcode: '4801234567009',
  }),
  makeProduct('prod-010', 'store-004', 'cat-002-a', 'Pork Liempo (Belly)', 320, {
    description: 'Fresh pork liempo. The king of inihaw — slice it, marinate it, grill it.',
    unit_type: 'kg', is_perishable: true, shelf_life_days: 2,
    rating_average: 4.7, rating_count: 380, total_sold: 2900, barcode: '4801234567010',
  }),
  makeProduct('prod-011', 'store-004', 'cat-002-b', 'Whole Chicken', 195, {
    description: 'Fresh whole chicken. Perfect for tinola, adobo, or fried chicken.',
    unit_type: 'kg', is_perishable: true, shelf_life_days: 2,
    rating_average: 4.5, rating_count: 520, total_sold: 4500, barcode: '4801234567011',
  }),
  makeProduct('prod-012', 'store-004', 'cat-002-c', 'Tilapia (Fresh)', 160, {
    description: 'Farm-raised tilapia. Great for sinigang sa miso or fried.',
    unit_type: 'kg', is_perishable: true, shelf_life_days: 2,
    rating_average: 4.4, rating_count: 290, total_sold: 2100,
  }),
  makeProduct('prod-013', 'store-006', 'cat-002-c', 'Hipon (Shrimp) - Medium', 420, {
    description: 'Fresh medium-sized shrimp. Perfect for sinigang na hipon or garlic butter shrimp.',
    unit_type: 'kg', is_perishable: true, shelf_life_days: 1, allergens: ['shellfish'],
    rating_average: 4.6, rating_count: 180, total_sold: 1200,
  }),
  makeProduct('prod-014', 'store-001', 'cat-002-d', 'Tocino (Sweet Cured Pork)', 185, {
    description: 'Classic Filipino tocino. Sweet-cured pork slices. Just fry and serve with garlic rice.',
    unit_type: 'pack', is_perishable: true, shelf_life_days: 7,
    rating_average: 4.8, rating_count: 620, total_sold: 5100, brand: 'Purefoods', barcode: '4801234567014',
  }),
  makeProduct('prod-015', 'store-001', 'cat-002-d', 'Longganisa Lucban', 165, {
    description: 'Authentic garlicky Lucban longganisa. The perfect breakfast silog partner.',
    unit_type: 'pack', is_perishable: true, shelf_life_days: 7,
    rating_average: 4.7, rating_count: 410, total_sold: 3800, brand: 'Pampangas Best', barcode: '4801234567015',
  }),
  makeProduct('prod-016', 'store-004', 'cat-002-a', 'Pork Kasim (Shoulder)', 280, {
    description: 'Fresh pork kasim. Ideal for menudo, mechado, and afritada.',
    unit_type: 'kg', is_perishable: true, shelf_life_days: 2,
    rating_average: 4.5, rating_count: 190, total_sold: 1600,
  }),
  makeProduct('prod-017', 'store-004', 'cat-002-b', 'Chicken Thigh Fillet', 240, {
    description: 'Boneless chicken thigh fillet. Juicy and versatile for any dish.',
    unit_type: 'kg', is_perishable: true, shelf_life_days: 2,
    rating_average: 4.6, rating_count: 310, total_sold: 2700, barcode: '4801234567017',
  }),

  // ===== RICE & GRAINS (cat-003) =====
  makeProduct('prod-018', 'store-001', 'cat-003', 'Jasmine Rice 5kg', 350, {
    description: 'Premium Thai jasmine rice. Fragrant, fluffy, and perfect with any ulam.',
    unit_type: 'pack', weight_grams: 5000, is_featured: true,
    rating_average: 4.6, rating_count: 890, total_sold: 7200, brand: 'Golden Grain', barcode: '4801234567018',
  }),
  makeProduct('prod-019', 'store-001', 'cat-003', 'Sinandomeng Rice 5kg', 280, {
    description: 'Local Sinandomeng variety. The everyday Filipino household rice.',
    unit_type: 'pack', weight_grams: 5000,
    rating_average: 4.4, rating_count: 1200, total_sold: 9500, barcode: '4801234567019',
  }),
  makeProduct('prod-020', 'store-002', 'cat-003', 'Brown Rice 2kg', 195, {
    description: 'Whole grain brown rice. Healthier alternative with more fiber and nutrients.',
    unit_type: 'pack', weight_grams: 2000, dietary_tags: ['whole-grain', 'high-fiber'],
    rating_average: 4.3, rating_count: 340, total_sold: 1800,
  }),
  makeProduct('prod-021', 'store-001', 'cat-003', 'Malagkit (Glutinous Rice) 1kg', 110, {
    description: 'Sticky glutinous rice for kakanin. Essential for suman, biko, and puto.',
    unit_type: 'pack', weight_grams: 1000,
    rating_average: 4.5, rating_count: 230, total_sold: 1400, barcode: '4801234567021',
  }),

  // ===== BEVERAGES (cat-004) =====
  makeProduct('prod-022', 'store-001', 'cat-004-c', 'San Miguel Pale Pilsen (6-pack)', 330, {
    description: 'The iconic Filipino beer. Six 330ml bottles of San Miguel Pale Pilsen.',
    unit_type: 'pack', brand: 'San Miguel', is_featured: true,
    rating_average: 4.7, rating_count: 1500, total_sold: 12000, barcode: '4801234567022',
  }),
  makeProduct('prod-023', 'store-003', 'cat-004-a', 'Bear Brand Adult Plus 300g', 125, {
    description: 'Fortified powdered milk for adults. Mas matibay na resistensya.',
    unit_type: 'piece', brand: 'Bear Brand',
    rating_average: 4.5, rating_count: 670, total_sold: 5400, barcode: '4801234567023',
  }),
  makeProduct('prod-024', 'store-003', 'cat-004-a', 'C2 Green Tea Apple 500ml', 25, {
    description: 'Refreshing apple green tea. A Filipino convenience store favorite.',
    unit_type: 'piece', brand: 'C2',
    rating_average: 4.3, rating_count: 890, total_sold: 8900,
  }),
  makeProduct('prod-025', 'store-003', 'cat-004-b', 'Kopiko Brown 3-in-1 (10 sachets)', 85, {
    description: 'Rich and creamy 3-in-1 coffee. Just add hot water. Masarap na umaga!',
    unit_type: 'pack', brand: 'Kopiko',
    rating_average: 4.6, rating_count: 1100, total_sold: 9200, barcode: '4801234567025',
  }),
  makeProduct('prod-026', 'store-001', 'cat-004-b', 'Nescafe Classic 200g', 250, {
    description: 'Premium instant coffee. Bold flavor for your daily brew.',
    unit_type: 'piece', brand: 'Nescafe',
    rating_average: 4.4, rating_count: 780, total_sold: 6100, barcode: '4801234567026',
  }),
  makeProduct('prod-027', 'store-003', 'cat-004-a', 'Coca-Cola 1.5L', 65, {
    description: 'Ice-cold Coca-Cola. Perfect pair with any Filipino meal.',
    unit_type: 'piece', brand: 'Coca-Cola',
    rating_average: 4.5, rating_count: 2100, total_sold: 15000, barcode: '4801234567027',
  }),
  makeProduct('prod-028', 'store-002', 'cat-004-a', 'Zesto Mango Juice 200ml (10-pack)', 95, {
    description: 'Classic Filipino mango juice box. Baon favorite ng mga bata.',
    unit_type: 'pack', brand: 'Zesto',
    rating_average: 4.4, rating_count: 560, total_sold: 4300,
  }),

  // ===== SNACKS & CANNED GOODS (cat-005) =====
  makeProduct('prod-029', 'store-003', 'cat-005-b', 'Lucky Me Pancit Canton Original', 14, {
    description: 'The OG instant pancit canton. Just add hot water for 3 minutes.',
    unit_type: 'piece', brand: 'Lucky Me', is_featured: true,
    rating_average: 4.7, rating_count: 3200, total_sold: 28000, barcode: '4801234567029',
  }),
  makeProduct('prod-030', 'store-003', 'cat-005-a', 'Skyflakes Crackers (10-pack)', 55, {
    description: 'Classic Filipino crackers. Great with coffee or as a snack anytime.',
    unit_type: 'pack', brand: 'M.Y. San',
    rating_average: 4.5, rating_count: 1800, total_sold: 14000, barcode: '4801234567030',
  }),
  makeProduct('prod-031', 'store-001', 'cat-005-c', 'Century Tuna Flakes in Oil 180g', 42, {
    description: 'Canned tuna flakes in vegetable oil. Quick ulam for busy days.',
    unit_type: 'piece', brand: 'Century',
    rating_average: 4.4, rating_count: 2500, total_sold: 20000, barcode: '4801234567031',
  }),
  makeProduct('prod-032', 'store-001', 'cat-005-c', 'Argentina Corned Beef 260g', 75, {
    description: 'Classic Filipino corned beef. Breakfast staple with sinangag and itlog.',
    unit_type: 'piece', brand: 'Argentina',
    rating_average: 4.6, rating_count: 1900, total_sold: 16000, barcode: '4801234567032',
  }),
  makeProduct('prod-033', 'store-003', 'cat-005-b', 'Lucky Me Instant Mami Chicken', 14, {
    description: 'Hot chicken noodle soup in minutes. Comfort food on rainy days.',
    unit_type: 'piece', brand: 'Lucky Me',
    rating_average: 4.5, rating_count: 2800, total_sold: 22000,
  }),
  makeProduct('prod-034', 'store-001', 'cat-005-c', 'Spam Classic 340g', 195, {
    description: 'Premium canned luncheon meat. Slice, fry, and pair with rice.',
    unit_type: 'piece', brand: 'Spam',
    rating_average: 4.7, rating_count: 920, total_sold: 7800, barcode: '4801234567034',
  }),
  makeProduct('prod-035', 'store-003', 'cat-005-a', 'Boy Bawang Garlic Flavor 100g', 28, {
    description: 'Crunchy corn snack with garlic flavor. Addicting pulutan.',
    unit_type: 'piece', brand: 'KSK Food Products',
    rating_average: 4.6, rating_count: 1400, total_sold: 11000, barcode: '4801234567035',
  }),
  makeProduct('prod-036', 'store-003', 'cat-005-a', 'Chippy Barbecue 110g', 22, {
    description: 'Corn chips with bold barbecue flavor. A Filipino party staple.',
    unit_type: 'piece', brand: 'Jack n Jill',
    rating_average: 4.5, rating_count: 1600, total_sold: 13000,
  }),
  makeProduct('prod-037', 'store-001', 'cat-005-c', 'Ligo Sardines in Tomato Sauce 155g', 22, {
    description: 'Budget-friendly canned sardines. Quick ulam with rice.',
    unit_type: 'piece', brand: 'Ligo',
    rating_average: 4.3, rating_count: 3100, total_sold: 25000, barcode: '4801234567037',
  }),

  // ===== BAKERY (cat-006) =====
  makeProduct('prod-038', 'store-007', 'cat-006', 'Pandesal (10 pcs)', 50, {
    description: 'Hot, freshly baked pandesal. The iconic Filipino bread roll, best with coffee.',
    unit_type: 'pack', is_perishable: true, shelf_life_days: 2, is_featured: true,
    rating_average: 4.8, rating_count: 2200, total_sold: 18000,
  }),
  makeProduct('prod-039', 'store-007', 'cat-006', 'Ensaymada (4 pcs)', 120, {
    description: 'Soft and buttery ensaymada topped with butter, sugar, and cheese.',
    unit_type: 'pack', is_perishable: true, shelf_life_days: 3,
    rating_average: 4.7, rating_count: 890, total_sold: 6500,
  }),
  makeProduct('prod-040', 'store-007', 'cat-006', 'Ube Cheese Pandesal (8 pcs)', 95, {
    description: 'Trendy ube-flavored pandesal with cheese filling. Purple and delicious.',
    unit_type: 'pack', is_perishable: true, shelf_life_days: 2, is_featured: true,
    rating_average: 4.9, rating_count: 560, total_sold: 4200,
  }),
  makeProduct('prod-041', 'store-007', 'cat-006', 'Spanish Bread (8 pcs)', 65, {
    description: 'Classic Filipino Spanish bread with sweet bread crumb filling.',
    unit_type: 'pack', is_perishable: true, shelf_life_days: 3,
    rating_average: 4.6, rating_count: 450, total_sold: 3800,
  }),
  makeProduct('prod-042', 'store-007', 'cat-006', 'Monay Bread (6 pcs)', 45, {
    description: 'Dense, slightly sweet monay bread. Perfect for merienda.',
    unit_type: 'pack', is_perishable: true, shelf_life_days: 2,
    rating_average: 4.4, rating_count: 320, total_sold: 2600,
  }),

  // ===== HOUSEHOLD (cat-007) =====
  makeProduct('prod-043', 'store-001', 'cat-007', 'Ariel Powder Detergent 1kg', 165, {
    description: 'Superior stain removal powder detergent. Keeps clothes fresh and clean.',
    unit_type: 'piece', brand: 'Ariel',
    rating_average: 4.5, rating_count: 1200, total_sold: 9800, barcode: '4801234567043',
  }),
  makeProduct('prod-044', 'store-003', 'cat-007', 'Joy Dishwashing Liquid Lemon 500ml', 85, {
    description: 'Powerful grease-cutting dishwashing liquid with fresh lemon scent.',
    unit_type: 'piece', brand: 'Joy',
    rating_average: 4.4, rating_count: 980, total_sold: 7600, barcode: '4801234567044',
  }),
  makeProduct('prod-045', 'store-001', 'cat-007', 'Domex Toilet Cleaner 500ml', 95, {
    description: 'Kills 99.9% of germs. Keeps your bathroom clean and fresh.',
    unit_type: 'piece', brand: 'Domex',
    rating_average: 4.3, rating_count: 560, total_sold: 4200,
  }),

  // ===== HEALTH & WELLNESS (cat-008) =====
  makeProduct('prod-046', 'store-008', 'cat-008', 'Centrum Multivitamins (60 tablets)', 850, {
    description: 'Complete multivitamin from A to Zinc. Daily nutritional support.',
    unit_type: 'piece', brand: 'Centrum',
    rating_average: 4.6, rating_count: 340, total_sold: 2100, barcode: '4801234567046',
  }),
  makeProduct('prod-047', 'store-008', 'cat-008', 'Enervon C Multivitamins (30 tablets)', 285, {
    description: 'Vitamins B Complex + C. Boost your energy and immunity.',
    unit_type: 'piece', brand: 'Enervon',
    rating_average: 4.5, rating_count: 560, total_sold: 4500, barcode: '4801234567047',
  }),
  makeProduct('prod-048', 'store-008', 'cat-008', 'Lagundi 600mg (20 capsules)', 120, {
    description: 'Herbal medicine for cough and cold. DOH-approved herbal remedy.',
    unit_type: 'piece', brand: 'Unilab',
    rating_average: 4.4, rating_count: 280, total_sold: 1900,
  }),

  // ===== PREPARED FOODS from Kusina ni Nena (store-005) =====
  makeProduct('prod-049', 'store-005', 'cat-002-a', 'Adobong Baboy (Pork Adobo) 500g', 180, {
    description: 'Classic Filipino pork adobo braised in soy sauce, vinegar, garlic, and bay leaves.',
    unit_type: 'piece', is_perishable: true, shelf_life_days: 3, is_featured: true,
    rating_average: 4.9, rating_count: 780, total_sold: 6200,
  }),
  makeProduct('prod-050', 'store-005', 'cat-002-c', 'Sinigang na Baboy (Pork Sinigang) 1L', 220, {
    description: 'Sour tamarind pork soup with vegetables. The ultimate Filipino comfort food.',
    unit_type: 'piece', is_perishable: true, shelf_life_days: 2,
    rating_average: 4.8, rating_count: 650, total_sold: 5100,
  }),
  makeProduct('prod-051', 'store-005', 'cat-002-b', 'Chicken Tinola 1L', 195, {
    description: 'Ginger chicken soup with green papaya and malunggay. Light and healthy.',
    unit_type: 'piece', is_perishable: true, shelf_life_days: 2,
    rating_average: 4.7, rating_count: 420, total_sold: 3400,
  }),
  makeProduct('prod-052', 'store-005', 'cat-002-a', 'Kare-Kare (Oxtail Stew) 500g', 320, {
    description: 'Rich oxtail peanut stew with vegetables. Served with bagoong. Special occasion favorite.',
    unit_type: 'piece', is_perishable: true, shelf_life_days: 2,
    rating_average: 4.9, rating_count: 380, total_sold: 2800,
  }),
  makeProduct('prod-053', 'store-005', 'cat-002-b', 'Lechon Kawali (Crispy Pork) 300g', 250, {
    description: 'Deep-fried crispy pork belly. Crunchy outside, tender inside. Best with Mang Tomas.',
    unit_type: 'piece', is_perishable: true, shelf_life_days: 1,
    rating_average: 4.8, rating_count: 540, total_sold: 4100,
  }),

  // ===== EXTRA PRODUCTS for variety =====
  makeProduct('prod-054', 'store-001', 'cat-005-c', 'Datu Puti Soy Sauce 1L', 55, {
    description: 'The classic Filipino soy sauce. Essential in every Filipino kitchen.',
    unit_type: 'piece', brand: 'Datu Puti',
    rating_average: 4.6, rating_count: 2800, total_sold: 22000, barcode: '4801234567054',
  }),
  makeProduct('prod-055', 'store-001', 'cat-005-c', 'Datu Puti Vinegar 1L', 40, {
    description: 'Natural cane vinegar. For sawsawan, adobo, and paksiw.',
    unit_type: 'piece', brand: 'Datu Puti',
    rating_average: 4.5, rating_count: 2600, total_sold: 20000, barcode: '4801234567055',
  }),
  makeProduct('prod-056', 'store-001', 'cat-004-c', 'Red Horse Beer (6-pack)', 290, {
    description: 'Extra strong Filipino beer. Six 500ml bottles for the session.',
    unit_type: 'pack', brand: 'San Miguel',
    rating_average: 4.6, rating_count: 1100, total_sold: 8800, barcode: '4801234567056',
  }),
  makeProduct('prod-057', 'store-002', 'cat-001-a', 'Organic Lettuce (Head)', 85, {
    description: 'Locally grown organic lettuce from Benguet. Perfect for salads.',
    unit_type: 'piece', is_perishable: true, shelf_life_days: 5, dietary_tags: ['organic'],
    rating_average: 4.4, rating_count: 190, total_sold: 1200,
  }),
  makeProduct('prod-058', 'store-002', 'cat-001-b', 'Ampalaya (Bitter Gourd)', 75, {
    description: 'Fresh ampalaya. Great for ginisang ampalaya and health-conscious dishes.',
    unit_type: 'kg', is_perishable: true, shelf_life_days: 7,
    rating_average: 4.2, rating_count: 140, total_sold: 900,
  }),
];

// Quick lookup by store
export const productsByStore = (storeId: string) =>
  products.filter((p) => p.store_id === storeId);

// Quick lookup by category
export const productsByCategory = (categoryId: string) =>
  products.filter((p) => p.category_id === categoryId);
