#!/bin/bash
# deploy.sh - Script de atualização do Organizador na VPS
# Uso: bash deploy.sh

set -e

echo "=== DEPLOY ORGANIZADOR ==="
echo ""

DEPLOY_DIR="/var/www/organizador"
cd "$DEPLOY_DIR"

echo "[1/4] Baixando as ultimas atualizacoes do GitHub..."
git pull origin 001-mobile-design

echo ""
echo "[2/4] Instalando dependencias do servidor Node.js..."
cd "$DEPLOY_DIR/server"
npm install --production

echo ""
echo "[3/4] Instalando dependencias do agente Python..."
cd "$DEPLOY_DIR/agent"
pip3 install -r requirements.txt -q

echo ""
echo "[4/4] Reiniciando processos com PM2..."
cd "$DEPLOY_DIR"
pm2 startOrRestart ecosystem.config.js
pm2 save

echo ""
echo "=== DEPLOY CONCLUIDO! ==="
echo ""
pm2 list
