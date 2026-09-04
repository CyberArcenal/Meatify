// src/validation/schemas/returnRefund.schema.js
const { z } = require('zod');

const returnItemSchema = z.object({
  meatId: z.number().int().positive(),
  batchId: z.number().int().positive(),
  weightKg: z.number().positive('Weight must be greater than 0'),
  unitPrice: z.number().min(0).optional(),
  reason: z.string().max(500).optional(),
});

const returnRefundCreateSchema = z.object({
  saleId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  reason: z.string().max(500).optional(),
  refundMethod: z.enum(['cash', 'card', 'wallet', 'original_payment']),
  items: z.array(returnItemSchema).min(1, 'At least one item required'),
  referenceNo: z.string().max(50).optional(),
  status: z.enum(['pending', 'processed', 'cancelled']).optional(),
});

const returnRefundUpdateSchema = z.object({
  reason: z.string().max(500).optional(),
  refundMethod: z.enum(['cash', 'card', 'wallet', 'original_payment']).optional(),
  items: z.array(returnItemSchema).min(1).optional(),
  customerId: z.number().int().positive().optional(),
  saleId: z.number().int().positive().optional(),
});

const returnRefundStatusSchema = z.object({
  status: z.enum(['pending', 'processed', 'cancelled']),
  reason: z.string().max(500).optional(),
});

module.exports = {
  returnRefundCreateSchema,
  returnRefundUpdateSchema,
  returnRefundStatusSchema,
  returnItemSchema,
};