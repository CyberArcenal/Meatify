// ReturnRefund.js
const { EntitySchema } = require("typeorm");

const ReturnRefund = new EntitySchema({
  name: "ReturnRefund",
  tableName: "return_refunds",
  columns: {
    id: { type: Number, primary: true, generated: true },
    referenceNo: { type: String, unique: true },
    reason: { type: String, nullable: true },
    refundMethod: { type: String }, // Cash, Card, Store Credit
    totalAmount: { type: "decimal", precision: 10, scale: 2, default: 0 },
    status: { 
      type: String, 
      default: "pending", 
      enum: ["pending", "processed", "cancelled"] 
    },
    createdAt: { type: Date, default: () => "CURRENT_TIMESTAMP" },
    updatedAt: { type: Date, nullable: true },
  },
  relations: {
    sale: {
      target: "Sale",
      type: "many-to-one",
      joinColumn: true,
      eager: true,
    },
    customer: {
      target: "Customer",
      type: "many-to-one",
      joinColumn: true,
      eager: true,
    },
    items: {
      target: "ReturnRefundItem",
      type: "one-to-many",
      inverseSide: "returnRefund",
      cascade: true,
    },
  },
});

module.exports = ReturnRefund;