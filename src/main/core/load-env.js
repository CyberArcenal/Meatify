// src/main/core/load-env.js (optional)
const dotenv = require('dotenv');
const path = require('path');

function loadEnv() {
  const envFile = process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development';

  const envPath = path.join(process.cwd(), envFile);
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.warn('No .env file found, using defaults');
  }

  // Also load .env.local for local overrides (gitignored)
  const localPath = path.join(process.cwd(), '.env.local');
  if (require('fs').existsSync(localPath)) {
    dotenv.config({ path: localPath });
  }
}

module.exports = { loadEnv };