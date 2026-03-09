#!/bin/bash
# deploy.sh - Script de Reset Total e Deploy (Site + Agente)
# Este script para tudo, limpa tudo e inicia do zero para garantir funcionamento.

set -e

echo "=== [1/7] LIMPEZA TOTAL DE PROCESSOS ==="
# Para e remove processos do PM2
pm2 delete all || true
# Mata processos "fantasmas" que podem estar travando as portas
pkill -f node || true
pkill -f vite || true
pkill -f python3 || true
# Limpa logs do PM2 para começar do zero
pm2 flush
echo "Ambiente limpo."

echo ""
echo "=== [2/7] ATUALIZANDO CODIGO (GITHUB) ==="
cd /var/www/organizador
git fetch --all
git reset --hard origin/001-mobile-design
echo "Codigo atualizado na branch 001-mobile-design."

echo ""
echo "=== [3/7] CONFIGURANDO SISTEMA (DEPS) ==="
# Garante pacotes necessarios para o venv e pip na VPS
apt-get update -qq
apt-get install -y python3-pip python3-venv -qq || true
echo "Dependencias de sistema verificadas."

echo ""
echo "=== [4/7] BUILD DO FRONTEND (CLIENT) ==="
cd /var/www/organizador/client
npm install
npm run build
echo "Frontend pronto."

echo ""
echo "=== [5/7] BUILD DO BACKEND (SERVER) ==="
cd /var/www/organizador/server
npm install --production
echo "Backend pronto."

echo ""
echo "=== [6/7] CONFIGURANDO AGENTE PYTHON ==="
cd /var/www/organizador/agent
# O setup.sh agora lida com a criacao correta do venv
bash setup.sh
echo "Agente pronto."

echo ""
echo "=== [7/7] INICIANDO SERVICOS NO PM2 ==="
cd /var/www/organizador
pm2 start ecosystem.config.js --env production
pm2 save

echo ""
echo "=========================================="
echo "   DEPLOY FINALIZADO COM SUCESSO!         "
echo "=========================================="
pm2 list
echo ""
echo "Dica: Use 'pm2 logs' para ver o sistema rodando."
