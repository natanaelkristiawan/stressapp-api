// Used only when the configured API process does not already exist.
// Existing PM2 processes are reloaded by name, preserving their process configuration.
module.exports = {
  apps: [
    {
      name: process.env.API_PM2_NAME || 'stressapp-api',
      cwd: __dirname,
      script: './dist/main.js',
      env: { NODE_ENV: 'production' },
    },
  ],
};
