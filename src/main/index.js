// src/main/index.js (UPDATED with Service Container)

//@ts-check

/**
 * @file Main entry point for Meatify System
 * @version 1.0.0
 * @author CyberArcenal
 * @description Modular Electron main process with DI container
 */

const { loadEnv } = require('./core/load-env');
loadEnv(); // Before anything else

// ===================== CORE IMPORTS =====================
const { app, dialog, BrowserWindow } = require('electron');

// Core modules
const { APP_CONFIG } = require('./core/app-config');
const { ENVIRONMENT, getEnvironmentName } = require('./core/environment');
const { logger } = require('./core/logger');
const { setupGlobalErrorHandlers } = require('./core/error-handler');
const {registerCustomProtocolHandlers, registerCustomSchemes } = require('./core/protocol-utils');
const {
  createSplashWindow,
  createMainWindow,
  showErrorPage,
  mainWindow,
  splashWindow,
} = require('./core/window-manager');
const {
  initializeDatabase,
  safeCloseDatabase,
  // @ts-ignore
  isDatabaseInitialized,
} = require('./core/database');
const { registerIpcHandlers, runSchedulers } = require('./core/ipc-registry');

// Service Container
const { defaultContainer } = require('./core/service-container');
const { registerServices } = require('./core/register-services');
const { registerUpdateModule } = require('./core/register-update-module');

// ===================== REGISTER SCHEMES BEFORE APP READY =====================
registerCustomSchemes();   // ✅ DAPAT NASA TOP-LEVEL



// ===================== GLOBAL STATE =====================
let isShuttingDown = false;

// ===================== MAIN STARTUP =====================

async function startupSequence() {
  try {
    logger.info(`🚀 Starting ${APP_CONFIG.appName} v${APP_CONFIG.version}...`);
    logger.info(`Environment: ${getEnvironmentName()}`);
    logger.info(`User Data Path: ${APP_CONFIG.userDataPath}`);

    // 1. Setup global error handlers
    // @ts-ignore
    setupGlobalErrorHandlers(mainWindow);

    // 2. Register custom protocols
    registerCustomProtocolHandlers();

    // 3. Register services in DI container
    await registerServices(mainWindow, splashWindow);
    defaultContainer.lock();

    // 4. Create splash window
    await createSplashWindow();

    // 5. Initialize database
    // @ts-ignore
    const dbResult = await initializeDatabase(splashWindow);

    if (!dbResult.success) {
      // @ts-ignore
      logger.error('Database initialization failed:', dbResult.message);

      const userChoice = dialog.showMessageBoxSync({
        type: 'warning',
        title: 'Database Warning',
        message: 'Database initialization failed',
        // @ts-ignore
        detail: `${dbResult.message}\n\nApplication may have limited functionality.`,
        buttons: ['Continue Anyway', 'Quit Application'],
        defaultId: 0,
        cancelId: 1,
      });

      if (userChoice === 1) {
        logger.info('User chose to quit due to database error');
        app.quit();
        return;
      }
    }

    // 6. Get services from container
    const printerService = defaultContainer.get('printer');
    const cashDrawerService = defaultContainer.get('cashDrawer');
    // @ts-ignore
    const database = defaultContainer.get('database');

    // 7. Create main window
    // @ts-ignore
    await createMainWindow((window) => {
      // Register IPC handlers with services
      registerIpcHandlers(window, { printerService, cashDrawerService });
      runSchedulers()
    });

    // 8. Log service initialization
    if (APP_CONFIG.isDev) {
      defaultContainer.dump();
    }


    await registerUpdateModule(mainWindow);

    logger.success(`✅ ${APP_CONFIG.appName} started successfully!`);
  } catch (error) {
    logger.error('Startup sequence failed:', error);

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }

    // Only create error window if app is not quitting
    if (!isShuttingDown) {
      const errorWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        frame: true,
        webPreferences: {
          contextIsolation: false,
          nodeIntegration: true,
        },
      });

      showErrorPage(
        errorWindow,
        'Startup Failed',
        'The application failed to start properly.',
        // @ts-ignore
        error.message
      );

      errorWindow.show();
    }
  }
}

// ===================== APPLICATION EVENTS =====================

app.on('ready', startupSequence);

app.on('window-all-closed', async () => {
  logger.info('All windows closed');
  await safeCloseDatabase();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  logger.info('Application activated');

  if (BrowserWindow.getAllWindows().length === 0) {
    await startupSequence();
    
    // ✅ Re-set the updater window reference after creating a new window
    try {
      const updaterModule = require("../main/ipc/utils/updater/index.ipc");
      updaterModule.setMainWindow(mainWindow);
      logger.info("Updater handler re-attached to main window after activate");
    } catch (e) {
      logger.warn("Failed to re-attach updater on activate", e);
    }
  }
});

app.on('before-quit', async (event) => {
  logger.info('Application quitting...');

  if (!isShuttingDown) {
    isShuttingDown = true;
    event.preventDefault();

    try {
      // Clean up services
      const services = defaultContainer.getInitializedInstances();
      for (const [name, instance] of services) {
        if (instance && typeof instance.cleanup === 'function') {
          try {
            await instance.cleanup();
            logger.debug(`Cleaned up service: ${name}`);
          } catch (err) {
            logger.error(`Error cleaning up service ${name}:`, err);
          }
        }
      }
    } catch (error) {
      logger.error('Error during service cleanup:', error);
    }

    await safeCloseDatabase();
    app.quit();
  }
});

app.on('will-quit', () => logger.info('Application will quit'));
app.on('quit', () => {
  logger.info('Application quit');
  process.exit(0);
});

// ===================== EXPORTS =====================
if (APP_CONFIG.isDev) {
  module.exports = {
    APP_CONFIG,
    ENVIRONMENT,
    defaultContainer,
    startupSequence,
    safeCloseDatabase,
  };
}