#!/bin/bash

# ==============================================
# STRAVINSKY DEPLOY SYSTEM
# Instalador + Atualizador do Organize IA
# ==============================================

# Configurações
REPO_URL="https://github.com/igoorstraviinsky-dev/organize-ia.git"
INSTALL_DIR="/var/www/organizador"
BRANCH="main"
NODE_VERSION_MIN="18"
PYTHON_VERSION_MIN="3.10"

# ──────────────────────────────────────────────
# ANIMAÇÃO STRAVINSKY
# ──────────────────────────────────────────────
stravinsky_animation() {
  clear
  echo -e "\e[1;35m"
  echo "  ██████  ████████ ██████   █████  ██    ██ ██ ███    ██ ███████ ██   ██ ██    ██ "
  echo " ██          ██    ██   ██ ██   ██ ██    ██ ██ ████   ██ ██      ██  ██   ██  ██  "
  echo "  █████      ██    ██████  ███████ ██    ██ ██ ██ ██  ██ ███████ █████     ████   "
  echo "      ██     ██    ██   ██ ██   ██  ██  ██  ██ ██  ██ ██      ██ ██  ██     ██    "
  echo " ██████      ██    ██   ██ ██   ██   ████   ██ ██   ████ ███████ ██   ██    ██    "
  echo -e "\e[0m"
  echo -e "\e[1;33m                     🔥 STRAVINSKY DEPLOY SYSTEM 🔥\e[0m"
  echo "--------------------------------------------------------------------------------"
  sleep 1
}

# ──────────────────────────────────────────────
# FUNÇÕES UTILITÁRIAS
# ──────────────────────────────────────────────
log_step() { echo -e "\e[1;34m[$1/$2]\e[0m $3"; }
log_ok()   { echo -e "\e[1;32m  ✅ $1\e[0m"; }
log_warn() { echo -e "\e[1;33m  ⚠️  $1\e[0m"; }
log_fail() { echo -e "\e[1;31m  ❌ $1\e[0m"; exit 1; }

# ──────────────────────────────────────────────
# VERIFICAR PRÉ-REQUISITOS DO SISTEMA
# ──────────────────────────────────────────────
check_prerequisites() {
  echo -e "\n\e[1;36m🔍 Verificando pré-requisitos do sistema...\e[0m"

  # Git
  if ! command -v git &>/dev/null; then
    log_warn "Git não encontrado. Instalando..."
    apt-get update -qq && apt-get install -y git &>/dev/null
    log_ok "Git instalado."
  else
    log_ok "Git: $(git --version)"
  fi

  # Node.js
  if ! command -v node &>/dev/null; then
    log_warn "Node.js não encontrado. Instalando v20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &>/dev/null
    apt-get install -y nodejs &>/dev/null
    log_ok "Node.js instalado: $(node -v)"
  else
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -lt "$NODE_VERSION_MIN" ]; then
      log_fail "Node.js v${NODE_VERSION_MIN}+ necessário. Versão instalada: $(node -v)"
    fi
    log_ok "Node.js: $(node -v)"
  fi

  # npm
  if ! command -v npm &>/dev/null; then
    log_fail "npm não encontrado após instalar Node.js."
  fi
  log_ok "npm: $(npm -v)"

  # Python 3
  if ! command -v python3 &>/dev/null; then
    log_warn "Python3 não encontrado. Instalando..."
    apt-get install -y python3 python3-pip python3-venv &>/dev/null
    log_ok "Python instalado: $(python3 --version)"
  else
    log_ok "Python: $(python3 --version)"
  fi

  # PM2
  if ! command -v pm2 &>/dev/null; then
    log_warn "PM2 não encontrado. Instalando globalmente..."
    npm install -g pm2 --silent
    log_ok "PM2 instalado: $(pm2 -v)"
  else
    log_ok "PM2: $(pm2 -v)"
  fi

  # Nginx
  if ! command -v nginx &>/dev/null; then
    log_warn "Nginx não encontrado. Instalando..."
    apt-get install -y nginx &>/dev/null
    log_ok "Nginx instalado."
  else
    log_ok "Nginx: $(nginx -v 2>&1 | head -1)"
  fi

  echo ""
}

# ──────────────────────────────────────────────
# CRIAR ARQUIVOS .ENV INTERATIVOS
# ──────────────────────────────────────────────
configure_env() {
  echo -e "\e[1;36m🔑 Configuração de Variáveis de Ambiente\e[0m"
  echo "--------------------------------------------------------------------------------"

  ENV_SERVER="$INSTALL_DIR/server/.env"
  ENV_AGENT="$INSTALL_DIR/agent/.env"
  ENV_CLIENT="$INSTALL_DIR/client/.env"

  if [ -f "$ENV_SERVER" ]; then
    log_ok "server/.env já existe. Mantendo."
  else
    echo -e "\n\e[1;33mPreencha as credenciais do Supabase e OpenAI:\e[0m"
    read -rp "  SUPABASE_URL: " SUPABASE_URL
    read -rp "  SUPABASE_SERVICE_KEY: " SUPABASE_SERVICE_KEY
    read -rp "  SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
    read -rp "  OPENAI_API_KEY: " OPENAI_API_KEY
    read -rp "  VITE_SERVER_URL [http://seu-ip]: " VITE_SERVER_URL
    
    cat > "$ENV_SERVER" <<EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=gpt-4o

PORT=3001
EOF
    log_ok "server/.env criado."
  fi

  if [ ! -f "$ENV_CLIENT" ]; then
    cat > "$ENV_CLIENT" <<EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
VITE_SERVER_URL=$VITE_SERVER_URL
EOF
    log_ok "client/.env criado."
  fi

  if [ ! -f "$ENV_AGENT" ]; then
    cp "$ENV_SERVER" "$ENV_AGENT"
    cat >> "$ENV_AGENT" <<EOF

# Agente
AGENT_PORT=8005
WEBHOOK_SECRET=organizador_webhook_secret_2024
WAZAPI_URL=http://localhost:5000
WAZAPI_TOKEN=seu_token
WAZAPI_INSTANCE=organizador
EOF
    log_ok "agent/.env criado."
  fi
  echo ""
}

# ──────────────────────────────────────────────
# INSTALAÇÃO COMPLETA
# ──────────────────────────────────────────────
run_install() {
  local TOTAL=8
  stravinsky_animation
  echo -e "\e[1;32m  MODO: INSTALAÇÃO COMPLETA\e[0m"
  echo "--------------------------------------------------------------------------------"
  
  check_prerequisites

  log_step 1 $TOTAL "📥 Clonando repositório..."
  if [ -d "$INSTALL_DIR/.git" ]; then
    log_warn "Diretório já existe. Pulando clone."
  else
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR" || log_fail "Erro ao clonar."
  fi

  log_step 2 $TOTAL "🔑 Configurando .env..."
  configure_env

  log_step 3 $TOTAL "🧠 Buildando Backend..."
  cd "$INSTALL_DIR/server" || exit
  npm install && npm run build
  log_ok "Backend pronto."

  log_step 4 $TOTAL "🎨 Buildando Frontend..."
  cd "$INSTALL_DIR/client" || exit
  npm install && npm run build
  log_ok "Frontend pronto."

  log_step 5 $TOTAL "🤖 Configurando Agente Python..."
  cd "$INSTALL_DIR/agent" || exit
  python3 -m venv venv
  source venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
  deactivate
  log_ok "Agente pronto."

  log_step 6 $TOTAL "⚙️  Configurando PM2..."
  # Garantir logs e ecosystem
  mkdir -p "$INSTALL_DIR/logs"
  # O ecosystem.config.js deve vir do git, se não existir criamos um básico
  if [ ! -f "$INSTALL_DIR/ecosystem.config.js" ]; then
    cat > "$INSTALL_DIR/ecosystem.config.js" <<EOF
module.exports = {
  apps: [
    { name: 'server', cwd: './server', script: 'dist/index.js', env: { NODE_ENV: 'production' } },
    { name: 'agent', cwd: './agent', script: 'main.py', interpreter: './venv/bin/python3' }
  ]
}
EOF
  fi

  log_step 7 $TOTAL "🌐 Configurando Nginx..."
  cat > /etc/nginx/sites-available/organizador <<EOF
server {
    listen 80;
    server_name _;
    root $INSTALL_DIR/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
  ln -sf /etc/nginx/sites-available/organizador /etc/nginx/sites-enabled/organizador
  rm -f /etc/nginx/sites-enabled/default
  systemctl restart nginx

  log_step 8 $TOTAL "🚀 Iniciando PM2..."
  cd "$INSTALL_DIR"
  pm2 startOrRestart ecosystem.config.js --env production
  pm2 save
  log_ok "SISTEMA ONLINE!"
}

# ──────────────────────────────────────────────
# ATUALIZAÇÃO
# ──────────────────────────────────────────────
run_update() {
  local TOTAL=5
  stravinsky_animation
  echo -e "\e[1;33m  MODO: ATUALIZAÇÃO\e[0m"

  log_step 1 $TOTAL "📥 Atualizando código..."
  cd "$INSTALL_DIR"
  git fetch origin
  git reset --hard origin/$BRANCH

  log_step 2 $TOTAL "🧠 Atualizando Server..."
  cd "$INSTALL_DIR/server"
  npm install && npm run build

  log_step 3 $TOTAL "🎨 Atualizando Frontend..."
  cd "$INSTALL_DIR/client"
  npm install && npm run build

  log_step 4 $TOTAL "🤖 Atualizando Agente..."
  cd "$INSTALL_DIR/agent"
  source venv/bin/activate
  pip install -r requirements.txt
  deactivate

  log_step 5 $TOTAL "🔄 Reiniciando..."
  cd "$INSTALL_DIR"
  pm2 restart all --update-env
  log_ok "ATUALIZADO!"
}

# ──────────────────────────────────────────────
# MENU
# ──────────────────────────────────────────────
stravinsky_animation
echo -e "  [1] Instalação Completa"
echo -e "  [2] Atualização Rápida"
echo -e "  [0] Sair"
read -rp "  ➜: " CHOICE

case "$CHOICE" in
  1) run_install ;;
  2) run_update ;;
  *) exit 0 ;;
esac