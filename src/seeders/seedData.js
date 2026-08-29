// src/seeders/seedData.js
//@ts-check
const { AppDataSource } = require("../main/db/data-source");
const { logger } = require("../utils/logger");

// ✅ Import entities with correct destructuring
const Category = require("../entities/Category");
const Supplier = require("../entities/Supplier");
const Meat = require("../entities/Meat");
const Batch = require("../entities/Batch");
const Customer = require("../entities/Customer");
const Sale = require("../entities/Sale");
const SaleItem = require("../entities/SaleItem");
const Purchase = require("../entities/Purchase");
const PurchaseItem = require("../entities/PurchaseItem");
const ReturnRefund = require("../entities/ReturnRefund");
const ReturnRefundItem = require("../entities/ReturnRefundItem");
const InventoryMovement = require("../entities/InventoryMovement");
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const Notification = require("../entities/Notification");
const NotificationLog = require("../entities/NotificationLog");
const { AuditLog } = require("../entities/AuditLog");
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
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: "active",
    note: "Premium grade",
    supplierName: "Manila Meat Supply",
  },
  // Beef Ground (3 batches)
  {
    batchCode: "BATCH-BEEF-004",
    meatName: "Beef Ground", 
    initialQuantity: 40.0,
    remainingQuantity: 40.0,
    unitCost: 350.00,
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: "active",
    note: "Fresh ground beef",
    supplierName: "Premium Meats PH",
  },
  {
    batchCode: "BATCH-EXPIRING-001",
    meatName: "Beef Ground",
    initialQuantity: 5.0,
    remainingQuantity: 5.0,
    unitCost: 350.00,
    expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    status: "active",
    note: "EXPIRING SOON",
    supplierName: "Premium Meats PH",
  },
  {
    batchCode: "BATCH-EXPIRED-001",
    meatName: "Beef Ground",
    initialQuantity: 3.0,
    remainingQuantity: 3.0,
    unitCost: 350.00,
    expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: "active",
    note: "EXPIRED",
    supplierName: "Premium Meats PH",
  },
  // Beef Short Ribs
  {
    batchCode: "BATCH-BEEF-005",
    meatName: "Beef Short Ribs",
    initialQuantity: 20.0,
    remainingQuantity: 20.0,
    unitCost: 600.00,
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
    expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    status: "active",
    note: "Bone-in",
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

async function seedCategories() {
  const repo = AppDataSource.getRepository(Category);
  let created = 0, skipped = 0;
  for (const data of categoriesData) {
    const existing = await repo.findOne({ where: { name: data.name } });
    if (existing) { skipped++; continue; }
    const entity = repo.create(data);
    await repo.save(entity);
    created++;
  }
  logger.info(`📁 Categories: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedSuppliers() {
  const repo = AppDataSource.getRepository(Supplier);
  let created = 0, skipped = 0;
  for (const data of suppliersData) {
    const existing = await repo.findOne({ where: { name: data.name } });
    if (existing) { skipped++; continue; }
    const entity = repo.create(data);
    await repo.save(entity);
    created++;
  }
  logger.info(`📦 Suppliers: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedMeats() {
  const categoryRepo = AppDataSource.getRepository(Category);
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const repo = AppDataSource.getRepository(Meat);
  let created = 0, skipped = 0;
  for (const data of meatsData) {
    const existing = await repo.findOne({ where: { sku: data.sku } });
    if (existing) { skipped++; continue; }
    const category = await categoryRepo.findOne({ where: { name: data.categoryName } });
    if (!category) { logger.warn(`⚠️ Category "${data.categoryName}" not found`); skipped++; continue; }
    const supplier = await supplierRepo.findOne({ where: { name: data.supplierName } });
    if (!supplier) { logger.warn(`⚠️ Supplier "${data.supplierName}" not found`); skipped++; continue; }
    const { categoryName, supplierName, ...meatData } = data;
    const entity = repo.create({ ...meatData, category, supplier });
    await repo.save(entity);
    created++;
  }
  logger.info(`🥩 Meats: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedBatches() {
  const meatRepo = AppDataSource.getRepository(Meat);
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const repo = AppDataSource.getRepository(Batch);
  let created = 0, skipped = 0;

  for (const data of batchesData) {
    const existing = await repo.findOne({ where: { batchCode: data.batchCode } });
    if (existing) { skipped++; continue; }
    const meat = await meatRepo.findOne({ where: { name: data.meatName } });
    if (!meat) { logger.warn(`⚠️ Meat "${data.meatName}" not found for batch "${data.batchCode}"`); skipped++; continue; }
    let supplier = null;
    if (data.supplierName) {
      supplier = await supplierRepo.findOne({ where: { name: data.supplierName } });
    }
    const { meatName, supplierName, ...batchData } = data;
    const entity = repo.create({ ...batchData, meat, supplier: supplier || null });
    await repo.save(entity);
    created++;
  }

  // Ensure every meat has at least one batch
  const allMeats = await meatRepo.find();
  const allBatches = await repo.find({ relations: ['meat'] });
  const meatIdsWithBatches = new Set(allBatches.map(b => b.meat?.id).filter(id => id));
  const meatsWithoutBatch = allMeats.filter(m => !meatIdsWithBatches.has(m.id));
  if (meatsWithoutBatch.length) {
    logger.info(`🔍 Found ${meatsWithoutBatch.length} meats without batches. Creating default batches...`);
    for (const meat of meatsWithoutBatch) {
      const defaultBatch = repo.create({
        batchCode: `BATCH-DEFAULT-${meat.id}-${Date.now()}`,
        initialQuantity: 10,
        remainingQuantity: 10,
        unitCost: Number(meat.pricePerKg) * 0.7 || 100,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        note: 'Auto-created default batch',
        meat: meat,
        supplier: null,
      });
      await repo.save(defaultBatch);
      created++;
      logger.info(`✅ Created default batch for "${meat.name}" (${defaultBatch.batchCode})`);
    }
  }
  logger.info(`📦 Batches: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedCustomers() {
  const repo = AppDataSource.getRepository(Customer);
  let created = 0, skipped = 0;
  for (const data of customersData) {
    const existing = await repo.findOne({ where: { email: data.email } });
    if (existing) { skipped++; continue; }
    const entity = repo.create(data);
    await repo.save(entity);
    created++;
  }
  logger.info(`👤 Customers: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedSales() {
  const customerRepo = AppDataSource.getRepository(Customer);
  const saleRepo = AppDataSource.getRepository(Sale);
  let created = 0, skipped = 0;
  const customers = await customerRepo.find();
  for (let i = 0; i < 30; i++) {
    const customer = customers.length ? customers[i % customers.length] : null;
    const total = Math.round((Math.random() * 5000 + 100) * 100) / 100;
    const sale = saleRepo.create({
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      status: ['initiated', 'paid', 'refunded', 'voided'][Math.floor(Math.random() * 4)],
      paymentMethod: ['cash', 'card', 'wallet'][Math.floor(Math.random() * 3)],
      totalAmount: total,
      usedLoyalty: Math.random() > 0.7,
      loyaltyRedeemed: Math.random() > 0.7 ? Math.floor(Math.random() * 100) : 0,
      usedDiscount: Math.random() > 0.8,
      totalDiscount: Math.random() > 0.8 ? Math.round(Math.random() * 500 * 100) / 100 : 0,
      usedVoucher: Math.random() > 0.9,
      voucherCode: Math.random() > 0.9 ? `VOUCHER-${Math.floor(Math.random() * 10000)}` : null,
      pointsEarn: Math.floor(Math.random() * 50),
      notes: Math.random() > 0.5 ? null : 'Test sale',
      customer: customer,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });
    await saleRepo.save(sale);
    created++;
  }
  logger.info(`🧾 Sales: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedSaleItems() {
  const saleRepo = AppDataSource.getRepository(Sale);
  const meatRepo = AppDataSource.getRepository(Meat);
  const batchRepo = AppDataSource.getRepository(Batch);
  const repo = AppDataSource.getRepository(SaleItem);
  let created = 0, skipped = 0;

  const sales = await saleRepo.find();
  const meats = await meatRepo.find();
  const batches = await batchRepo.find({ relations: ['meat'] });

  for (const sale of sales) {
    const numItems = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < numItems; i++) {
      const meat = meats.length ? meats[Math.floor(Math.random() * meats.length)] : null;
      if (!meat) continue;
      const batch = batches.find(b => b.meat?.id === meat.id);
      const weight = +(Math.random() * 2 + 0.5).toFixed(3);
      const unitPrice = meat.pricePerKg || 100;
      const discount = Math.random() > 0.8 ? +(Math.random() * 50).toFixed(2) : 0;
      const tax = Math.random() > 0.8 ? +(Math.random() * 12).toFixed(2) : 0;
      const lineTotal = unitPrice * weight - discount + tax;
      const item = repo.create({
        weightKg: weight,
        unitPrice: unitPrice,
        discount: discount,
        tax: tax,
        lineTotal: lineTotal,
        sale: sale,
        meat: meat,
        batch: batch || null,
        createdAt: sale.createdAt,
        updatedAt: new Date(),
      });
      await repo.save(item);
      created++;
    }
  }
  logger.info(`🛒 Sale Items: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedPurchases() {
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const repo = AppDataSource.getRepository(Purchase);
  let created = 0, skipped = 0;
  const suppliers = await supplierRepo.find();
  for (let i = 0; i < 20; i++) {
    const supplier = suppliers.length ? suppliers[i % suppliers.length] : null;
    const total = +(Math.random() * 20000 + 1000).toFixed(2);
    const purchase = repo.create({
      referenceNo: `PURCHASE-${Date.now()}-${i}`,
      orderDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      status: ['pending', 'approved', 'completed', 'cancelled'][Math.floor(Math.random() * 4)],
      notes: Math.random() > 0.5 ? null : 'Test purchase',
      totalAmount: total,
      supplier: supplier,
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });
    await repo.save(purchase);
    created++;
  }
  logger.info(`📦 Purchases: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedPurchaseItems() {
  const purchaseRepo = AppDataSource.getRepository(Purchase);
  const meatRepo = AppDataSource.getRepository(Meat);
  const repo = AppDataSource.getRepository(PurchaseItem);
  let created = 0, skipped = 0;

  const purchases = await purchaseRepo.find();
  const meats = await meatRepo.find();

  for (const purchase of purchases) {
    const numItems = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < numItems; i++) {
      const meat = meats.length ? meats[Math.floor(Math.random() * meats.length)] : null;
      if (!meat) continue;
      const qty = +(Math.random() * 10 + 1).toFixed(3);
      const unitPrice = meat.pricePerKg || 100;
      const subtotal = +(qty * unitPrice).toFixed(2);
      const expiryDate = new Date(Date.now() + (Math.random() * 30 + 7) * 24 * 60 * 60 * 1000);
      const item = repo.create({
        quantity: qty,
        unitPrice: unitPrice,
        subtotal: subtotal,
        expiryDate: expiryDate,
        purchase: purchase,
        meat: meat,
        createdAt: purchase.createdAt,
      });
      await repo.save(item);
      created++;
    }
  }
  logger.info(`📋 Purchase Items: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedReturnRefunds() {
  const saleRepo = AppDataSource.getRepository(Sale);
  const customerRepo = AppDataSource.getRepository(Customer);
  const repo = AppDataSource.getRepository(ReturnRefund);
  let created = 0, skipped = 0;
  const sales = await saleRepo.find();
  const customers = await customerRepo.find();
  for (let i = 0; i < 8; i++) {
    const sale = sales.length ? sales[i % sales.length] : null;
    const customer = customers.length ? customers[i % customers.length] : null;
    const total = +(Math.random() * 2000 + 100).toFixed(2);
    const refund = repo.create({
      referenceNo: `RETURN-${Date.now()}-${i}`,
      reason: Math.random() > 0.5 ? 'Damaged product' : 'Customer request',
      refundMethod: ['cash', 'card', 'store credit'][Math.floor(Math.random() * 3)],
      totalAmount: total,
      status: ['pending', 'processed', 'cancelled'][Math.floor(Math.random() * 3)],
      sale: sale,
      customer: customer,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });
    await repo.save(refund);
    created++;
  }
  logger.info(`🔄 Return Refunds: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedReturnRefundItems() {
  const returnRepo = AppDataSource.getRepository(ReturnRefund);
  const meatRepo = AppDataSource.getRepository(Meat);
  const batchRepo = AppDataSource.getRepository(Batch);
  const repo = AppDataSource.getRepository(ReturnRefundItem);
  let created = 0, skipped = 0;

  const returns = await returnRepo.find();
  const meats = await meatRepo.find();
  const batches = await batchRepo.find({ relations: ['meat'] });

  for (const ret of returns) {
    const numItems = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numItems; i++) {
      const meat = meats.length ? meats[Math.floor(Math.random() * meats.length)] : null;
      if (!meat) continue;
      const batch = batches.find(b => b.meat?.id === meat.id);
      const weight = +(Math.random() * 2 + 0.5).toFixed(3);
      const unitPrice = meat.pricePerKg || 100;
      const subtotal = +(weight * unitPrice).toFixed(2);
      const item = repo.create({
        weightKg: weight,
        unitPrice: unitPrice,
        subtotal: subtotal,
        reason: Math.random() > 0.5 ? 'Damaged' : 'Wrong item',
        returnRefund: ret,
        meat: meat,
        batch: batch || null,
        createdAt: ret.createdAt,
      });
      await repo.save(item);
      created++;
    }
  }
  logger.info(`🔄 Return Refund Items: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedInventoryMovements() {
  const meatRepo = AppDataSource.getRepository(Meat);
  const batchRepo = AppDataSource.getRepository(Batch);
  const saleRepo = AppDataSource.getRepository(Sale);
  const repo = AppDataSource.getRepository(InventoryMovement);
  let created = 0, skipped = 0;

  const meats = await meatRepo.find();
  const batches = await batchRepo.find({ relations: ['meat'] });
  const sales = await saleRepo.find();

  for (let i = 0; i < 40; i++) {
    const meat = meats.length ? meats[Math.floor(Math.random() * meats.length)] : null;
    if (!meat) continue;
    const batch = batches.find(b => b.meat?.id === meat.id);
    const sale = sales.length ? sales[Math.floor(Math.random() * sales.length)] : null;
    const types = ['sale', 'refund', 'adjustment', 'purchase', 'expiry_write_off'];
    const type = types[Math.floor(Math.random() * types.length)];
    let qtyChange = +(Math.random() * 5).toFixed(3);
    if (type === 'sale' || type === 'expiry_write_off') qtyChange = -qtyChange;
    else if (type === 'refund' || type === 'purchase') qtyChange = +qtyChange;
    const movement = repo.create({
      movementType: type,
      qtyChange: qtyChange,
      notes: Math.random() > 0.5 ? null : 'Auto-generated movement',
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      meat: meat,
      batch: batch || null,
      sale: sale || null,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });
    await repo.save(movement);
    created++;
  }
  logger.info(`📊 Inventory Movements: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedLoyaltyTransactions() {
  const customerRepo = AppDataSource.getRepository(Customer);
  const saleRepo = AppDataSource.getRepository(Sale);
  const repo = AppDataSource.getRepository(LoyaltyTransaction);
  let created = 0, skipped = 0;

  const customers = await customerRepo.find();
  const sales = await saleRepo.find();

  for (let i = 0; i < 35; i++) {
    const customer = customers.length ? customers[Math.floor(Math.random() * customers.length)] : null;
    if (!customer) continue;
    const sale = sales.length ? sales[Math.floor(Math.random() * sales.length)] : null;
    const types = ['earn', 'redeem', 'adjustment', 'refund'];
    const type = types[Math.floor(Math.random() * types.length)];
    let points = Math.floor(Math.random() * 100);
    if (type === 'redeem' || type === 'refund') points = -points;
    const tx = repo.create({
      transactionType: type,
      pointsChange: points,
      notes: Math.random() > 0.5 ? null : `Loyalty ${type}`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      customer: customer,
      sale: sale || null,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });
    await repo.save(tx);
    created++;
  }
  logger.info(`💎 Loyalty Transactions: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedNotifications() {
  const repo = AppDataSource.getRepository(Notification);
  let created = 0, skipped = 0;
  for (let i = 0; i < 50; i++) {
    const notif = repo.create({
      userId: Math.floor(Math.random() * 10) + 1,
      title: ['Info', 'Success', 'Warning', 'Error', 'Purchase', 'Sale'][Math.floor(Math.random() * 6)],
      message: `Test notification #${i}`,
      type: ['info', 'success', 'warning', 'error', 'purchase', 'sale'][Math.floor(Math.random() * 6)],
      isRead: Math.random() > 0.5,
      metadata: Math.random() > 0.7 ? { key: 'value' } : null,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      deletedAt: null,
    });
    await repo.save(notif);
    created++;
  }
  logger.info(`🔔 Notifications: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedNotificationLogs() {
  const repo = AppDataSource.getRepository(NotificationLog);
  let created = 0, skipped = 0;
  for (let i = 0; i < 40; i++) {
    const statuses = ['queued', 'sent', 'failed', 'resend'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const log = repo.create({
      recipient_email: `test${i}@example.com`,
      subject: `Test email ${i}`,
      payload: JSON.stringify({ test: true }),
      channel: ['email', 'sms'][Math.floor(Math.random() * 2)],
      status: status,
      error_message: status === 'failed' ? 'Test error' : null,
      retry_count: status === 'failed' ? Math.floor(Math.random() * 3) : 0,
      resend_count: status === 'resend' ? Math.floor(Math.random() * 2) : 0,
      sent_at: status === 'sent' ? new Date() : null,
      last_error_at: status === 'failed' ? new Date() : null,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    });
    await repo.save(log);
    created++;
  }
  logger.info(`📧 Notification Logs: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function seedAuditLogs() {
  // ⚠️ Skip audit logs because the entity schema may be incomplete.
  // Uncomment below if you have a complete AuditLog entity.
  logger.info(`📝 Audit Logs: skipped (entity incomplete)`);
  return { created: 0, skipped: 0 };
}

async function seedSystemSettings() {
  const repo = AppDataSource.getRepository(SystemSetting);
  let created = 0, skipped = 0;
  for (const data of systemSettingsData) {
    const existing = await repo.findOne({ where: { key: data.key, setting_type: data.setting_type } });
    if (existing) { skipped++; continue; }
    const entity = repo.create(data);
    await repo.save(entity);
    created++;
  }
  logger.info(`⚙️ System Settings: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

// ----------------------------------------------------------------------
// 📊 PRINT DATABASE SUMMARY
// ----------------------------------------------------------------------

async function printDatabaseSummary() {
  console.log("\n📊 DATABASE SUMMARY");
  console.log("=".repeat(50));

  const tables = [
    { name: "categories", repo: Category },
    { name: "suppliers", repo: Supplier },
    { name: "meats", repo: Meat },
    { name: "batches", repo: Batch },
    { name: "customers", repo: Customer },
    { name: "sales", repo: Sale },
    { name: "sale_items", repo: SaleItem },
    { name: "purchases", repo: Purchase },
    { name: "purchase_items", repo: PurchaseItem },
    { name: "return_refunds", repo: ReturnRefund },
    { name: "return_refund_items", repo: ReturnRefundItem },
    { name: "inventory_movements", repo: InventoryMovement },
    { name: "loyalty_transactions", repo: LoyaltyTransaction },
    { name: "notifications", repo: Notification },
    { name: "notification_logs", repo: NotificationLog },
    { name: "audit_logs", repo: AuditLog },
    { name: "system_settings", repo: SystemSetting },
  ];

  for (const table of tables) {
    try {
      const repo = AppDataSource.getRepository(table.repo);
      const count = await repo.count();
      console.log(`  ${table.name.padEnd(25)}: ${count}`);
    } catch (err) {
      console.log(`  ${table.name.padEnd(25)}: ERROR (${err.message})`);
    }
  }
  console.log("=".repeat(50));
}

// ----------------------------------------------------------------------
// 🚀 MAIN SEED FUNCTION
// ----------------------------------------------------------------------

async function runSeed() {
  try {
    logger.info("🌱 Starting Meatify database seed...");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info("📊 Database connected");
    }

    // Clear existing data (in proper order)
    console.log("🧹 Clearing all Meatify data...");
    await AppDataSource.query("PRAGMA foreign_keys = OFF;");
    const tables = [
      'sale_items', 'sales', 'return_refund_items', 'return_refunds',
      'purchase_items', 'purchases', 'inventory_movements', 'loyalty_transactions',
      'notifications', 'notification_logs', 'audit_logs',
      'batches', 'meats', 'customers', 'suppliers', 'categories', 'system_settings'
    ];
    for (const table of tables) {
      const exists = await AppDataSource.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`);
      if (exists.length) {
        await AppDataSource.query(`DELETE FROM ${table};`);
        await AppDataSource.query(`DELETE FROM sqlite_sequence WHERE name='${table}';`);
      }
    }
    await AppDataSource.query("PRAGMA foreign_keys = ON;");
    console.log("✅ All tables cleared");

    // Seed in order
    const results = {
      categories: await seedCategories(),
      suppliers: await seedSuppliers(),
      meats: await seedMeats(),
      batches: await seedBatches(),
      customers: await seedCustomers(),
      sales: await seedSales(),
      saleItems: await seedSaleItems(),
      purchases: await seedPurchases(),
      purchaseItems: await seedPurchaseItems(),
      returnRefunds: await seedReturnRefunds(),
      returnRefundItems: await seedReturnRefundItems(),
      inventoryMovements: await seedInventoryMovements(),
      loyaltyTransactions: await seedLoyaltyTransactions(),
      notifications: await seedNotifications(),
      notificationLogs: await seedNotificationLogs(),
      auditLogs: await seedAuditLogs(),
      settings: await seedSystemSettings(),
    };

    const totalCreated = Object.values(results).reduce((sum, r) => sum + r.created, 0);
    const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0);

    logger.info(`✅ Seed completed! ${totalCreated} created, ${totalSkipped} skipped`);
    console.log('📊 Summary:', results);

    // ✅ Print database summary
    await printDatabaseSummary();

    return { success: true, results };
  } catch (error) {
    logger.error("❌ Seed failed:", error);
    throw error;
  }
}

module.exports = { runSeed };

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}