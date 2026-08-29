// src/main/core/window-manager.js

const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

const { APP_CONFIG } = require('./app-config');
const { logger } = require('./logger');
const { WindowError } = require('./error-handler');

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {BrowserWindow | null} */
let splashWindow = null;

/**
 * Get icon path based on platform
 */
function getIconPath() {
  const platform = process.platform;
  const iconDir = APP_CONFIG.isDev
    ? path.resolve(__dirname, '..', '..', 'build')
    : path.join(process.resourcesPath, 'build');

  const iconMap = {
    win32: 'icon.ico',
    darwin: 'icon.icns',
    linux: 'icon.png',
  };
  const iconFile = iconMap[platform] || 'icon.png';
  const iconPath = path.join(iconDir, iconFile);
  return fs.existsSync(iconPath) ? iconPath : null;
}

/**
 * Create splash window
 */
async function createSplashWindow() {
  try {
    logger.info('Creating splash window...');

    const splashConfig = {
      width: APP_CONFIG.splash.width,
      height: APP_CONFIG.splash.height,
      transparent: APP_CONFIG.splash.transparent,
      backgroundColor: APP_CONFIG.splash.backgroundColor,
      frame: false,
      alwaysOnTop: true,
      center: true,
      resizable: false,
      movable: true,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '..', 'preload.js'),
      },
    };

    splashWindow = new BrowserWindow(splashConfig);

    const splashPath = path.join(__dirname, '..', 'splash.html');
    if (!fs.existsSync(splashPath)) {
      throw new WindowError('Splash HTML file not found', 'splash');
    }

    await splashWindow.loadFile(splashPath);
    splashWindow.show();

    logger.success('Splash window created');
    return splashWindow;
  } catch (error) {
    throw new WindowError(`Failed to create splash window: ${error.message}`, 'splash');
  }
}

/**
 * Get application URL
 */
async function getAppUrl() {
  if (APP_CONFIG.isDev) {
    return 'http://localhost:5173';
  }

  const possiblePaths = [
    path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.html'),
    path.join(process.resourcesPath, 'dist', 'index.html'),
    path.join(require('electron').app.getAppPath(), 'dist', 'index.html'),
  ];

  for (const filePath of possiblePaths) {
    try {
      const fs = require('fs').promises;
      await fs.access(filePath);
      return url.pathToFileURL(filePath).href;
    } catch {
      continue;
    }
  }

  throw new Error(`Production build not found. Checked paths:\n${possiblePaths.join('\n')}`);
}

/**
 * Create main application window
 * @param {Function} onBeforeShow - Called before showing main window
 */
async function createMainWindow(onBeforeShow) {
  try {
    logger.info('Creating main window...');

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const windowWidth = Math.min(APP_CONFIG.window.width, screenWidth - 100);
    const windowHeight = Math.min(APP_CONFIG.window.height, screenHeight - 100);
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = Math.floor((screenHeight - windowHeight) / 2);

    const windowConfig = {
      width: windowWidth,
      height: windowHeight,
      x,
      y,
      minWidth: APP_CONFIG.window.minWidth,
      minHeight: APP_CONFIG.window.minHeight,
      show: false,
      frame: APP_CONFIG.window.frame,
      titleBarStyle: 'default',
      backgroundColor: APP_CONFIG.window.backgroundColor,
      icon: getIconPath(),
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: !APP_CONFIG.isDev,
        sandbox: true,
        enableRemoteModule: false,
      },
    };

    mainWindow = new BrowserWindow(windowConfig);
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setTitle(`${APP_CONFIG.appName} v${APP_CONFIG.version}`);

    // Wait for renderer-ready signal
    let isSplashClosed = false;

    const closeSplashAndShowMain = () => {
      if (isSplashClosed) return;
      isSplashClosed = true;

      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        if (onBeforeShow) onBeforeShow(mainWindow);
        mainWindow.show();
        mainWindow.focus();
        logger.success('Main window shown after renderer ready');
      }
    };

    mainWindow.once('ready-to-show', () => {
      logger.info('Main window ready-to-show, waiting for renderer-ready signal...');

      const timeoutId = setTimeout(() => {
        logger.warn('Renderer-ready timeout reached, closing splash anyway');
        closeSplashAndShowMain();
      }, APP_CONFIG.rendererReadyTimeout);

      ipcMain.once('app:renderer-ready', (event) => {
        if (event.sender === mainWindow.webContents) {
          logger.info('Received renderer-ready signal from React app');
          clearTimeout(timeoutId);
          closeSplashAndShowMain();
        }
      });
    });

    const appUrl = await getAppUrl();
    logger.info(`Loading URL: ${appUrl}`);
    await mainWindow.loadURL(appUrl);

    if (APP_CONFIG.isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    return mainWindow;
  } catch (error) {
    throw new WindowError(`Failed to create main window: ${error.message}`, 'main');
  }
}

/**
 * Show error page
 */
function showErrorPage(window, title, message, details = '') {
  const errorHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - ${APP_CONFIG.appName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
          color: #f5f5f5;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 40px;
          margin: 0;
        }
        .error-container {
          max-width: 600px;
          background: rgba(212, 175, 55, 0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(212, 175, 55, 0.2);
        }
        h1 { margin-bottom: 20px; font-size: 28px; color: #d4af37; }
        .message { font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
        .details {
          background: rgba(0,0,0,0.4);
          padding: 15px;
          border-radius: 10px;
          font-family: monospace;
          font-size: 12px;
          text-align: left;
          overflow: auto;
          max-height: 200px;
          margin: 20px 0;
          color: #f5f5f5;
        }
        .button-group {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 30px;
        }
        button {
          padding: 12px 24px;
          border: none;
          border-radius: 25px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 120px;
        }
        .retry-btn {
          background: #d4af37;
          color: #000000;
        }
        .retry-btn:hover {
          background: #b8860b;
          transform: translateY(-2px);
        }
        .close-btn {
          background: #ff4c4c;
          color: #ffffff;
        }
        .close-btn:hover {
          background: #dc2626;
          transform: translateY(-2px);
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          color: #d4af37;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <div class="logo">${APP_CONFIG.appName}</div>
        <h1>⚠️ ${title}</h1>
        <div class="message">${message}</div>
        ${details ? `<div class="details">${details}</div>` : ''}
        <div class="button-group">
          <button class="retry-btn" onclick="window.location.reload()">Retry</button>
          <button class="close-btn" onclick="window.close()">Close</button>
        </div>
        <div style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
          v${APP_CONFIG.version} • ${APP_CONFIG.isDev ? 'Development' : 'Production'}
        </div>
      </div>
    </body>
    </html>
  `;

  window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
}

module.exports = {
  mainWindow,
  splashWindow,
  createSplashWindow,
  createMainWindow,
  showErrorPage,
  getIconPath,
};