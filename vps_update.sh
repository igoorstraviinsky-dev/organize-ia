#!/bin/bash

set -e

# ==============================================
# STRAVINSKY DEPLOY SYSTEM
# Instalador + Atualizador do Organize IA
# ==============================================

# Configurações
REPO_URL="https://github.com/igoorstraviinsky-dev/organize-ia.git"
INSTALL_DIR="/var/www/organizador"
LEGACY_INSTALL_DIR="/root/organize-ia"
BRANCH="main"
NODE_VERSION_MIN="18"
PYTHON_VERSION_MIN="3.10"
API_PORT="3001"
AGENT_PORT="8005"

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

ensure_root() {
  if [ "$(id -u)" -ne 0 ]; then
    log_fail "Execute este script como root."
  fi
}

get_env_value() {
  local file="$1"
  local key="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  grep -m1 "^${key}=" "$file" | cut -d= -f2- || true
}

append_env_if_missing() {
  local file="$1"
  local key="$2"
  local value="$3"

  if [ ! -f "$file" ]; then
    return 0
  fi

  if ! grep -q "^${key}=" "$file"; then
    echo "${key}=${value}" >> "$file"
  fi
}

prepare_install_dir() {
  mkdir -p "$(dirname "$INSTALL_DIR")"

  if [ -d "$LEGACY_INSTALL_DIR/.git" ] && [ ! -d "$INSTALL_DIR/.git" ] && [ ! -e "$INSTALL_DIR" ]; then
    log_warn "Instalação antiga encontrada em $LEGACY_INSTALL_DIR. Migrando para $INSTALL_DIR..."
    mv "$LEGACY_INSTALL_DIR" "$INSTALL_DIR"
    log_ok "Instalação migrada para $INSTALL_DIR."
  fi
}

ensure_installation() {
  prepare_install_dir
  if [ ! -d "$INSTALL_DIR/.git" ]; then
    log_fail "Instalação não encontrada em $INSTALL_DIR. Rode primeiro a opção 1."
  fi
}

configure_nginx() {
  cat > /etc/nginx/sites-available/organizador <<NGINXCONF
server {
    listen 80;
    server_name _;

    root $INSTALL_DIR/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    location = /agent {
        return 301 /agent/;
    }

    location /agent/ {
        proxy_pass http://127.0.0.1:$AGENT_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXCONF

  ln -sf /etc/nginx/sites-available/organizador /etc/nginx/sites-enabled/organizador
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable nginx >/dev/null 2>&1 || true
  systemctl reload nginx || systemctl restart nginx
}

check_health_url() {
  local label="$1"
  local url="$2"

  if curl -fsS --max-time 10 "$url" >/dev/null 2>&1; then
    log_ok "$label respondendo em $url"
  else
    log_warn "$label não respondeu em $url"
  fi
}

# ──────────────────────────────────────────────
# VERIFICAR PRÉ-REQUISITOS DO SISTEMA
# ──────────────────────────────────────────────
check_prerequisites() {
  echo -e "\n\e[1;36m🔍 Verificando pré-requisitos do sistema...\e[0m"

  prepare_install_dir

  if ! command -v git &>/dev/null; then
    log_warn "Git não encontrado. Instalando..."
    apt-get update -qq
    apt-get install -y git &>/dev/null
    log_ok "Git instalado."
  else
    log_ok "Git: $(git --version)"
  fi

  if ! command -v curl &>/dev/null; then
    log_warn "curl não encontrado. Instalando..."
    apt-get update -qq
    apt-get install -y curl &>/dev/null
    log_ok "curl instalado."
  fi

  if ! command -v node &>/dev/null; then
    log_warn "Node.js não encontrado. Instalando v20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &>/dev/null
    apt-get install -y nodejs &>/dev/null
    log_ok "Node.js instalado: $(node -v)"
  else
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -lt "$NODE_VERSION_MIN" ]; then
      log_warn "Node.js abaixo da versão mínima. Atualizando para Node 20 LTS..."
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &>/dev/null
      apt-get install -y nodejs &>/dev/null
    fi
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -lt "$NODE_VERSION_MIN" ]; then
      log_fail "Node.js v${NODE_VERSION_MIN}+ necessário. Versão instalada: $(node -v)"
    fi
    log_ok "Node.js: $(node -v)"
  fi

  if ! command -v npm &>/dev/null; then
    log_fail "npm não encontrado após instalar Node.js."
  fi
  log_ok "npm: $(npm -v)"

  if ! command -v python3 &>/dev/null; then
    log_warn "Python3 não encontrado. Instalando..."
    apt-get update -qq
    apt-get install -y python3 python3-pip python3-venv &>/dev/null
    log_ok "Python instalado: $(python3 --version)"
  else
    if ! python3 -m pip --version &>/dev/null || ! python3 -m venv --help &>/dev/null; then
      log_warn "python3-pip ou python3-venv ausentes. Instalando..."
      apt-get update -qq
      apt-get install -y python3-pip python3-venv &>/dev/null
    fi
    log_ok "Python: $(python3 --version)"
  fi

  if ! command -v pm2 &>/dev/null; then
    log_warn "PM2 não encontrado. Instalando globalmente..."
    npm install -g pm2 --silent
    log_ok "PM2 instalado: $(pm2 -v)"
  else
    log_ok "PM2: $(pm2 -v)"
  fi

  if ! command -v nginx &>/dev/null; then
    log_warn "Nginx não encontrado. Instalando..."
    apt-get update -qq
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

  local ENV_SERVER="$INSTALL_DIR/server/.env"
  local ENV_CLIENT="$INSTALL_DIR/client/.env"
  local ENV_AGENT="$INSTALL_DIR/agent/.env"

  mkdir -p "$INSTALL_DIR/server" "$INSTALL_DIR/client" "$INSTALL_DIR/agent"

  if [ -f "$ENV_SERVER" ]; then
    log_ok ".env do server já existe. Mantendo configuração atual."
  else
    echo -e "\n\e[1;33mPreencha as credenciais do Supabase e OpenAI:\e[0m"
    read -rp "  SUPABASE_URL: " SUPABASE_URL
    read -rp "  SUPABASE_SERVICE_KEY: " SUPABASE_SERVICE_KEY
    read -rp "  OPENAI_API_KEY: " OPENAI_API_KEY
    read -rp "  OPENAI_MODEL [gpt-4o]: " OPENAI_MODEL
    OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o}

    cat > "$ENV_SERVER" <<EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY

OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=$OPENAI_MODEL

WHATSAPP_TOKEN=your-whatsapp-access-token
WHATSAPP_VERIFY_TOKEN=your-custom-verify-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

PORT=$API_PORT
EOF
    log_ok "server/.env criado."
  fi

  append_env_if_missing "$ENV_SERVER" "OPENAI_MODEL" "gpt-4o"
  append_env_if_missing "$ENV_SERVER" "PORT" "$API_PORT"

  if [ -f "$ENV_CLIENT" ]; then
    log_ok ".env do client já existe. Mantendo configuração atual."
  else
    local SUPABASE_URL_CLIENT
    local SUPABASE_ANON_KEY
    local VITE_SERVER_URL

    SUPABASE_URL_CLIENT="$(get_env_value "$ENV_SERVER" "SUPABASE_URL")"

    echo -e "\n\e[1;33mPreencha as credenciais do frontend:\e[0m"
    read -rp "  VITE_SUPABASE_URL [$SUPABASE_URL_CLIENT]: " VITE_SUPABASE_URL
    VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-$SUPABASE_URL_CLIENT}
    read -rp "  VITE_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
    read -rp "  VITE_SERVER_URL [deixe vazio para mesmo domínio]: " VITE_SERVER_URL

    cat > "$ENV_CLIENT" <<EOF
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
VITE_SERVER_URL=$VITE_SERVER_URL
EOF
    log_ok "client/.env criado."
  fi

  append_env_if_missing "$ENV_CLIENT" "VITE_SUPABASE_URL" "$(get_env_value "$ENV_SERVER" "SUPABASE_URL")"
  append_env_if_missing "$ENV_CLIENT" "VITE_SERVER_URL" ""

  if ! grep -q "^VITE_SUPABASE_ANON_KEY=" "$ENV_CLIENT"; then
    log_warn "VITE_SUPABASE_ANON_KEY ausente no client/.env. O frontend pode não autenticar."
  fi

  if [ -f "$ENV_AGENT" ]; then
    log_ok ".env do agente já existe. Mantendo configuração atual."
  else
    cp "$ENV_SERVER" "$ENV_AGENT"
    echo "" >> "$ENV_AGENT"
    cat >> "$ENV_AGENT" <<EOF

# Agente
AGENT_PORT=$AGENT_PORT
WEBHOOK_SECRET=organizador_webhook_secret_2024

# WazAPI (WhatsApp)
WAZAPI_URL=http://localhost:5000
WAZAPI_TOKEN=seu_token_aqui
WAZAPI_INSTANCE=organizador

# Cérebro Node.js
BRAIN_URL=http://localhost:$API_PORT/api/agent/process
EOF
    log_ok "agent/.env criado."
  fi

  append_env_if_missing "$ENV_AGENT" "AGENT_PORT" "$AGENT_PORT"
  append_env_if_missing "$ENV_AGENT" "BRAIN_URL" "http://localhost:$API_PORT/api/agent/process"
  echo ""
}

clone_repository_if_needed() {
  prepare_install_dir

  if [ -d "$INSTALL_DIR/.git" ]; then
    log_warn "Pasta $INSTALL_DIR já tem um repositório. Pulando clone."
  else
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    log_ok "Repositório clonado em $INSTALL_DIR"
  fi
}

setup_agent() {
  cd "$INSTALL_DIR/agent"
  if [ -f "setup.sh" ]; then
    bash setup.sh
  else
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    deactivate
  fi
  log_ok "Agente Python configurado."
}

start_services() {
  cd "$INSTALL_DIR"
  pm2 startOrRestart ecosystem.config.js --env production --update-env
  pm2 save --force
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
  log_ok "Serviços iniciados no PM2."
}

run_health_checks() {
  echo ""
  echo -e "\e[1;36m📡 Verificando saúde dos serviços...\e[0m"
  echo "--------------------------------------------------------------------------------"
  check_health_url "Backend direto" "http://127.0.0.1:$API_PORT/api/health"
  check_health_url "Agente direto" "http://127.0.0.1:$AGENT_PORT/health"
  check_health_url "Backend via proxy" "http://127.0.0.1/api/health"
  check_health_url "Agente via proxy" "http://127.0.0.1/agent/health"
}

# ──────────────────────────────────────────────
# INSTALAÇÃO COMPLETA (PRIMEIRA VEZ)
# ──────────────────────────────────────────────
run_install() {
  local TOTAL=8

  stravinsky_animation
  echo -e "\e[1;32m  MODO: INSTALAÇÃO COMPLETA\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  log_step 1 $TOTAL "🔐 Validando privilégios e pré-requisitos..."
  ensure_root
  check_prerequisites

  log_step 2 $TOTAL "📥 Clonando repositório do GitHub..."
  clone_repository_if_needed

  log_step 3 $TOTAL "🔑 Configurando variáveis de ambiente..."
  configure_env

  log_step 4 $TOTAL "🧠 Instalando dependências do Backend (Node.js)..."
  cd "$INSTALL_DIR/server" && npm install --silent
  log_ok "Dependências do server instaladas."

  log_step 5 $TOTAL "🎨 Buildando Frontend (React/Vite)..."
  cd "$INSTALL_DIR/client" && npm install --silent && npm run build
  log_ok "Frontend buildado com sucesso."

  log_step 6 $TOTAL "🤖 Configurando Agente Python..."
  setup_agent

  log_step 7 $TOTAL "🌐 Configurando Nginx para o frontend e proxy..."
  configure_nginx
  log_ok "Nginx configurado e recarregado."

  log_step 8 $TOTAL "🚀 Iniciando serviços com PM2..."
  start_services

  stravinsky_animation
  echo -e "\e[1;32m  ✅ INSTALAÇÃO COMPLETA COM SUCESSO!\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo -e "  📦 Projeto instalado em: \e[1;36m$INSTALL_DIR\e[0m"
  echo -e "  🌍 Acesse pelo IP do servidor na porta 80"
  echo -e "  📊 Status dos processos:"
  echo ""
  pm2 list
  run_health_checks
}

# ──────────────────────────────────────────────
# ATUALIZAÇÃO (CÓDIGO JÁ INSTALADO)
# ──────────────────────────────────────────────
run_update() {
  local TOTAL=7

  stravinsky_animation
  echo -e "\e[1;33m  MODO: ATUALIZAÇÃO\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  log_step 1 $TOTAL "🔐 Validando privilégios e pré-requisitos..."
  ensure_root
  check_prerequisites

  log_step 2 $TOTAL "📥 Puxando novidades do GitHub (branch: $BRANCH)..."
  ensure_installation
  cd "$INSTALL_DIR"
  git fetch origin
  git reset --hard origin/$BRANCH
  log_ok "Código atualizado para o último commit."

  log_step 3 $TOTAL "🔑 Verificando arquivos de ambiente..."
  configure_env

  log_step 4 $TOTAL "🧠 Atualizando dependências e buildando..."
  cd "$INSTALL_DIR/server" && npm install --silent && log_ok "Backend: dependências atualizadas."
  cd "$INSTALL_DIR/client" && npm install --silent && npm run build && log_ok "Frontend: build gerado."

  log_step 5 $TOTAL "🤖 Atualizando dependências do Agente Python..."
  setup_agent

  log_step 6 $TOTAL "🌐 Reaplicando proxy Nginx..."
  configure_nginx
  log_ok "Proxy Nginx reaplicado com sucesso."

  log_step 7 $TOTAL "🔄 Reiniciando serviços..."
  start_services

  stravinsky_animation
  echo -e "\e[1;32m  ✅ SISTEMA ATUALIZADO E RODANDO LIMPO!\e[0m"
  echo "--------------------------------------------------------------------------------"
  pm2 list
  run_health_checks
}

# ──────────────────────────────────────────────
# CORRIGIR PROXY
# ──────────────────────────────────────────────
run_fix_proxy() {
  local TOTAL=3

  stravinsky_animation
  echo -e "\e[1;36m  MODO: CORREÇÃO DO PROXY\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  log_step 1 $TOTAL "🔐 Validando privilégios e instalação..."
  ensure_root
  ensure_installation

  log_step 2 $TOTAL "🌐 Reaplicando configuração do Nginx..."
  configure_nginx
  log_ok "Proxy Nginx corrigido."

  log_step 3 $TOTAL "📡 Validando saúde dos serviços..."
  run_health_checks
}

# ──────────────────────────────────────────────
# MONITORAMENTO
# ──────────────────────────────────────────────
run_monitor() {
  stravinsky_animation
  echo -e "\e[1;35m  MODO: MONITORAMENTO\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  ensure_root
  ensure_installation

  echo -e "\e[1;36m📊 PM2\e[0m"
  echo "--------------------------------------------------------------------------------"
  pm2 list
  echo ""

  echo -e "\e[1;36m🌐 Nginx\e[0m"
  echo "--------------------------------------------------------------------------------"
  systemctl status nginx --no-pager -l | sed -n '1,20p' || true
  echo ""

  echo -e "\e[1;36m🔌 Portas\e[0m"
  echo "--------------------------------------------------------------------------------"
  ss -ltnp | grep -E ":80 |:80$|:3001 |:3001$|:8005 |:8005$" || true

  run_health_checks
}

# ──────────────────────────────────────────────
# LOGS
# ──────────────────────────────────────────────
run_logs() {
  stravinsky_animation
  echo -e "\e[1;34m  MODO: LOGS\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  ensure_root
  ensure_installation

  echo -e "  \e[1;32m[1]\e[0m Logs da API"
  echo -e "  \e[1;33m[2]\e[0m Logs do agente"
  echo -e "  \e[1;36m[3]\e[0m Logs de ambos"
  echo -e "  \e[1;31m[0]\e[0m Voltar"
  echo ""
  read -rp "  ➜ Sua escolha: " LOG_CHOICE

  case "$LOG_CHOICE" in
    1)
      pm2 logs organizador-api --lines 100
      ;;
    2)
      pm2 logs organizador-agente --lines 100
      ;;
    3)
      pm2 logs organizador-api organizador-agente --lines 100
      ;;
    0)
      return 0
      ;;
    *)
      log_warn "Opção inválida para logs."
      ;;
  esac
}

# ──────────────────────────────────────────────
# MONITORAMENTO DO AGENTE PM2
# ──────────────────────────────────────────────
run_agent_pm2_monitor() {
  stravinsky_animation
  echo -e "\e[1;36m  MODO: MONITORAR AGENTE PM2\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  ensure_root
  ensure_installation

  if [ -f "$INSTALL_DIR/monitor_agent_pm2.sh" ]; then
    bash "$INSTALL_DIR/monitor_agent_pm2.sh"
  else
    pm2 describe organizador-agente || true
    echo ""
    pm2 logs organizador-agente --lines 100
  fi
}

# ──────────────────────────────────────────────
# MENU PRINCIPAL
# ──────────────────────────────────────────────
stravinsky_animation

echo -e "\e[1;37m  Bem-vindo ao Stravinsky Deploy System!\e[0m"
echo -e "  Projeto: \e[1;36mOrganize IA\e[0m  |  Branch: \e[1;36m$BRANCH\e[0m"
echo ""
echo -e "  O que você deseja fazer?"
echo ""
echo -e "  \e[1;32m[1]\e[0m Instalação completa \e[2m(primeira vez no servidor)\e[0m"
echo -e "  \e[1;33m[2]\e[0m Atualização \e[2m(puxar novidades do GitHub e reiniciar)\e[0m"
echo -e "  \e[1;36m[3]\e[0m Corrigir proxy \e[2m(reaplicar o Nginx corretamente)\e[0m"
echo -e "  \e[1;35m[4]\e[0m Monitoramento \e[2m(status do PM2, Nginx e health checks)\e[0m"
echo -e "  \e[1;34m[5]\e[0m Logs \e[2m(ver API e agente em tempo real)\e[0m"
echo -e "  \e[1;36m[6]\e[0m Monitorar agente PM2 \e[2m(abrir status e logs do agente)\e[0m"
echo -e "  \e[1;31m[0]\e[0m Sair"
echo ""
read -rp "  ➜ Sua escolha: " CHOICE

case "$CHOICE" in
  1)
    run_install
    ;;
  2)
    run_update
    ;;
  3)
    run_fix_proxy
    ;;
  4)
    run_monitor
    ;;
  5)
    run_logs
    ;;
  6)
    run_agent_pm2_monitor
    ;;
  0)
    echo -e "\n\e[1;33m  Saindo...\e[0m\n"
    exit 0
    ;;
  *)
    echo -e "\n\e[1;31m  Opção inválida. Execute novamente e escolha 1, 2, 3, 4, 5, 6 ou 0.\e[0m\n"
    exit 1
    ;;
esac
