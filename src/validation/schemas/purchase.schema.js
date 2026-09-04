// src/validation/schemas/purchase.schema.js
const { z } = require('zod');

const purchaseItemSchema = z.object({
  meatId: z.number().int().positive(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  expiryDate: z.string().date().refine(
    (date) => new Date(date) > new Date(),
    { message: 'Expiry date must be in the future' }
  ),
});

const purchaseCreateSchema = z.object({
  supplierId: z.number().int().positive(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item required'),
  referenceNo: z.string().max(50).optional(),
  orderDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'approved', 'completed', 'cancelled']).optional(),
  notes: z.string().max(500).optional(),
});

const purchaseUpdateSchema = z.object({
  supplierId: z.number().int().positive().optional(),
  items: z.array(purchaseItemSchema).min(1).optional(),
  referenceNo: z.string().max(50).optional(),
  orderDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

const purchaseStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'completed', 'cancelled']),
  reason: z.string().max(500).optional(),
});

module.exports = {
  purchaseCreateSchema,
  purchaseUpdateSchema,
  purchaseStatusSchema,
  purchaseItemSchema,
};