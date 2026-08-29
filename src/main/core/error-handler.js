// src/main/core/error-handler.js

const { logger, LogLevel } = require('./logger');

// Custom error classes
class DatabaseError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

class WindowError extends Error {
  constructor(message, windowType) {
    super(message);
    this.name = 'WindowError';
    this.windowType = windowType;
    this.timestamp = new Date().toISOString();
  }
}

class MigrationError extends Error {
  constructor(message, pendingMigrations = []) {
    super(message);
    this.name = 'MigrationError';
    this.pendingMigrations = pendingMigrations;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Setup global error handlers
 * @param {import('electron').BrowserWindow} mainWindow
 */
function setupGlobalErrorHandlers(mainWindow = null) {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:error', {
        type: 'uncaughtException',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason instanceof Error ? reason.message : reason,
    });
  });

  const { app } = require('electron');
  app.on('renderer-process-crashed', (event, webContents, killed) => {
    logger.error('Renderer process crashed:', { killed, webContentsId: webContents.id });
  });
}

module.exports = {
  DatabaseError,
  WindowError,
  MigrationError,
  setupGlobalErrorHandlers,
};