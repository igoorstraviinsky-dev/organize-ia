#!/bin/bash
set -e

# Configurações de Caminho
PROJECT_DIR="/root/organizador"
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

# 2. Update Backend (Node.js)
echo -e "\e[1;34m[2/5]\e[0m 🧠 Atualizando Backend (Server)..."
cd "$PROJECT_DIR/server"
npm install --silent
pm2 restart organizador-api --update-env

# 3. Update Frontend (React + Vite)
echo -e "\e[1;34m[3/5]\e[0m 💻 Fazendo Build do Frontend (Client)..."
cd "$PROJECT_DIR/client" # ou /var/www/organizador/client conforme sua estrutura
npm install --silent
npm run build
# Nota: Se você usa Nginx para servir a pasta 'dist', o build já reflete na hora.

# 4. Update Agente (Python)
echo -e "\e[1;34m[4/5]\e[0m 🤖 Atualizando Agente (Python)..."
cd "$PROJECT_DIR/agent"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate
pm2 restart organizador-agente --update-env

# 5. Finalização
echo -e "\e[1;34m[5/5]\e[0m 🏁 Salvando estado do PM2..."
pm2 save --force

stravinsky_animation
echo -e "\e[1;32m✅ SISTEMA ATUALIZADO COM SUCESSO!\e[0m"
echo "--------------------------------------------------------------------------------"
pm2 list