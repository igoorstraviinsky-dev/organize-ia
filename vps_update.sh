#!/bin/bash
set -e

# Configurações de Caminho
PROJECT_DIR="/root/organizador"
STAGING_DIR="/var/www/organizador"
BRANCH="main"

# Função para a Animação STRAVINSKY
stravinsky_animation() {
  clear
  echo -e "\e[1;35m"
  echo "  ██████  ████████ ██████   █████  ██    ██ ██ ███    ██ ███████ ██   ██ ██    ██ "
  echo " ██          ██    ██   ██ ██   ██ ██    ██ ██ ████   ██ ██      ██  ██   ██  ██  "
  echo "  █████      ██    ██████  ███████ ██    ██ ██ ██ ██  ██ ███████ █████     ████   "
  echo "      ██     ██    ██   ██ ██   ██  ██  ██  ██ ██  ██ ██      ██ ██  ██     ██    "
  echo " ██████      ██    ██   ██ ██   ██   ████   ██ ██   ████ ███████ ██   ██    ██    "
  echo -e "\e[0m"
  echo -e "\e[1;33m                     🔥 STRAVINSKY UPDATE SYSTEM 🔥\e[0m"
  echo "--------------------------------------------------------------------------------"
  sleep 1
}

stravinsky_animation

# 1. Sincronização com o Git
echo -e "\e[1;34m[1/5]\e[0m 📥 Puxando novidades do GitHub..."
cd $PROJECT_DIR
git fetch origin
git reset --hard origin/$BRANCH

# 2. Sincronização de Configurações (.env) - SUA NOVA LÓGICA
echo -e "\e[1;34m[2/5]\e[0m 🔑 Sincronizando arquivos de ambiente..."
cp $STAGING_DIR/server/.env $PROJECT_DIR/server/.env
cp $STAGING_DIR/agent/.env $PROJECT_DIR/agent/.env
echo "✅ Arquivos .env sincronizados com sucesso."

# 3. Update Backend e Frontend
echo -e "\e[1;34m[3/5]\e[0m 🧠 Preparando Server e Build do Client..."
cd "$PROJECT_DIR/server" && npm install --silent
cd "$PROJECT_DIR/client" && npm install --silent && npm run build

# 4. Update Agente Python
echo -e "\e[1;34m[4/5]\e[0m 🤖 Atualizando dependências do Agente..."
cd "$PROJECT_DIR/agent"
source venv/bin/activate && pip install -r requirements.txt --quiet && deactivate

# 5. Reinicialização Total (PM2) - SUA NOVA LÓGICA
echo -e "\e[1;34m[5/5]\e[0m 🔄 Reiniciando serviços e limpando logs..."
cd $PROJECT_DIR
pm2 restart all --update-env
pm2 flush
pm2 save --force

stravinsky_animation
echo -e "\e[1;32m✅ SISTEMA ATUALIZADO E RODANDO LIMPO!\e[0m"
echo "--------------------------------------------------------------------------------"
pm2 list