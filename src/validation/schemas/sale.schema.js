// src/validation/schemas/sale.schema.js
const { z } = require('zod');

const saleItemSchema = z.object({
  meatId: z.number().int().positive(),
  batchId: z.number().int().positive(),
  weightKg: z.number().positive('Weight must be greater than 0'),
  unitPrice: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
});

const saleCreateSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  customerId: z.number().int().positive().optional(),
  paymentMethod: z.enum(['cash', 'card', 'wallet']).optional(),
  notes: z.string().max(500).optional(),
  loyaltyRedeemed: z.number().int().min(0).optional(),
  voucherCode: z.string().max(50).optional(),
});

const saleUpdateSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'wallet']).optional(),
  notes: z.string().max(500).optional(),
  customerId: z.number().int().positive().nullable().optional(),
  items: z.array(saleItemSchema).min(1).optional(),
  voucherCode: z.string().max(50).nullable().optional(),
  loyaltyRedeemed: z.number().int().min(0).optional(),
});

const saleStatusSchema = z.object({
  status: z.enum(['initiated', 'paid', 'refunded', 'voided']),
});

module.exports = {
  saleCreateSchema,
  saleUpdateSchema,
  saleStatusSchema,
  saleItemSchema,
};