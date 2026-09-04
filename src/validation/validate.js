// src/validation/validate.js
const { ZodError } = require('zod');

/**
 * Validates data against a Zod schema and throws a formatted error if invalid.
 * @param {import('zod').ZodSchema} schema
 * @param {any} data
 * @param {string} [context='data']
 * @returns {any} - validated and sanitized data
 * @throws {Error} - with combined error messages
 */
function validate(schema, data, context = 'data') {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`Validation failed for ${context}: ${messages}`);
    }
    throw error;
  }
}

module.exports = { validate };