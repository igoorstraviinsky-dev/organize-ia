#!/bin/bash
# setup.sh - Prepara o ambiente do agente na VPS
# Uso: bash setup.sh

set -e

echo "=== CONFIGURANDO AGENTE PYTHON ==="

# 1. Garantir que estamos na pasta do agente
cd "$(dirname "$0")"

# 2. Criar Virtualenv se não estiver completo
if [ ! -f "venv/bin/python" ] && [ ! -f "venv/bin/python3" ]; then
    echo "[1/3] Virtualenv incompleto ou inexistente. Criando..."
    rm -rf venv
    python3 -m venv venv
else
    echo "[1/3] Virtualenv operacional detectado."
fi

# 3. Instalar dependências no venv
echo "[2/3] Instalando dependências..."
venv/bin/python -m pip install --upgrade pip -q
venv/bin/python -m pip install -r requirements.txt -q

# 4. Verificar se o .env existe
if [ ! -f ".env" ]; then
    echo "[3/3] AVISO: .env não encontrado. Copiando do .env.example..."
    cp .env.example .env
    echo "Configure o seu .env com as chaves do Supabase e OpenAI!"
else
    echo "[3/3] .env encontrado."
fi

echo ""
echo "=== CONFIGURAÇÃO CONCLUÍDA! ==="
echo "Para rodar manualmente: ./venv/bin/python main.py"
echo "O PM2 usará o interpretador: $(pwd)/venv/bin/python"
