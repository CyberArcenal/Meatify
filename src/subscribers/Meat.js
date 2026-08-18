// Meat.js (dating Product.js)
const { EntitySchema } = require("typeorm");

const Meat = new EntitySchema({
  name: "Meat",
  tableName: "meats",
  columns: {
    id: { type: Number, primary: true, generated: true },
    sku: { type: String, unique: true },
    name: { type: String },
    image: { type: "varchar", nullable: true },
    barcode: { type: "varchar", unique: true, nullable: true },
    description: { type: String, nullable: true },
    
    // ✅ BAGO: Presyo per Kilo (decimal)
    pricePerKg: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
    
    // ❌ TANGGALIN: stockQty (integer) - lipat sa Batch
    // ❌ TANGGALIN: reorderLevel, reorderQty (kung gusto mong i-retain, pwede pa, pero i-base mo na lang sa kabuuang remaining ng lahat ng batches)
    
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: () => "CURRENT_TIMESTAMP" },
    updatedAt: { type: Date, nullable: true },
  },
  relations: {
    // Palitan ang target ng "SaleItem" at "InventoryMovement" kung gusto mong i-link sa Meat
    saleItems: {
      target: "SaleItem",
      type: "one-to-many",
      inverseSide: "meat", // palitan ang inverseSide
    },
    inventoryMovements: {
      target: "InventoryMovement",
      type: "one-to-many",
      inverseSide: "meat",
    },
    batches: { // ✅ BAGONG RELATION
      target: "Batch",
      type: "one-to-many",
      inverseSide: "meat",
    },
    category: {
      target: "Category",
      type: "many-to-one",
      joinColumn: true,
      eager: true,
    },
    supplier: {
      target: "Supplier",
      type: "many-to-one",
      joinColumn: true,
      eager: true,
    },
  },
});

module.exports = Meat;