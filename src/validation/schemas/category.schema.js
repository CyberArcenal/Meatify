// src/validation/schemas/category.schema.js
const { z } = require('zod');

const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const categoryMergeSchema = z.object({
  sourceCategoryId: z.number().int().positive(),
  targetCategoryId: z.number().int().positive(),
});

module.exports = {
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryMergeSchema,
};