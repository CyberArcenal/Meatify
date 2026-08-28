// SaleItem.js
const { EntitySchema } = require("typeorm");

const SaleItem = new EntitySchema({
  name: "SaleItem",
  tableName: "sale_items",
  columns: {
    id: { type: Number, primary: true, generated: true },
    
    // ❌ TANGGALIN: quantity (integer)
    // ✅ BAGO: weightKg (decimal)
    weightKg: { type: "decimal", precision: 10, scale: 3, default: 0.000 },
    
    unitPrice: { type: "decimal", precision: 10, scale: 2, default: 0.00 }, // presyo per kg at time of sale
    discount: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
    tax: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
    lineTotal: { type: "decimal", precision: 10, scale: 2, default: 0.00 },
    batchId: { type: Number, nullable: true },
    createdAt: { type: Date, default: () => "CURRENT_TIMESTAMP" },
    updatedAt: { type: Date, nullable: true }
  },
  relations: {
    sale: {
      target: "Sale",
      type: "many-to-one",
      joinColumn: true
    },
    // Palitan ang target at inverseSide
    meat: { 
      target: "Meat", 
      type: "many-to-one", 
      joinColumn: true 
    },
    // ✅ BAGONG RELATION: para malaman kung aling batch ang binawasan
    batch: {
      target: "Batch",
      type: "many-to-one",
      joinColumn: true,
      nullable: true,
    }
  }
});

module.exports = SaleItem;