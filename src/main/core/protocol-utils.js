// src/main/core/protocol-utils.js

const { protocol } = require('electron');
const { registerImageProtocol } = require('../protocols/imageProtocol');

/**
 * Register custom schemes - MUST be called BEFORE app is ready
 */
function registerCustomSchemes() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app-image',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: true,
      },
    },
  ]);
}

/**
 * Register custom protocol handlers - MUST be called AFTER app is ready
 */
function registerCustomProtocolHandlers() {
  registerImageProtocol();
}

module.exports = {
  registerCustomSchemes,
  registerCustomProtocolHandlers,
};