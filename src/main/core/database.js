// src/main/core/database.js

const { dialog } = require('electron');
const { logger } = require('./logger');
const MigrationManager = require('../../utils/dbUtils/migrationManager');

/** @type {MigrationManager | null} */
let migrationManager = null;

/** @type {boolean} */
let isDatabaseInitialized = false;

/**
 * Initialize database and run migrations
 * @param {import('electron').BrowserWindow} splashWindow
 */
async function initializeDatabase(splashWindow) {
  const { AppDataSource } = require('../db/data-source.js');
  
  try {
    logger.info('Initializing database...');

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.success('Database connected');
    }

    migrationManager = new MigrationManager(AppDataSource);
    const status = await migrationManager.getMigrationStatus();

    if (status.needsMigration) {
      logger.info(`Found ${status.pending} pending migration(s). Running now...`);

      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('migration:status', {
          status: 'running',
          message: 'Updating database structure...',
        });
      }

      const result = await migrationManager.runMigrations();

      if (result.success) {
        logger.success(result.message);
        if (splashWindow) {
          splashWindow.webContents.send('migration:status', {
            status: 'completed',
            message: result.message,
          });
        }
      } else {
        logger.error('Migration failed:', result.error);
        dialog.showMessageBoxSync({
          type: 'warning',
          title: 'Migration Warning',
          message: 'Database update had an issue',
          detail: result.message + '\n\nContinuing with current schema.',
          buttons: ['OK'],
        });
      }
    } else {
      logger.info('Database is up to date ✅');
    }

    isDatabaseInitialized = true;
    return { success: true };
  } catch (error) {
    logger.error('Database init failed:', error);

    // Fallback: try synchronize
    try {
      await AppDataSource.synchronize(false);
      logger.warn('Used fallback synchronize');
      isDatabaseInitialized = true;
      return { success: true, fallback: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

/**
 * Safely close database connection
 */
async function safeCloseDatabase() {
  const { AppDataSource } = require('../db/data-source.js');
  if (isDatabaseInitialized) {
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        logger.info('Database connection closed gracefully');
        isDatabaseInitialized = false;
      }
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }
}

/**
 * Get database status
 */
async function getDatabaseStatus() {
  const { AppDataSource } = require('../db/data-source.js');
  try {
    const isInitialized = AppDataSource.isInitialized;
    let migrationStatus = null;
    if (migrationManager) {
      migrationStatus = await migrationManager.getMigrationStatus();
    }
    return {
      initialized: isInitialized,
      migrationManager: !!migrationManager,
      migrationStatus,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get database status:', error);
    return { error: error.message };
  }
}

module.exports = {
  initializeDatabase,
  safeCloseDatabase,
  getDatabaseStatus,
  migrationManager,
  isDatabaseInitialized,
};