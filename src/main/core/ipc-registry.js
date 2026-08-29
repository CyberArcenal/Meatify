// src/main/core/ipc-registry.js

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const { logger } = require('./logger');

/**
 * Register all IPC handlers
 * @param {import('electron').BrowserWindow} mainWindow
 * @param {Object} services - Service instances (printer, cashDrawer, etc.)
 */
function registerIpcHandlers(mainWindow, services) {
  logger.info('Registering IPC handlers...');

  const { printerService, cashDrawerService } = services;

  // ========== WINDOW CONTROLS ==========
  ipcMain.on('window:minimize', () => { if (mainWindow) mainWindow.minimize(); });
  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => {
    logger.warn('📨 IPC window:close received from renderer');
    if (mainWindow) mainWindow.close();
  });
  ipcMain.on('window:reload', () => { if (mainWindow) mainWindow.reload(); });
  ipcMain.on('window:toggle-devtools', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });

  // ========== APPLICATION INFO ==========
  const { APP_CONFIG } = require('./app-config');
  ipcMain.handle('app:get-info', () => ({
    name: APP_CONFIG.appName,
    version: APP_CONFIG.version,
    isDev: APP_CONFIG.isDev,
    platform: process.platform,
    arch: process.arch,
    userDataPath: APP_CONFIG.userDataPath,
    databaseReady: require('./database').isDatabaseInitialized,
  }));

  // ========== PRINTER & CASH DRAWER ==========
  ipcMain.handle('printer:get-status', () => printerService.getStatus());
  ipcMain.handle('printer:is-available', () => printerService.isAvailable());
  ipcMain.handle('printer:reload', () => {
    const PrinterService = require('../../services/Printer');
    const newPrinter = new PrinterService();
    Object.assign(printerService, newPrinter);
    return printerService.getStatus();
  });
  ipcMain.handle('printer:print', async (event, sale) => {
    return await printerService.printReceipt(sale);
  });
  ipcMain.handle('printer:test-print', async () => {
    try {
      const testSale = {
        id: 'TEST',
        saleItems: [{ product: { name: 'Test Item' }, quantity: 1, lineTotal: 0 }],
        totalAmount: 0,
        paymentMethod: 'N/A',
      };
      return await printerService.printReceipt(testSale);
    } catch (err) {
      console.error('[IPC] Test print failed:', err.message);
      return false;
    }
  });

  ipcMain.handle('cashDrawer:get-status', () => cashDrawerService.getStatus());
  ipcMain.handle('cashDrawer:is-available', () => cashDrawerService.isAvailable());
  ipcMain.handle('cashDrawer:reload', () => {
    const CashDrawerService = require('../../services/CashDrawer');
    const newDrawer = new CashDrawerService();
    Object.assign(cashDrawerService, newDrawer);
    return cashDrawerService.getStatus();
  });
  ipcMain.handle('cashDrawer:open', async (event, reason) => {
    return await cashDrawerService.openDrawer(reason);
  });

  // ========== DATABASE ==========
  ipcMain.handle('database:get-status', require('./database').getDatabaseStatus);
  ipcMain.handle('database:backup', async () => {
    const { migrationManager } = require('./database');
    if (!migrationManager) {
      throw new Error('Migration manager not initialized');
    }
    const backupPath = await migrationManager.createBackup();
    return { success: true, backupPath };
  });

  // ========== EXTERNAL LINKS ==========
  const { shell } = require('electron');
  ipcMain.handle('open-external', async (event, url) => {
    if (typeof url === 'string' && url.startsWith('http')) {
      await shell.openExternal(url);
    }
  });

  // ========== LOAD MODULAR IPC MODULES ==========
  loadIpcModules();

  logger.success('✅ All IPC handlers registered successfully');
}

/**
 * Load all modular IPC modules from ipc/ directory
 */
function loadIpcModules() {
  const baseDir = path.join(__dirname, '..');
  
  // Define which modules to load (customize per project)
  const moduleConfigs = {
    // Core Services
    core: [
      'auditLog',
      'batch',
      'meat',
      'category',
      'supplier',
      'customer',
      'inventoryMovement',
      'loyaltyTransaction',
      'notification',
      'notificationLog',
      'purchase',
      'purchaseItem',
      'sale',
      'saleItem',
      'returnRefund',
      'returnRefundItem',
    ],
    // Analytics
    analytics: [
      'dashboard',
      'customerInsights',
      'dailySales',
      'financialReports',
      'inventoryReports',
      'returnRefundReports',
      'salesReport',
    ],
    // Utilities
    utils: [
      'system_config',
      'windows_control',
      'updater',
    ],
  };

  // Build module paths
  const modulePaths = [
    ...moduleConfigs.core.map(m => `./ipc/core/${m}/index.ipc.js`),
    ...moduleConfigs.analytics.map(m => `./ipc/analytics/${m}/index.ipc.js`),
    ...moduleConfigs.utils.map(m => `./ipc/utils/${m}/index.ipc.js`),
  ];

  // Remove duplicates (fixes the duplicate dailySales issue)
  const uniquePaths = [...new Set(modulePaths)];

  for (const modulePath of uniquePaths) {
    try {
      const fullPath = path.join(baseDir, modulePath);
      if (fs.existsSync(fullPath)) {
        require(fullPath);
        logger.debug(`✅ Loaded IPC module: ${modulePath}`);
      } else {
        logger.warn(`⚠️ IPC module not found: ${modulePath}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to load IPC module ${modulePath}:`, error);
    }
  }
}

module.exports = { registerIpcHandlers };