#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Iniciando atualização total do sistema..."
echo "📁 Diretório: $PROJECT_DIR"

# 1. Limpar cache e atualizar código
echo "🧹 Limpando caches..."
rm -rf "$PROJECT_DIR/agent/__pycache__"

echo "📥 Baixando atualizações do GitHub..."
cd "$PROJECT_DIR"
git fetch origin
git reset --hard origin/001-mobile-design

# 2. Atualizar Cérebro (Node.js)
echo "🧠 Atualizando o Cérebro (Node.js)..."
cd "$PROJECT_DIR/server"
npm install --silent

pm2 restart organizador-api 2>/dev/null || \
  pm2 start src/index.js \
    --name organizador-api \
    --cwd "$PROJECT_DIR/server"

# 3. Atualizar Corpo (Python)
echo "🦾 Atualizando o Corpo (Python)..."
cd "$PROJECT_DIR/agent"

if [ ! -d "venv" ]; then
  echo "📦 Criando ambiente virtual..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt --quiet

# Remove processo antigo para garantir que o novo código seja carregado
pm2 delete organizador-agente 2>/dev/null || true

pm2 start main.py \
  --name organizador-agente \
  --interpreter "$PROJECT_DIR/agent/venv/bin/python" \
  --cwd "$PROJECT_DIR/agent"

echo ""
echo "✅ Sistema atualizado e rodando!"
pm2 list
