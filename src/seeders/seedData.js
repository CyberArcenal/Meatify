// src/seeders/seedData.js
//@ts-check
const { AppDataSource } = require("../main/db/data-source");
const { logger } = require("../utils/logger");

// Import entities
const Category = require("../entities/Category");
const Supplier = require("../entities/Supplier");
const Meat = require("../entities/Meat");
const Batch = require("../entities/Batch");
const Customer = require("../entities/Customer");
const { SystemSetting, SettingType } = require("../entities/systemSettings");

// ----------------------------------------------------------------------
// 📦 SEED DATA
// ----------------------------------------------------------------------

// Categories
const categoriesData = [
  { name: "Beef", description: "Premium beef cuts" },
  { name: "Pork", description: "Fresh pork products" },
  { name: "Chicken", description: "Free-range chicken" },
  { name: "Lamb", description: "Imported lamb cuts" },
  { name: "Seafood", description: "Fresh seafood selection" },
  { name: "Processed Meats", description: "Sausages, bacon, ham" },
];

// Suppliers
const suppliersData = [
  {
    name: "Manila Meat Supply",
    contactInfo: "Juan Dela Cruz",
    email: "juan@manilameat.com",
    phone: "+63 9123456789",
    address: "123 Meat St., Pasay City",
  },
  {
    name: "Fresh Farms Inc.",
    contactInfo: "Maria Santos",
    email: "maria@freshfarms.com",
    phone: "+63 9234567890",
    address: "456 Farm Ave., Bulacan",
  },
  {
    name: "Premium Meats PH",
    contactInfo: "Pedro Reyes",
    email: "pedro@premiummeats.ph",
    phone: "+63 9345678901",
    address: "789 Quality Rd., Makati",
  },
  {
    name: "Local Poultry Supply",
    contactInfo: "Ana Cruz",
    email: "ana@localpoultry.com",
    phone: "+63 9456789012",
    address: "321 Chicken Lane, Laguna",
  },
];

// Meats
const meatsData = [
  // Beef
  {
    name: "Beef Tenderloin",
    sku: "MEAT-BEEF-001",
    barcode: "8901234567890",
    description: "Premium beef tenderloin, perfectly marbled",
    pricePerKg: 850.00,
    categoryName: "Beef",
    supplierName: "Manila Meat Supply",
  },
  {
    name: "Beef Ribeye",
    sku: "MEAT-BEEF-002",
    barcode: "8901234567891",
    description: "Juicy ribeye steak with excellent marbling",
    pricePerKg: 950.00,
    categoryName: "Beef",
    supplierName: "Manila Meat Supply",
  },
  {
    name: "Beef Ground",
    sku: "MEAT-BEEF-003",
    barcode: "8901234567892",
    description: "Fresh ground beef, 80/20 lean to fat ratio",
    pricePerKg: 450.00,
    categoryName: "Beef",
    supplierName: "Premium Meats PH",
  },
  {
    name: "Beef Short Ribs",
    sku: "MEAT-BEEF-004",
    barcode: "8901234567893",
    description: "Bone-in short ribs, perfect for braising",
    pricePerKg: 750.00,
    categoryName: "Beef",
    supplierName: "Premium Meats PH",
  },
  // Pork
  {
    name: "Pork Belly",
    sku: "MEAT-PORK-001",
    barcode: "8901234567900",
    description: "Fresh pork belly with even fat layers",
    pricePerKg: 380.00,
    categoryName: "Pork",
    supplierName: "Fresh Farms Inc.",
  },
  {
    name: "Pork Tenderloin",
    sku: "MEAT-PORK-002",
    barcode: "8901234567901",
    description: "Lean pork tenderloin, very versatile",
    pricePerKg: 420.00,
    categoryName: "Pork",
    supplierName: "Fresh Farms Inc.",
  },
  {
    name: "Pork Chop",
    sku: "MEAT-PORK-003",
    barcode: "8901234567902",
    description: "Thick-cut pork chops with bone",
    pricePerKg: 350.00,
    categoryName: "Pork",
    supplierName: "Fresh Farms Inc.",
  },
  {
    name: "Pork Sausages",
    sku: "MEAT-PORK-004",
    barcode: "8901234567903",
    description: "Premium pork sausages with herbs",
    pricePerKg: 400.00,
    categoryName: "Processed Meats",
    supplierName: "Fresh Farms Inc.",
  },
  // Chicken
  {
    name: "Whole Chicken",
    sku: "MEAT-CHICK-001",
    barcode: "8901234567910",
    description: "Free-range whole chicken, 1.2-1.5kg",
    pricePerKg: 280.00,
    categoryName: "Chicken",
    supplierName: "Local Poultry Supply",
  },
  {
    name: "Chicken Breast",
    sku: "MEAT-CHICK-002",
    barcode: "8901234567911",
    description: "Boneless, skinless chicken breast",
    pricePerKg: 320.00,
    categoryName: "Chicken",
    supplierName: "Local Poultry Supply",
  },
  {
    name: "Chicken Thighs",
    sku: "MEAT-CHICK-003",
    barcode: "8901234567912",
    description: "Boneless chicken thighs, juicy and flavorful",
    pricePerKg: 290.00,
    categoryName: "Chicken",
    supplierName: "Local Poultry Supply",
  },
  // Lamb
  {
    name: "Lamb Chops",
    sku: "MEAT-LAMB-001",
    barcode: "8901234567920",
    description: "Premium lamb chops, tender and flavorful",
    pricePerKg: 1200.00,
    categoryName: "Lamb",
    supplierName: "Premium Meats PH",
  },
  {
    name: "Lamb Leg",
    sku: "MEAT-LAMB-002",
    barcode: "8901234567921",
    description: "Bone-in lamb leg, perfect for roasting",
    pricePerKg: 1100.00,
    categoryName: "Lamb",
    supplierName: "Premium Meats PH",
  },
];

// Batches
const batchesData = [
  // Beef Tenderloin (2 batches)
  {
    batchCode: "BATCH-BEEF-001",
    meatName: "Beef Tenderloin",
    initialQuantity: 50.0,
    remainingQuantity: 50.0,
    unitCost: 650.00,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    status: "active",
    note: "Initial stock",
    supplierName: "Manila Meat Supply",
  },
  {
    batchCode: "BATCH-BEEF-002",
    meatName: "Beef Tenderloin",
    initialQuantity: 30.0,
    remainingQuantity: 30.0,
    unitCost: 640.00,
    expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
    status: "active",
    note: "New batch - discounted price",
    supplierName: "Manila Meat Supply",
  },
  // Beef Ribeye
  {
    batchCode: "BATCH-BEEF-003",
    meatName: "Beef Ribeye",
    initialQuantity: 25.0,
    remainingQuantity: 25.0,
    unitCost: 750.00,
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    status: "active",
    note: "Premium grade",
    supplierName: "Manila Meat Supply",
  },
  // Beef Ground
  {
    batchCode: "BATCH-BEEF-004",
    meatName: "Beef Ground",
    initialQuantity: 40.0,
    remainingQuantity: 40.0,
    unitCost: 350.00,
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    status: "active",
    note: "Fresh ground beef",
    supplierName: "Premium Meats PH",
  },
  // Beef Short Ribs
  {
    batchCode: "BATCH-BEEF-005",
    meatName: "Beef Short Ribs",
    initialQuantity: 20.0,
    remainingQuantity: 20.0,
    unitCost: 600.00,
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days
    status: "active",
    note: "For braising",
    supplierName: "Premium Meats PH",
  },
  // Pork Belly (2 batches)
  {
    batchCode: "BATCH-PORK-001",
    meatName: "Pork Belly",
    initialQuantity: 35.0,
    remainingQuantity: 35.0,
    unitCost: 300.00,
    expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days
    status: "active",
    note: "Fresh pork belly",
    supplierName: "Fresh Farms Inc.",
  },
  {
    batchCode: "BATCH-PORK-002",
    meatName: "Pork Belly",
    initialQuantity: 25.0,
    remainingQuantity: 25.0,
    unitCost: 290.00,
    expiryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days
    status: "active",
    note: "Premium quality",
    supplierName: "Fresh Farms Inc.",
  },
  // Pork Tenderloin
  {
    batchCode: "BATCH-PORK-003",
    meatName: "Pork Tenderloin",
    initialQuantity: 20.0,
    remainingQuantity: 20.0,
    unitCost: 340.00,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    status: "active",
    note: "Lean pork tenderloin",
    supplierName: "Fresh Farms Inc.",
  },
  // Pork Chop
  {
    batchCode: "BATCH-PORK-004",
    meatName: "Pork Chop",
    initialQuantity: 30.0,
    remainingQuantity: 30.0,
    unitCost: 280.00,
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    status: "active",
    note: "Thick cut chops",
    supplierName: "Fresh Farms Inc.",
  },
  // Pork Sausages
  {
    batchCode: "BATCH-PORK-005",
    meatName: "Pork Sausages",
    initialQuantity: 15.0,
    remainingQuantity: 15.0,
    unitCost: 330.00,
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    status: "active",
    note: "With herbs",
    supplierName: "Fresh Farms Inc.",
  },
  // Whole Chicken
  {
    batchCode: "BATCH-CHICK-001",
    meatName: "Whole Chicken",
    initialQuantity: 60.0,
    remainingQuantity: 60.0,
    unitCost: 220.00,
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days
    status: "active",
    note: "Free-range",
    supplierName: "Local Poultry Supply",
  },
  // Chicken Breast
  {
    batchCode: "BATCH-CHICK-002",
    meatName: "Chicken Breast",
    initialQuantity: 40.0,
    remainingQuantity: 40.0,
    unitCost: 260.00,
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    status: "active",
    note: "Boneless skinless",
    supplierName: "Local Poultry Supply",
  },
  // Chicken Thighs
  {
    batchCode: "BATCH-CHICK-003",
    meatName: "Chicken Thighs",
    initialQuantity: 30.0,
    remainingQuantity: 30.0,
    unitCost: 240.00,
    expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days
    status: "active",
    note: "Boneless",
    supplierName: "Local Poultry Supply",
  },
  // Lamb Chops
  {
    batchCode: "BATCH-LAMB-001",
    meatName: "Lamb Chops",
    initialQuantity: 10.0,
    remainingQuantity: 10.0,
    unitCost: 950.00,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    status: "active",
    note: "Premium lamb",
    supplierName: "Premium Meats PH",
  },
  // Lamb Leg
  {
    batchCode: "BATCH-LAMB-002",
    meatName: "Lamb Leg",
    initialQuantity: 8.0,
    remainingQuantity: 8.0,
    unitCost: 900.00,
    expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
    status: "active",
    note: "Bone-in",
    supplierName: "Premium Meats PH",
  },
  // Expiring batch (for testing)
  {
    batchCode: "BATCH-EXPIRING-001",
    meatName: "Beef Ground",
    initialQuantity: 5.0,
    remainingQuantity: 5.0,
    unitCost: 350.00,
    expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
    status: "active",
    note: "EXPIRING SOON - For testing expiry notifications",
    supplierName: "Premium Meats PH",
  },
  // Expired batch (for testing)
  {
    batchCode: "BATCH-EXPIRED-001",
    meatName: "Beef Ground",
    initialQuantity: 3.0,
    remainingQuantity: 3.0,
    unitCost: 350.00,
    expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: "active",
    note: "EXPIRED - For testing expired detection",
    supplierName: "Premium Meats PH",
  },
];

// Customers
const customersData = [
  {
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+63 9123456789",
    address: "123 Main St., Makati",
    loyaltyPointsBalance: 250,
    lifetimePointsEarned: 250,
    status: "regular",
  },
  {
    name: "Maria Garcia",
    email: "maria.garcia@email.com",
    phone: "+63 9234567890",
    address: "456 Oak Ave., Quezon City",
    loyaltyPointsBalance: 1200,
    lifetimePointsEarned: 1200,
    status: "vip",
  },
  {
    name: "Carlos Santos",
    email: "carlos.santos@email.com",
    phone: "+63 9345678901",
    address: "789 Pine St., Pasig",
    loyaltyPointsBalance: 0,
    lifetimePointsEarned: 0,
    status: "regular",
  },
  {
    name: "Elena Reyes",
    email: "elena.reyes@email.com",
    phone: "+63 9456789012",
    address: "321 Elm Ave., Mandaluyong",
    loyaltyPointsBalance: 500,
    lifetimePointsEarned: 550,
    status: "regular",
  },
  {
    name: "Roberto Dela Cruz",
    email: "roberto.delacruz@email.com",
    phone: "+63 9567890123",
    address: "654 Birch St., Taguig",
    loyaltyPointsBalance: 5000,
    lifetimePointsEarned: 5200,
    status: "elite",
  },
  {
    name: "Luzviminda Tan",
    email: "luz.tan@email.com",
    phone: "+63 9678901234",
    address: "987 Cedar Ave., Paranaque",
    loyaltyPointsBalance: 750,
    lifetimePointsEarned: 800,
    status: "regular",
  },
];

// System Settings
const systemSettingsData = [
  {
    key: "company_name",
    value: "Meatify",
    setting_type: SettingType.GENERAL,
    description: "Company name displayed on receipts and reports",
    is_public: true,
  },
  {
    key: "company_location",
    value: "Manila, Philippines",
    setting_type: SettingType.GENERAL,
    description: "Company location displayed on receipts",
    is_public: true,
  },
  {
    key: "tax_rate",
    value: "12",
    setting_type: SettingType.SALES,
    description: "VAT tax rate percentage",
    is_public: false,
  },
  {
    key: "enable_discounts",
    value: "true",
    setting_type: SettingType.SALES,
    description: "Enable discounts on sales",
    is_public: false,
  },
  {
    key: "max_discount_percent",
    value: "20",
    setting_type: SettingType.SALES,
    description: "Maximum discount percentage allowed",
    is_public: false,
  },
  {
    key: "enable_loyalty_points",
    value: "true",
    setting_type: SettingType.SALES,
    description: "Enable loyalty points system",
    is_public: false,
  },
  {
    key: "loyalty_point_rate",
    value: "100",
    setting_type: SettingType.SALES,
    description: "Points earned per peso spent",
    is_public: false,
  },
  {
    key: "enable_receipt_printing",
    value: "true",
    setting_type: SettingType.CASHIER,
    description: "Enable automatic receipt printing",
    is_public: false,
  },
  {
    key: "allow_negative_stock",
    value: "false",
    setting_type: SettingType.INVENTORY,
    description: "Allow sales when stock is negative",
    is_public: false,
  },
  {
    key: "low_stock_threshold",
    value: "5",
    setting_type: SettingType.INVENTORY,
    description: "Threshold for low stock alerts",
    is_public: false,
  },
  {
    key: "enable_refunds",
    value: "true",
    setting_type: SettingType.SALES,
    description: "Enable refunds and returns",
    is_public: false,
  },
  {
    key: "refund_window_days",
    value: "7",
    setting_type: SettingType.SALES,
    description: "Days allowed for refunds after purchase",
    is_public: false,
  },
  {
    key: "currency",
    value: "PHP",
    setting_type: SettingType.GENERAL,
    description: "Default currency",
    is_public: true,
  },
];

// ----------------------------------------------------------------------
// 🧠 SEED FUNCTIONS
// ----------------------------------------------------------------------

/**
 * Seed categories
 */
async function seedCategories() {
  const repo = AppDataSource.getRepository(Category);
  let created = 0;
  let skipped = 0;

  for (const data of categoriesData) {
    const existing = await repo.findOne({ where: { name: data.name } });
    if (existing) {
      skipped++;
      continue;
    }
    const category = repo.create(data);
    await repo.save(category);
    created++;
  }

  logger.info(`📁 Categories: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

/**
 * Seed suppliers
 */
async function seedSuppliers() {
  const repo = AppDataSource.getRepository(Supplier);
  let created = 0;
  let skipped = 0;

  for (const data of suppliersData) {
    const existing = await repo.findOne({ where: { name: data.name } });
    if (existing) {
      skipped++;
      continue;
    }
    const supplier = repo.create(data);
    await repo.save(supplier);
    created++;
  }

  logger.info(`📦 Suppliers: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

/**
 * Seed meats
 */
async function seedMeats() {
  const categoryRepo = AppDataSource.getRepository(Category);
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const meatRepo = AppDataSource.getRepository(Meat);

  let created = 0;
  let skipped = 0;

  for (const data of meatsData) {
    const existing = await meatRepo.findOne({ where: { sku: data.sku } });
    if (existing) {
      skipped++;
      continue;
    }

    const category = await categoryRepo.findOne({
      where: { name: data.categoryName },
    });
    if (!category) {
      logger.warn(`⚠️ Category "${data.categoryName}" not found for meat "${data.name}"`);
      skipped++;
      continue;
    }

    const supplier = await supplierRepo.findOne({
      where: { name: data.supplierName },
    });
    if (!supplier) {
      logger.warn(`⚠️ Supplier "${data.supplierName}" not found for meat "${data.name}"`);
      skipped++;
      continue;
    }

    const { categoryName, supplierName, ...meatData } = data;
    const meat = meatRepo.create({
      ...meatData,
      category,
      supplier,
    });
    await meatRepo.save(meat);
    created++;
  }

  logger.info(`🥩 Meats: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

/**
 * Seed batches
 */
async function seedBatches() {
  const meatRepo = AppDataSource.getRepository(Meat);
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const batchRepo = AppDataSource.getRepository(Batch);

  let created = 0;
  let skipped = 0;

  for (const data of batchesData) {
    const existing = await batchRepo.findOne({
      where: { batchCode: data.batchCode },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const meat = await meatRepo.findOne({
      where: { name: data.meatName },
    });
    if (!meat) {
      logger.warn(`⚠️ Meat "${data.meatName}" not found for batch "${data.batchCode}"`);
      skipped++;
      continue;
    }

    let supplier = null;
    if (data.supplierName) {
      supplier = await supplierRepo.findOne({
        where: { name: data.supplierName },
      });
    }

    const { meatName, supplierName, ...batchData } = data;
    const batch = batchRepo.create({
      ...batchData,
      meat,
      supplier: supplier || null,
    });
    await batchRepo.save(batch);
    created++;
  }

  logger.info(`📦 Batches: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

/**
 * Seed customers
 */
async function seedCustomers() {
  const repo = AppDataSource.getRepository(Customer);
  let created = 0;
  let skipped = 0;

  for (const data of customersData) {
    const existing = await repo.findOne({ where: { email: data.email } });
    if (existing) {
      skipped++;
      continue;
    }
    const customer = repo.create(data);
    await repo.save(customer);
    created++;
  }

  logger.info(`👤 Customers: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

/**
 * Seed system settings
 */
async function seedSystemSettings() {
  const repo = AppDataSource.getRepository(SystemSetting);
  let created = 0;
  let skipped = 0;

  for (const data of systemSettingsData) {
    const existing = await repo.findOne({
      where: { key: data.key, setting_type: data.setting_type },
    });
    if (existing) {
      skipped++;
      continue;
    }
    const setting = repo.create(data);
    await repo.save(setting);
    created++;
  }

  logger.info(`⚙️ System Settings: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

// ----------------------------------------------------------------------
// 🚀 MAIN SEED FUNCTION
// ----------------------------------------------------------------------

async function runSeed() {
  try {
    logger.info("🌱 Starting database seed...");

    // Initialize data source if not already initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info("📊 Database connected");
    }

    // Run seeds in order (with dependencies)
    const results = {
      categories: await seedCategories(),
      suppliers: await seedSuppliers(),
      meats: await seedMeats(),
      batches: await seedBatches(),
      customers: await seedCustomers(),
      settings: await seedSystemSettings(),
    };

    const totalCreated = Object.values(results).reduce(
      (sum, r) => sum + r.created,
      0
    );
    const totalSkipped = Object.values(results).reduce(
      (sum, r) => sum + r.skipped,
      0
    );

    logger.info(`✅ Seed completed! ${totalCreated} created, ${totalSkipped} skipped`);
    logger.info(`📊 Summary:`, results);

    return { success: true, results };
  } catch (error) {
    logger.error("❌ Seed failed:", error);
    throw error;
  }
}

// ----------------------------------------------------------------------
// 📤 EXPORT
// ----------------------------------------------------------------------

module.exports = { runSeed, seedCategories, seedSuppliers, seedMeats, seedBatches, seedCustomers, seedSystemSettings };

// Run directly if called from command line
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}