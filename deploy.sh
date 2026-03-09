#!/bin/bash
# deploy.sh - Script de atualização completa do Organizador
# Uso: bash deploy.sh

set -e

echo "=== INICIANDO DEPLOY COMPLETO ==="
echo ""

DEPLOY_DIR="/var/www/organizador"
cd "$DEPLOY_DIR"

echo "[1/6] Sincronizando com GitHub (Branch: 001-mobile-design)..."
git pull origin 001-mobile-design

echo ""
echo "[2/6] Atualizando Frontend (Client)..."
cd "$DEPLOY_DIR/client"
npm install
npm run build

echo ""
echo "[3/6] Atualizando Backend (Server)..."
cd "$DEPLOY_DIR/server"
npm install --production

echo ""
echo "[4/6] Configurando Agente Python (venv e dependencias)..."
cd "$DEPLOY_DIR/agent"
bash setup.sh

echo ""
echo "[5/6] Reiniciando Servicos no PM2..."
cd "$DEPLOY_DIR"
# O startOrRestart resolve o erro de "Process not found"
pm2 startOrRestart ecosystem.config.js --env production
pm2 save

echo ""
echo "=== DEPLOY FINALIZADO COM SUCESSO! ==="
echo ""
pm2 list
