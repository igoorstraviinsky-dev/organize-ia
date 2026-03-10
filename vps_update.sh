#!/bin/bash
set -e

REPO_URL="https://github.com/igoorstraviinsky-dev/organize-ia.git"
BRANCH="main"
PROJECT_DIR="/root/organizador"

echo "================================================"
echo " Organizador - Atualizacao do Sistema"
echo "================================================"

# 1. Clonar o repositorio se ainda nao existir
if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "[1/4] Projeto nao encontrado. Clonando repositorio..."
  git clone -b "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
else
  echo "[1/4] Atualizando codigo do GitHub..."
  rm -rf "$PROJECT_DIR/agent/__pycache__"
  cd "$PROJECT_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH"
fi

# 2. Verificar arquivos .env
echo "[2/4] Verificando configuracoes..."
if [ ! -f "$PROJECT_DIR/server/.env" ]; then
  echo "  ATENCAO: server/.env nao encontrado. Configure antes de continuar."
fi
if [ ! -f "$PROJECT_DIR/agent/.env" ]; then
  echo "  ATENCAO: agent/.env nao encontrado. Configure antes de continuar."
fi

# 3. Atualizar e reiniciar o Cerebro (Node.js)
echo "[3/4] Atualizando Cerebro (Node.js)..."
cd "$PROJECT_DIR/server"
npm install --silent

if pm2 describe organizador-api > /dev/null 2>&1; then
  pm2 restart organizador-api
else
  pm2 start src/index.js \
    --name organizador-api \
    --cwd "$PROJECT_DIR/server"
fi

# 4. Atualizar e reiniciar o Corpo (Python)
echo "[4/4] Atualizando Corpo (Python)..."
cd "$PROJECT_DIR/agent"

if [ ! -d "venv" ]; then
  echo "  Criando ambiente virtual Python..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt --quiet

pm2 delete organizador-agente 2>/dev/null || true
pm2 start main.py \
  --name organizador-agente \
  --interpreter "$PROJECT_DIR/agent/venv/bin/python" \
  --cwd "$PROJECT_DIR/agent"

pm2 save

echo ""
echo "================================================"
echo " Sistema atualizado e rodando!"
echo "================================================"
pm2 list
