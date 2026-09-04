// Batch.js
const { EntitySchema } = require("typeorm");

const Batch = new EntitySchema({
  name: "Batch",
  tableName: "batches",
  columns: {
    id: { type: Number, primary: true, generated: true },
    batchCode: { type: String, unique: true }, // e.g., BATCH-2026-001
    initialQuantity: { type: "decimal", precision: 10, scale: 3 }, // kg
    remainingQuantity: { type: "decimal", precision: 10, scale: 3 }, // kg
    unitCost: { type: "decimal", precision: 10, scale: 2 }, // puhunan per kg
    expiryDate: { type: Date },
    receivedDate: { type: Date, default: () => "CURRENT_TIMESTAMP" },
    status: { 
      type: String, 
      default: "active", 
      enum: ["active", "depleted", "expired", "on_hold"] 
    },
    note: { type: String, nullable: true },
    createdAt: { type: Date, default: () => "CURRENT_TIMESTAMP" },
    updatedAt: { type: Date, nullable: true },

    version: { 
      type: Number, 
      default: 1 
    },
  },
  relations: {
    meat: { // ipo-link sa Meat entity sa ibaba
      target: "Meat",
      type: "many-to-one",
      joinColumn: true,
      eager: true, // madalas kailangan ang meat details
    },
    supplier: {
      target: "Supplier",
      type: "many-to-one",
      joinColumn: true,
      nullable: true,
    },
  },
});

module.exports = Batch;