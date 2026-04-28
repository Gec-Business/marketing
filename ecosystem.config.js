require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
  apps: [{
    name: 'marketing',
    script: '.next/standalone/server.js',
    cwd: '/var/www/marketing',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '1G',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
