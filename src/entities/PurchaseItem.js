// PurchaseItem.js
const { EntitySchema } = require("typeorm");

const PurchaseItem = new EntitySchema({
  name: "PurchaseItem",
  tableName: "purchase_items",
  columns: {
    id: { type: Number, primary: true, generated: true },
    
    // ✅ BAGO: gawing decimal ang quantity (kg)
    quantity: { type: "decimal", precision: 10, scale: 3 }, 
    unitPrice: { type: "decimal", precision: 10, scale: 2 },
    subtotal: { type: "decimal", precision: 10, scale: 2 },
    
    // ✅ BAGO: expiry date per item (kasi iba-iba ang expiry kada batch)
    expiryDate: { type: Date, nullable: false },
    
    createdAt: { type: Date, default: () => "CURRENT_TIMESTAMP" }
  },
  relations: {
    purchase: {
      target: "Purchase",
      type: "many-to-one",
      joinColumn: true
    },
    // Palitan ang product -> meat
    meat: { 
      target: "Meat", 
      type: "many-to-one", 
      joinColumn: true, 
      eager: true 
    }
  }
});

module.exports = PurchaseItem;