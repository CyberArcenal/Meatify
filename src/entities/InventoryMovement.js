// InventoryMovement.js
const { EntitySchema } = require("typeorm");

const InventoryMovement = new EntitySchema({
  name: "InventoryMovement",
  tableName: "inventory_movements",
  columns: {
    id: { type: Number, primary: true, generated: true },
    movementType: {
      type: "varchar",
      enum: ["sale", "refund", "adjustment", "purchase", "expiry_write_off", "waste"],
      default: "sale",
    },
    // ✅ BAGO: gawing decimal
    qtyChange: { type: "decimal", precision: 10, scale: 3 },
    timestamp: { type: Date, default: () => "CURRENT_TIMESTAMP" },
    notes: { type: String, nullable: true },
    updatedAt: { type: Date, nullable: true },
  },
  relations: {
    // Palitan ang product -> meat
    meat: {
      target: "Meat",
      type: "many-to-one",
      joinColumn: true,
    },
    // ✅ BAGO: i-link sa batch
    batch: {
      target: "Batch",
      type: "many-to-one",
      joinColumn: true,
      nullable: true,
    },
    sale: {
      target: "Sale",
      type: "many-to-one",
      joinColumn: true,
      nullable: true,
    },
  },
});

module.exports = InventoryMovement;