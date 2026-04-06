module.exports = {
  apps: [{
    name: 'marketing',
    script: '.next/standalone/server.js',
    cwd: '/var/www/marketing',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/www/marketing/logs/error.log',
    out_file: '/var/www/marketing/logs/out.log',
  }]
};
