// ReturnRefundItem.js
const { EntitySchema } = require("typeorm");

const ReturnRefundItem = new EntitySchema({
  name: "ReturnRefundItem",
  tableName: "return_refund_items",
  columns: {
    id: { type: Number, primary: true, generated: true },
    
    // ✅ BAGO: gawing decimal
    quantity: { type: "decimal", precision: 10, scale: 3 }, 
    unitPrice: { type: "decimal", precision: 10, scale: 2 },
    subtotal: { type: "decimal", precision: 10, scale: 2 },
    reason: { type: String, nullable: true },
    createdAt: { type: Date, default: () => "CURRENT_TIMESTAMP" }
  },
  relations: {
    returnRefund: {
      target: "ReturnRefund",
      type: "many-to-one",
      joinColumn: true
    },
    meat: { // Palitan product -> meat
      target: "Meat", 
      type: "many-to-one", 
      joinColumn: true, 
      eager: true 
    },
    // ✅ BAGO: i-link sa batch para maibalik sa tamang batch
    batch: {
      target: "Batch",
      type: "many-to-one",
      joinColumn: true,
      nullable: false,
    }
  }
});

module.exports = ReturnRefundItem;