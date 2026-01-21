/**
 * Seed script for homepage data
 *
 * Creates mock sellers and listings for developing the homepage:
 * - getFeatured (sorted by viewCount)
 * - getLatest (sorted by createdAt)
 * - getTopSellers (sorted by sellerRatingAverage)
 *
 * Usage: pnpm --filter @acme/db db:seed
 */

import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

// Seed data IDs prefix for easy identification and cleanup
const SEED_PREFIX = "seed-";

// ============================================================================
// CANADIAN CITIES DATA
// ============================================================================

interface CityData {
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  postalCodePrefix: string;
}

const canadianCities: CityData[] = [
  // Ontario
  { name: "Toronto", province: "ON", latitude: 43.6532, longitude: -79.3832, postalCodePrefix: "M5H" },
  { name: "Ottawa", province: "ON", latitude: 45.4215, longitude: -75.6972, postalCodePrefix: "K1P" },
  { name: "Mississauga", province: "ON", latitude: 43.5890, longitude: -79.6441, postalCodePrefix: "L5B" },
  { name: "Brampton", province: "ON", latitude: 43.7315, longitude: -79.7624, postalCodePrefix: "L6Y" },
  { name: "Hamilton", province: "ON", latitude: 43.2557, longitude: -79.8711, postalCodePrefix: "L8P" },
  { name: "London", province: "ON", latitude: 42.9849, longitude: -81.2453, postalCodePrefix: "N6A" },
  { name: "Markham", province: "ON", latitude: 43.8561, longitude: -79.3370, postalCodePrefix: "L3R" },
  { name: "Vaughan", province: "ON", latitude: 43.8563, longitude: -79.5085, postalCodePrefix: "L4L" },
  { name: "Kitchener", province: "ON", latitude: 43.4516, longitude: -80.4925, postalCodePrefix: "N2G" },
  { name: "Windsor", province: "ON", latitude: 42.3149, longitude: -83.0364, postalCodePrefix: "N9A" },
  // Quebec
  { name: "Montreal", province: "QC", latitude: 45.5017, longitude: -73.5673, postalCodePrefix: "H2Y" },
  { name: "Quebec City", province: "QC", latitude: 46.8139, longitude: -71.2080, postalCodePrefix: "G1R" },
  { name: "Laval", province: "QC", latitude: 45.6066, longitude: -73.7124, postalCodePrefix: "H7V" },
  { name: "Gatineau", province: "QC", latitude: 45.4765, longitude: -75.7013, postalCodePrefix: "J8X" },
  { name: "Longueuil", province: "QC", latitude: 45.5312, longitude: -73.5180, postalCodePrefix: "J4H" },
  { name: "Sherbrooke", province: "QC", latitude: 45.4042, longitude: -71.8929, postalCodePrefix: "J1H" },
  // British Columbia
  { name: "Vancouver", province: "BC", latitude: 49.2827, longitude: -123.1207, postalCodePrefix: "V6B" },
  { name: "Surrey", province: "BC", latitude: 49.1913, longitude: -122.8490, postalCodePrefix: "V3T" },
  { name: "Burnaby", province: "BC", latitude: 49.2488, longitude: -122.9805, postalCodePrefix: "V5C" },
  { name: "Richmond", province: "BC", latitude: 49.1666, longitude: -123.1336, postalCodePrefix: "V6X" },
  { name: "Victoria", province: "BC", latitude: 48.4284, longitude: -123.3656, postalCodePrefix: "V8W" },
  { name: "Kelowna", province: "BC", latitude: 49.8880, longitude: -119.4960, postalCodePrefix: "V1Y" },
  // Alberta
  { name: "Calgary", province: "AB", latitude: 51.0447, longitude: -114.0719, postalCodePrefix: "T2P" },
  { name: "Edmonton", province: "AB", latitude: 53.5461, longitude: -113.4938, postalCodePrefix: "T5J" },
  { name: "Red Deer", province: "AB", latitude: 52.2681, longitude: -113.8112, postalCodePrefix: "T4N" },
  { name: "Lethbridge", province: "AB", latitude: 49.6956, longitude: -112.8451, postalCodePrefix: "T1J" },
  // Manitoba
  { name: "Winnipeg", province: "MB", latitude: 49.8951, longitude: -97.1384, postalCodePrefix: "R3C" },
  { name: "Brandon", province: "MB", latitude: 49.8485, longitude: -99.9500, postalCodePrefix: "R7A" },
  // Saskatchewan
  { name: "Saskatoon", province: "SK", latitude: 52.1579, longitude: -106.6702, postalCodePrefix: "S7K" },
  { name: "Regina", province: "SK", latitude: 50.4452, longitude: -104.6189, postalCodePrefix: "S4P" },
  // Nova Scotia
  { name: "Halifax", province: "NS", latitude: 44.6488, longitude: -63.5752, postalCodePrefix: "B3H" },
  { name: "Dartmouth", province: "NS", latitude: 44.6714, longitude: -63.5772, postalCodePrefix: "B2Y" },
  // New Brunswick
  { name: "Saint John", province: "NB", latitude: 45.2733, longitude: -66.0633, postalCodePrefix: "E2L" },
  { name: "Moncton", province: "NB", latitude: 46.0878, longitude: -64.7782, postalCodePrefix: "E1C" },
  { name: "Fredericton", province: "NB", latitude: 45.9636, longitude: -66.6431, postalCodePrefix: "E3B" },
  // Newfoundland
  { name: "St. John's", province: "NL", latitude: 47.5615, longitude: -52.7126, postalCodePrefix: "A1C" },
  // PEI
  { name: "Charlottetown", province: "PE", latitude: 46.2382, longitude: -63.1311, postalCodePrefix: "C1A" },
];

// ============================================================================
// BUSINESS NAME GENERATORS
// ============================================================================

const businessPrefixes = [
  "Fresh", "Prime", "Value", "Golden", "Metro", "Express", "Quality", "Budget",
  "Premium", "Family", "Local", "Urban", "Green", "Smart", "Best", "Super",
  "Royal", "Elite", "Pro", "Easy", "Quick", "Daily", "True", "Fair", "Great",
  "Good", "Happy", "Lucky", "Sunny", "Bright", "Clear", "Clean", "Pure", "Real",
];

const businessSuffixes = [
  "Wholesale", "Deals", "Market", "Store", "Outlet", "Trading", "Supply", "Goods",
  "Bulk", "Warehouse", "Depot", "Hub", "Center", "Shop", "Plus", "Direct",
  "Mart", "Exchange", "Distributors", "Liquidators", "Bargains", "Savings",
];

// ============================================================================
// LISTING DATA GENERATORS
// ============================================================================

interface ListingTemplate {
  titleTemplate: string;
  descriptionTemplate: string;
  minPrice: number;
  maxPrice: number;
  minQuantity: number;
  maxQuantity: number;
  photoUrls: string[];
}

const categoryTemplates: Record<string, ListingTemplate[]> = {
  GROCERIES: [
    {
      titleTemplate: "Organic {item} - Bulk Box ({size})",
      descriptionTemplate: "Farm-fresh organic {item}, perfect for restaurants and large families. Grown locally without pesticides. Premium quality produce that's bursting with flavor. Available for immediate pickup.",
      minPrice: 1.5, maxPrice: 5.0, minQuantity: 100, maxQuantity: 500,
      photoUrls: ["https://images.unsplash.com/photo-1542838132-92c53300491e?w=800", "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800"],
    },
    {
      titleTemplate: "Premium {item} - {size} Bags",
      descriptionTemplate: "High-quality {item} imported from trusted sources. Perfect for restaurants, caterers, or bulk home cooking. Stock up and save on this pantry essential.",
      minPrice: 10, maxPrice: 30, minQuantity: 50, maxQuantity: 200,
      photoUrls: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800", "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800"],
    },
    {
      titleTemplate: "Canned {item} - Case of {size}",
      descriptionTemplate: "Premium canned {item} with long shelf life. All cans within 18 months of expiry. Perfect for food service, emergency preparedness, or stocking your pantry.",
      minPrice: 0.75, maxPrice: 2.5, minQuantity: 200, maxQuantity: 1000,
      photoUrls: ["https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800"],
    },
    {
      titleTemplate: "{item} Oil - Case of 12 Bottles",
      descriptionTemplate: "Premium cold-pressed {item} oil from quality sources. First harvest, perfect for cooking or health-conscious consumers. Each bottle is 750ml.",
      minPrice: 60, maxPrice: 120, minQuantity: 20, maxQuantity: 100,
      photoUrls: ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800"],
    },
  ],
  CLOTHING: [
    {
      titleTemplate: "Cotton {item} Pack - {size} Assorted",
      descriptionTemplate: "High-quality 100% cotton {item} in assorted sizes and colors. Perfect for printing, uniforms, or resale. Pre-shrunk and double-stitched for durability.",
      minPrice: 3, maxPrice: 8, minQuantity: 50, maxQuantity: 200,
      photoUrls: ["https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800", "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800"],
    },
    {
      titleTemplate: "Athletic {item} Bundle - {size} Pairs",
      descriptionTemplate: "Premium athletic {item} in bulk. Cushioned, moisture-wicking material. Mix of styles and sizes. Ideal for gyms, sports teams, or retailers.",
      minPrice: 1.5, maxPrice: 4, minQuantity: 100, maxQuantity: 500,
      photoUrls: ["https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800"],
    },
    {
      titleTemplate: "Kids {item} Lot - Mixed Ages",
      descriptionTemplate: "Assorted children's {item} including various styles and sizes. Name brands, gently used condition. Perfect for consignment shops or large families.",
      minPrice: 2, maxPrice: 5, minQuantity: 75, maxQuantity: 300,
      photoUrls: ["https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800"],
    },
    {
      titleTemplate: "Winter {item} Collection - {size} Pieces",
      descriptionTemplate: "Warm winter {item} perfect for cold Canadian weather. Mix of styles and sizes. Great for retailers or donation drives.",
      minPrice: 8, maxPrice: 25, minQuantity: 30, maxQuantity: 150,
      photoUrls: ["https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800"],
    },
  ],
  ELECTRONICS: [
    {
      titleTemplate: "Phone {item} - Box of {size}",
      descriptionTemplate: "Assorted phone {item} for popular models. Mix of styles and designs. Includes retail packaging. Perfect for kiosk owners or online sellers.",
      minPrice: 2, maxPrice: 6, minQuantity: 100, maxQuantity: 500,
      photoUrls: ["https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=800"],
    },
    {
      titleTemplate: "USB-C {item} - {size} Pack",
      descriptionTemplate: "High-quality braided USB-C {item}. Compatible with all USB-C devices. Durable construction for long-lasting use. Bulk pricing available.",
      minPrice: 4, maxPrice: 10, minQuantity: 50, maxQuantity: 200,
      photoUrls: ["https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=800"],
    },
    {
      titleTemplate: "Bluetooth {item} - Lot of {size}",
      descriptionTemplate: "Portable Bluetooth {item} with excellent battery life. Water resistant, perfect for outdoor use. Assorted colors. Great for retail or promotions.",
      minPrice: 10, maxPrice: 30, minQuantity: 25, maxQuantity: 100,
      photoUrls: ["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800", "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"],
    },
    {
      titleTemplate: "LED {item} - Bulk Pack of {size}",
      descriptionTemplate: "Energy-efficient LED {item} for home or commercial use. Long lifespan, various wattages available. Save on electricity bills.",
      minPrice: 1, maxPrice: 5, minQuantity: 100, maxQuantity: 500,
      photoUrls: ["https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800"],
    },
  ],
  HOME_GOODS: [
    {
      titleTemplate: "Kitchen {item} Set - {size} Sets",
      descriptionTemplate: "Professional-grade kitchen {item}. Durable construction, dishwasher safe. Perfect for restaurants, caterers, or home chefs who demand quality.",
      minPrice: 15, maxPrice: 40, minQuantity: 20, maxQuantity: 100,
      photoUrls: ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800"],
    },
    {
      titleTemplate: "Bath {item} Sets - Premium Cotton",
      descriptionTemplate: "Luxury 100% cotton {item} sets. High GSM for maximum absorbency and comfort. Hotel quality at wholesale prices. Multiple colors available.",
      minPrice: 20, maxPrice: 50, minQuantity: 30, maxQuantity: 100,
      photoUrls: ["https://images.unsplash.com/photo-1631049035182-249067d7618e?w=800"],
    },
    {
      titleTemplate: "Storage {item} - {size} Piece Lot",
      descriptionTemplate: "Food-safe storage {item} with secure lids. Various sizes for all your organization needs. BPA-free, microwave and dishwasher safe.",
      minPrice: 1, maxPrice: 3, minQuantity: 100, maxQuantity: 500,
      photoUrls: ["https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800"],
    },
    {
      titleTemplate: "Bedding {item} - Queen/King Sets",
      descriptionTemplate: "Comfortable bedding {item} in popular sizes. Soft, breathable fabric. Perfect for hotels, Airbnb hosts, or retailers.",
      minPrice: 25, maxPrice: 60, minQuantity: 20, maxQuantity: 80,
      photoUrls: ["https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800"],
    },
  ],
  TOYS: [
    {
      titleTemplate: "Board {item} Collection - {size} Titles",
      descriptionTemplate: "Assorted popular board {item} for all ages. Complete with pieces and instructions. Great for game cafes, daycares, or family entertainment.",
      minPrice: 10, maxPrice: 25, minQuantity: 25, maxQuantity: 100,
      photoUrls: ["https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800"],
    },
    {
      titleTemplate: "Art {item} Kit - Classroom Pack",
      descriptionTemplate: "Complete art {item} kits for creative activities. Includes crayons, pencils, markers, and more. Perfect for schools, camps, or after-school programs.",
      minPrice: 6, maxPrice: 15, minQuantity: 30, maxQuantity: 150,
      photoUrls: ["https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800"],
    },
    {
      titleTemplate: "Building {item} Set - {size} Pieces",
      descriptionTemplate: "Educational building {item} that inspire creativity. Compatible with major brands. Hours of constructive play for children.",
      minPrice: 15, maxPrice: 40, minQuantity: 20, maxQuantity: 80,
      photoUrls: ["https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800"],
    },
  ],
  SPORTS: [
    {
      titleTemplate: "Stainless Steel {item} - {size} Pack",
      descriptionTemplate: "Double-wall insulated stainless steel {item}. Keeps drinks cold or hot for hours. Leak-proof design. Perfect for corporate gifts or retail.",
      minPrice: 6, maxPrice: 15, minQuantity: 50, maxQuantity: 200,
      photoUrls: ["https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800"],
    },
    {
      titleTemplate: "Resistance {item} Set - {size} Kits",
      descriptionTemplate: "Complete resistance {item} sets with carrying bag. Multiple resistance levels included. Perfect for gyms, therapy clinics, or home fitness.",
      minPrice: 8, maxPrice: 20, minQuantity: 30, maxQuantity: 100,
      photoUrls: ["https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800"],
    },
    {
      titleTemplate: "Yoga {item} - Premium Quality",
      descriptionTemplate: "High-density yoga {item} for comfort and support. Non-slip surface, easy to clean. Ideal for studios, gyms, or home practice.",
      minPrice: 12, maxPrice: 30, minQuantity: 25, maxQuantity: 100,
      photoUrls: ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"],
    },
  ],
  BOOKS: [
    {
      titleTemplate: "Bestseller {item} Collection - {size} Books",
      descriptionTemplate: "Assorted bestselling {item} from recent years. Mix of genres including fiction, thriller, and romance. Good to excellent condition.",
      minPrice: 2, maxPrice: 6, minQuantity: 50, maxQuantity: 300,
      photoUrls: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800"],
    },
    {
      titleTemplate: "College {item} - Business Studies",
      descriptionTemplate: "Used college {item} for business and economics courses. Recent editions with minimal highlighting. Save significantly off retail prices.",
      minPrice: 15, maxPrice: 35, minQuantity: 20, maxQuantity: 80,
      photoUrls: ["https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800"],
    },
    {
      titleTemplate: "Children's {item} Bundle - {size} Books",
      descriptionTemplate: "Assorted children's {item} for various reading levels. Educational and entertaining content. Perfect for schools, libraries, or daycares.",
      minPrice: 1, maxPrice: 4, minQuantity: 100, maxQuantity: 500,
      photoUrls: ["https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800"],
    },
  ],
  OTHER: [
    {
      titleTemplate: "Mixed {item} - Moving Sale Lot",
      descriptionTemplate: "Assorted {item} from estate clearance. Includes various household goods and miscellaneous items. All items clean and functional.",
      minPrice: 1, maxPrice: 5, minQuantity: 100, maxQuantity: 500,
      photoUrls: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
    },
    {
      titleTemplate: "Office {item} Liquidation - {size} Items",
      descriptionTemplate: "Office {item} from business closure. Mix of supplies, furniture accessories, and equipment. Great for startups or home offices.",
      minPrice: 2, maxPrice: 10, minQuantity: 50, maxQuantity: 200,
      photoUrls: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"],
    },
  ],
};

const groceryItems = ["Tomatoes", "Potatoes", "Apples", "Oranges", "Carrots", "Onions", "Peppers", "Lettuce"];
const groceryBulkItems = ["Rice", "Flour", "Sugar", "Pasta", "Beans", "Lentils", "Oats", "Quinoa"];
const cannedItems = ["Tomatoes", "Corn", "Beans", "Peas", "Soup", "Tuna", "Fruit", "Vegetables"];
const oilTypes = ["Olive", "Coconut", "Avocado", "Sunflower", "Canola", "Vegetable"];
const clothingItems = ["T-Shirts", "Polo Shirts", "Hoodies", "Sweaters", "Jeans", "Shorts"];
const athleticItems = ["Socks", "Shorts", "Headbands", "Wristbands", "Leggings"];
const kidsClothingItems = ["Clothing", "Outfits", "Pajamas", "Dresses", "Shirts"];
const winterItems = ["Jackets", "Coats", "Gloves", "Scarves", "Hats", "Boots"];
const phoneAccessories = ["Cases", "Screen Protectors", "Chargers", "Cables", "Holders"];
const usbItems = ["Cables", "Adapters", "Hubs", "Chargers"];
const bluetoothItems = ["Speakers", "Earbuds", "Headphones", "Receivers"];
const ledItems = ["Bulbs", "Strip Lights", "Desk Lamps", "Flashlights"];
const kitchenItems = ["Utensils", "Cookware", "Bakeware", "Knives", "Gadgets"];
const bathItems = ["Towels", "Mats", "Accessories", "Organizers"];
const storageItems = ["Containers", "Bins", "Baskets", "Boxes"];
const beddingItems = ["Sheets", "Comforters", "Pillows", "Blankets"];
const boardItems = ["Games", "Puzzles"];
const artItems = ["Supplies", "Materials", "Kits"];
const buildingItems = ["Blocks", "Bricks", "Sets"];
const sportsBottles = ["Water Bottles", "Shaker Bottles", "Tumblers"];
const resistanceItems = ["Bands", "Tubes", "Loops"];
const yogaItems = ["Mats", "Blocks", "Straps", "Wheels"];
const novelItems = ["Novels", "Fiction", "Paperbacks"];
const textbookItems = ["Textbooks", "Study Guides", "Workbooks"];
const childrenBooks = ["Books", "Stories", "Picture Books"];
const miscItems = ["Household Items", "Goods", "Supplies", "Products"];
const officeItems = ["Supplies", "Equipment", "Furniture", "Accessories"];

const categoryItemMap: Record<string, string[][]> = {
  GROCERIES: [groceryItems, groceryBulkItems, cannedItems, oilTypes],
  CLOTHING: [clothingItems, athleticItems, kidsClothingItems, winterItems],
  ELECTRONICS: [phoneAccessories, usbItems, bluetoothItems, ledItems],
  HOME_GOODS: [kitchenItems, bathItems, storageItems, beddingItems],
  TOYS: [boardItems, artItems, buildingItems],
  SPORTS: [sportsBottles, resistanceItems, yogaItems],
  BOOKS: [novelItems, textbookItems, childrenBooks],
  OTHER: [miscItems, officeItems],
};

const sizes = ["25", "50", "100", "150", "200", "10kg", "20kg", "25 lbs", "50 lbs", "12", "24", "36", "48"];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomNumber(min, max + 1));
}

function generatePostalCode(prefix: string): string {
  const letters = "ABCDEFGHJKLMNPRSTVWXYZ";
  const digits = "0123456789";
  return `${prefix}${randomElement(digits.split(""))}${randomElement(letters.split(""))}${randomElement(digits.split(""))}`;
}

function generateSellerName(city: string, index: number): string {
  const prefix = randomElement(businessPrefixes);
  const suffix = randomElement(businessSuffixes);
  return `${prefix} ${city} ${suffix}`;
}

function addRandomOffset(value: number, maxOffset: number): number {
  return value + (Math.random() - 0.5) * 2 * maxOffset;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedHomepageData() {
  console.log("🌱 Seeding homepage data (100 sellers, 1000 listings)...\n");

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    // Step 1: Clean up existing seed data
    console.log("🧹 Cleaning up existing seed data...");

    await sql`DELETE FROM listing WHERE id LIKE ${SEED_PREFIX + "%"}`;
    console.log("  ✓ Removed seed listings");

    await sql`DELETE FROM "user" WHERE id LIKE ${SEED_PREFIX + "%"}`;
    console.log("  ✓ Removed seed users");

    // Step 2: Generate and insert 100 sellers
    console.log("\n👤 Creating 100 seed sellers...");

    const verificationBadges = ["NONE", "VERIFIED", "TRUSTED", "PREMIUM"] as const;
    const sellers: Array<{ id: string; cityIndex: number }> = [];

    for (let i = 1; i <= 100; i++) {
      const cityIndex = (i - 1) % canadianCities.length;
      const city = canadianCities[cityIndex]!;
      const sellerId = `${SEED_PREFIX}seller-${i}`;

      // Weight badges: 30% NONE, 40% VERIFIED, 20% TRUSTED, 10% PREMIUM
      const badgeRoll = Math.random();
      const badge = badgeRoll < 0.3 ? "NONE" : badgeRoll < 0.7 ? "VERIFIED" : badgeRoll < 0.9 ? "TRUSTED" : "PREMIUM";

      const ratingAvg = randomNumber(3.5, 5.0);
      const ratingCount = randomInt(5, 200);

      await sql`
        INSERT INTO "user" (
          id, name, email, phone, phone_verified, email_verified,
          verification_badge, seller_rating_average, seller_rating_count,
          account_status, user_type, created_at, updated_at
        ) VALUES (
          ${sellerId},
          ${generateSellerName(city.name, i)},
          ${`seller${i}@example.com`},
          ${`+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`},
          true, true,
          ${badge},
          ${Math.round(ratingAvg * 10) / 10},
          ${ratingCount},
          'ACTIVE', 'SELLER_INDIVIDUAL',
          NOW(), NOW()
        )
      `;

      sellers.push({ id: sellerId, cityIndex });

      if (i % 20 === 0) {
        console.log(`  ✓ Created ${i} sellers...`);
      }
    }
    console.log("  ✓ Created 100 sellers");

    // Step 3: Generate and insert 1000 listings
    console.log("\n📦 Creating 1000 seed listings...");

    const categories = Object.keys(categoryTemplates);

    // Distribution: more GROCERIES and CLOTHING, fewer OTHER
    const categoryWeights: Record<string, number> = {
      GROCERIES: 200,
      CLOTHING: 180,
      ELECTRONICS: 150,
      HOME_GOODS: 150,
      TOYS: 100,
      SPORTS: 100,
      BOOKS: 80,
      OTHER: 40,
    };

    let listingIndex = 0;

    for (const [category, count] of Object.entries(categoryWeights)) {
      const templates = categoryTemplates[category]!;
      const itemArrays = categoryItemMap[category]!;

      for (let i = 0; i < count; i++) {
        listingIndex++;
        const listingId = `${SEED_PREFIX}listing-${listingIndex}`;

        // Pick a random seller
        const seller = randomElement(sellers);
        const city = canadianCities[seller.cityIndex]!;

        // Pick a random template
        const templateIndex = i % templates.length;
        const template = templates[templateIndex]!;
        const items = itemArrays[templateIndex % itemArrays.length]!;
        const item = randomElement(items);
        const size = randomElement(sizes);

        // Generate title and description
        const title = template.titleTemplate
          .replace("{item}", item)
          .replace("{size}", size);
        const description = template.descriptionTemplate
          .replace(/{item}/g, item.toLowerCase());

        // Random price and quantity
        const price = Math.round(randomNumber(template.minPrice, template.maxPrice) * 100) / 100;
        const quantity = randomInt(template.minQuantity, template.maxQuantity);

        // Random view count (featured sorting) - some listings very popular
        const viewCount = Math.random() < 0.1
          ? randomInt(3000, 10000)  // 10% are very popular
          : randomInt(10, 3000);

        // Random created date (latest sorting) - spread over last 30 days
        const daysAgo = randomInt(0, 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);

        // Add slight random offset to coordinates for variety
        const latitude = addRandomOffset(city.latitude, 0.05);
        const longitude = addRandomOffset(city.longitude, 0.05);

        const photo = randomElement(template.photoUrls);
        const postalCode = generatePostalCode(city.postalCodePrefix);

        await sql`
          INSERT INTO listing (
            id, seller_id, title, description, category, photos,
            price_per_piece, quantity_total, quantity_available,
            latitude, longitude, pickup_address, postal_code,
            status, view_count, published_at, created_at, updated_at
          ) VALUES (
            ${listingId},
            ${seller.id},
            ${title.substring(0, 200)},
            ${description},
            ${category},
            ${[photo]},
            ${price},
            ${quantity},
            ${Math.floor(quantity * randomNumber(0.5, 1.0))},
            ${latitude},
            ${longitude},
            ${`${randomInt(100, 999)} ${randomElement(["Main", "Market", "Commerce", "King", "Queen", "Dundas", "Yonge", "Bloor", "Maple", "Oak"])} St, ${city.name}, ${city.province}`},
            ${postalCode},
            'PUBLISHED',
            ${viewCount},
            ${createdAt},
            ${createdAt},
            ${createdAt}
          )
        `;

        if (listingIndex % 100 === 0) {
          console.log(`  ✓ Created ${listingIndex} listings...`);
        }
      }
    }

    console.log("  ✓ Created 1000 listings");

    // Summary
    console.log("\n✅ Seed data created successfully!");
    console.log("   • 100 sellers across Canada");
    console.log("   • 1000 listings distributed by category:");
    for (const [cat, count] of Object.entries(categoryWeights)) {
      console.log(`     - ${cat}: ${count}`);
    }

    console.log("\n📊 Verification:");
    console.log("   Run: pnpm --filter @acme/db studio");
    console.log("   Start dev: pnpm --filter @acme/nextjs dev");
    console.log("   Check homepage at http://localhost:3000");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    await sql.end();
    process.exit(1);
  }
}

seedHomepageData();
