// ecosystem.config.js
// Configure o PM2 para gerenciar o servidor Node.js e o agente Python.
// Uso: pm2 startOrRestart ecosystem.config.js

module.exports = {
  apps: [
    {
      // Servidor backend Node.js
      name: "organizador-api",
      script: "./server/src/index.js",
      cwd: "/var/www/organizador",
      env: {
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
      interpreter: "/usr/bin/python3",
      cwd: "/var/www/organizador/agent",
      env: {
        PYTHONIOENCODING: "utf-8",
        PYTHONUNBUFFERED: "1",
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
