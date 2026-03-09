#!/bin/bash
# deploy.sh - Script de Reset e Deploy Completo
# Uso: bash deploy.sh

set -e

echo "=== [1/7] LIMPANDO AMBIENTE ANTIGO ==="
# Para e remove tudo do PM2 para evitar conflitos
pm2 delete all || true
# Mata processos residuais de Node/Vite/Python
pkill -f vite || true
pkill -f node || true
pkill -f python3 || true
echo "Limpeza concluida."

echo ""
echo "=== [2/7] SINCRONIZANDO COM GITHUB ==="
cd /var/www/organizador
git fetch --all
git reset --hard origin/001-mobile-design

echo ""
echo "=== [3/7] ATUALIZANDO FRONTEND (CLIENT) ==="
cd /var/www/organizador/client
npm install
npm run build

echo ""
echo "=== [4/7] ATUALIZANDO BACKEND (SERVER) ==="
cd /var/www/organizador/server
npm install --production

echo ""
echo "=== [5/7] CONFIGURANDO AGENTE PYTHON ==="
cd /var/www/organizador/agent
bash setup.sh

echo ""
echo "=== [6/7] INICIANDO SERVICOS NO PM2 ==="
cd /var/www/organizador
pm2 start ecosystem.config.js --env production
pm2 save

echo ""
echo "=== [7/7] STATUS FINAL ==="
pm2 list
echo ""
echo "Deploy finalizado! Se algo não ligou, use: pm2 logs"
