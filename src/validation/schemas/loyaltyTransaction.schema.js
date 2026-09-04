// src/validation/schemas/loyaltyTransaction.schema.js
const { z } = require('zod');

const loyaltyTransactionCreateSchema = z.object({
  customerId: z.number().int().positive(),
  pointsChange: z.number().int().refine(val => val !== 0, 'Points change cannot be zero'),
  transactionType: z.enum(['earn', 'redeem', 'adjustment', 'refund']),
  notes: z.string().max(500).optional(),
  saleId: z.number().int().positive().optional(),
});

const loyaltyTransactionUpdateSchema = z.object({
  notes: z.string().max(500).optional(),
});

module.exports = {
  loyaltyTransactionCreateSchema,
  loyaltyTransactionUpdateSchema,
};