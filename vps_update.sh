#!/bin/bash

# Script de Atualização Unificada - Organizador (Cérebro-Corpo)
# Executar na raiz do projeto na VPS: bash vps_update.sh

echo "🚀 Iniciando atualização total do sistema..."

# 1. Limpar conflitos de cache do Git
echo "🧹 Limpando caches e resolvendo conflitos..."
rm -rf agent/__pycache__
git fetch origin
git reset --hard origin/001-mobile-design

# 2. Atualizar código
echo "📥 Baixando novas atualizações do GitHub..."
git pull origin 001-mobile-design

# 3. Atualizar Cérebro (Node.js)
echo "🧠 Atualizando o Cérebro (Node.js)..."
cd server
npm install
pm2 restart organizador-api || pm2 start src/index.js --name organizador-api
cd ..

# 4. Atualizar Corpo (Python)
echo "🦾 Atualizando o Corpo (Python)..."
cd agent
if [ ! -d "venv" ]; then
    echo "📦 Criando ambiente virtual..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
pm2 restart organizador-agente || pm2 start main.py --name organizador-agente --interpreter ./venv/bin/python
cd ..

echo "✅ Sistema atualizado e ligado com sucesso!"
pm2 list
