// ecosystem.config.js
// Configure o PM2 para gerenciar o servidor Node.js e o agente Python.
// Uso: pm2 startOrRestart ecosystem.config.js

module.exports = {
  apps: [
    {
      // Servidor backend Node.js
      name: "organizador-api",
      script: "src/index.js",
      cwd: "/var/www/organizador/server",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      // Agente Python (WhatsApp/Telegram)
      name: "organizador-agente",
      script: "main.py",
      interpreter: "/var/www/organizador/agent/venv/bin/python",
      cwd: "/var/www/organizador/agent",
      env: {
        PYTHONIOENCODING: "utf-8",
        PYTHONUNBUFFERED: "1",
        NODE_ENV: "development",
      },
      env_production: {
        PYTHONIOENCODING: "utf-8",
        PYTHONUNBUFFERED: "1",
        NODE_ENV: "production",
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
