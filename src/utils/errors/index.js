// src/utils/errors.js
class ConcurrencyError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConcurrencyError";
  }
}

class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message, entity = null) {
    super(message);
    this.name = "NotFoundError";
    this.entity = entity;
  }
}

module.exports = {
  ConcurrencyError,
  ValidationError,
  NotFoundError,
};