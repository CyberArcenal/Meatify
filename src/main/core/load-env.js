// src/main/core/load-env.js
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  // ✅ FIX: Use __dirname to resolve project root
  // In Electron, process.cwd() may not be the app root
  // __dirname is reliable because it's the directory of this file
  const projectRoot = path.resolve(__dirname, '../../..'); // Go up to project root
  
  const envFile = process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development';

  // Try multiple paths for flexibility
  const pathsToTry = [
    path.join(projectRoot, envFile),
    path.join(projectRoot, '.env'),
    path.join(process.cwd(), envFile),
    path.join(process.cwd(), '.env'),
  ];

  let loaded = false;
  for (const envPath of pathsToTry) {
    if (fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath });
      if (!result.error) {
        console.log(`✅ Loaded env from: ${envPath}`);
        loaded = true;
        break;
      }
    }
  }

  if (!loaded) {
    console.warn('⚠️ No .env file found, using defaults');
  }

  // Also load .env.local for local overrides (gitignored)
  const localPaths = [
    path.join(projectRoot, '.env.local'),
    path.join(process.cwd(), '.env.local'),
  ];

  for (const localPath of localPaths) {
    if (fs.existsSync(localPath)) {
      dotenv.config({ path: localPath });
      console.log(`✅ Loaded local override from: ${localPath}`);
      break;
    }
  }
}

module.exports = { loadEnv };