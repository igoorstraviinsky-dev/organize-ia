#!/bin/bash

set -e

# ==============================================
# STRAVINSKY DEPLOY SYSTEM
# Instalador + Atualizador do Organize IA
# ==============================================

# Configuracoes
REPO_URL="https://github.com/igoorstraviinsky-dev/organize-ia.git"
INSTALL_DIR="/var/www/organizador"
LEGACY_INSTALL_DIR="/root/organize-ia"
BRANCH="main"
NODE_VERSION_MIN="18"
PYTHON_VERSION_MIN="3.10"
API_PORT="3001"
AGENT_PORT="8005"
NGINX_SITE_NAME="organizador"
PM2_API_NAME="organizador-api"
PM2_AGENT_NAME="organizador-agente"

# ----------------------------------------------
# ANIMACAO STRAVINSKY
# ----------------------------------------------
stravinsky_animation() {
  clear
  echo -e "\e[1;35m"
  echo "  ██████  ████████ ██████   █████  ██    ██ ██ ███    ██ ███████ ██   ██ ██    ██ "
  echo " ██          ██    ██   ██ ██   ██ ██    ██ ██ ████   ██ ██      ██  ██   ██  ██  "
  echo "  █████      ██    ██████  ███████ ██    ██ ██ ██ ██  ██ ███████ █████     ████   "
  echo "      ██     ██    ██   ██ ██   ██  ██  ██  ██ ██  ██ ██      ██ ██  ██     ██    "
  echo " ██████      ██    ██   ██ ██   ██   ████   ██ ██   ████ ███████ ██   ██    ██    "
  echo -e "\e[0m"
  echo -e "\e[1;33m                     STRAVINSKY DEPLOY SYSTEM\e[0m"
  echo "--------------------------------------------------------------------------------"
  sleep 1
}

# ----------------------------------------------
# FUNCOES UTILITARIAS
# ----------------------------------------------
log_step() { echo -e "\e[1;34m[$1/$2]\e[0m $3"; }
log_ok()   { echo -e "\e[1;32m  OK  $1\e[0m"; }
log_warn() { echo -e "\e[1;33m  AVISO  $1\e[0m"; }
log_fail() { echo -e "\e[1;31m  ERRO  $1\e[0m"; exit 1; }

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

migrate_legacy_install() {
  if [ -d "$LEGACY_INSTALL_DIR/.git" ] && [ ! -d "$INSTALL_DIR/.git" ]; then
    log_warn "Instalacao antiga detectada em $LEGACY_INSTALL_DIR. Migrando para $INSTALL_DIR..."
    mkdir -p "$(dirname "$INSTALL_DIR")"
    mv "$LEGACY_INSTALL_DIR" "$INSTALL_DIR"
    log_ok "Instalacao migrada para $INSTALL_DIR."
  fi
}

require_installation() {
  migrate_legacy_install

  if [ ! -d "$INSTALL_DIR/.git" ]; then
    log_fail "Instalacao nao encontrada em $INSTALL_DIR. Rode primeiro a opcao 1."
  fi
}

configure_nginx() {
  cat > "/etc/nginx/sites-available/$NGINX_SITE_NAME" <<NGINXCONF
server {
    listen 80;
    server_name _;

    root $INSTALL_DIR/client/dist;
    index index.html;

    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
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
        proxy_read_timeout 300;
        proxy_send_timeout 300;
        proxy_buffering off;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXCONF

  ln -sf "/etc/nginx/sites-available/$NGINX_SITE_NAME" "/etc/nginx/sites-enabled/$NGINX_SITE_NAME"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable nginx >/dev/null 2>&1 || true
  systemctl reload nginx || systemctl restart nginx
}

check_url() {
  local label="$1"
  local url="$2"

  if curl -fsS --max-time 10 "$url" >/dev/null 2>&1; then
    log_ok "$label respondeu em $url"
  else
    log_warn "$label nao respondeu em $url"
  fi
}

check_prerequisites() {
  echo -e "\n\e[1;36mVerificando pre-requisitos do sistema...\e[0m"

  local packages=()

  command -v git >/dev/null 2>&1 || packages+=("git")
  command -v curl >/dev/null 2>&1 || packages+=("curl")
  command -v python3 >/dev/null 2>&1 || packages+=("python3")
  python3 -m pip --version >/dev/null 2>&1 || packages+=("python3-pip")
  python3 -m venv --help >/dev/null 2>&1 || packages+=("python3-venv")
  command -v nginx >/dev/null 2>&1 || packages+=("nginx")

  if [ ${#packages[@]} -gt 0 ]; then
    log_warn "Instalando pacotes do sistema: ${packages[*]}"
    apt-get update -qq
    apt-get install -y "${packages[@]}" >/dev/null
    log_ok "Pacotes do sistema instalados."
  fi

  if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt "$NODE_VERSION_MIN" ]; then
    log_warn "Node.js ausente ou desatualizado. Instalando Node 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs >/dev/null
  fi

  local node_major
  node_major="$(node -v | sed 's/v//' | cut -d. -f1)"
  if [ "$node_major" -lt "$NODE_VERSION_MIN" ]; then
    log_fail "Node.js ${NODE_VERSION_MIN}+ necessario. Versao atual: $(node -v)"
  fi
  log_ok "Node.js: $(node -v)"

  if ! python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
    log_fail "Python ${PYTHON_VERSION_MIN}+ necessario. Versao atual: $(python3 --version 2>/dev/null || echo desconhecida)"
  fi
  log_ok "Python: $(python3 --version)"

  if ! command -v npm >/dev/null 2>&1; then
    log_fail "npm nao encontrado apos instalar Node.js."
  fi
  log_ok "npm: $(npm -v)"

  if ! command -v pm2 >/dev/null 2>&1; then
    log_warn "PM2 nao encontrado. Instalando globalmente..."
    npm install -g pm2 --silent
  fi
  log_ok "PM2: $(pm2 -v)"

  log_ok "Nginx: $(nginx -v 2>&1 | head -1)"
  echo ""
}

configure_env() {
  echo -e "\e[1;36mConfiguracao de variaveis de ambiente\e[0m"
  echo "--------------------------------------------------------------------------------"

  local env_server="$INSTALL_DIR/server/.env"
  local env_client="$INSTALL_DIR/client/.env"
  local env_agent="$INSTALL_DIR/agent/.env"

  mkdir -p "$INSTALL_DIR/server" "$INSTALL_DIR/client" "$INSTALL_DIR/agent"

  if [ -f "$env_server" ]; then
    log_ok "server/.env ja existe. Mantendo configuracao atual."
  else
    local supabase_url
    local supabase_service_key
    local openai_api_key
    local openai_model

    echo -e "\nPreencha as credenciais do backend:"
    read -rp "  SUPABASE_URL: " supabase_url
    read -rp "  SUPABASE_SERVICE_KEY: " supabase_service_key
    read -rp "  OPENAI_API_KEY: " openai_api_key
    read -rp "  OPENAI_MODEL [gpt-4o]: " openai_model
    openai_model=${openai_model:-gpt-4o}

    cat > "$env_server" <<EOF
SUPABASE_URL=$supabase_url
SUPABASE_SERVICE_KEY=$supabase_service_key

OPENAI_API_KEY=$openai_api_key
OPENAI_MODEL=$openai_model

WHATSAPP_TOKEN=your-whatsapp-access-token
WHATSAPP_VERIFY_TOKEN=your-custom-verify-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

PORT=$API_PORT
EOF
    log_ok "server/.env criado."
  fi

  append_env_if_missing "$env_server" "OPENAI_MODEL" "gpt-4o"
  append_env_if_missing "$env_server" "PORT" "$API_PORT"

  if [ -f "$env_client" ]; then
    log_ok "client/.env ja existe. Mantendo configuracao atual."
  else
    local default_supabase_url
    local client_supabase_url
    local client_supabase_anon_key
    local client_server_url
    local public_webhook_url

    default_supabase_url="$(get_env_value "$env_server" "SUPABASE_URL")"

    echo -e "\nPreencha as credenciais do frontend:"
    read -rp "  VITE_SUPABASE_URL [$default_supabase_url]: " client_supabase_url
    client_supabase_url=${client_supabase_url:-$default_supabase_url}
    read -rp "  VITE_SUPABASE_ANON_KEY: " client_supabase_anon_key
    read -rp "  VITE_SERVER_URL [vazio para usar o mesmo dominio]: " client_server_url
    read -rp "  VITE_PUBLIC_WEBHOOK_URL [opcional]: " public_webhook_url

    cat > "$env_client" <<EOF
VITE_SUPABASE_URL=$client_supabase_url
VITE_SUPABASE_ANON_KEY=$client_supabase_anon_key
VITE_SERVER_URL=$client_server_url
VITE_PUBLIC_WEBHOOK_URL=$public_webhook_url
EOF
    log_ok "client/.env criado."
  fi

  append_env_if_missing "$env_client" "VITE_SUPABASE_URL" "$(get_env_value "$env_server" "SUPABASE_URL")"
  append_env_if_missing "$env_client" "VITE_SERVER_URL" ""
  append_env_if_missing "$env_client" "VITE_PUBLIC_WEBHOOK_URL" ""

  if [ -f "$env_agent" ]; then
    log_ok "agent/.env ja existe. Mantendo configuracao atual."
  else
    cp "$env_server" "$env_agent"
    cat >> "$env_agent" <<EOF

# Agente
AGENT_PORT=$AGENT_PORT
WEBHOOK_SECRET=organizador_webhook_secret_2024

# WazAPI (WhatsApp)
WAZAPI_URL=http://localhost:5000
WAZAPI_TOKEN=seu_token_aqui
WAZAPI_INSTANCE=organizador

# Comunicacao com o backend Node
BRAIN_URL=http://localhost:$API_PORT/api/agent/process
EOF
    log_ok "agent/.env criado."
  fi

  append_env_if_missing "$env_agent" "AGENT_PORT" "$AGENT_PORT"
  append_env_if_missing "$env_agent" "BRAIN_URL" "http://localhost:$API_PORT/api/agent/process"

  if ! grep -q "^VITE_SUPABASE_ANON_KEY=" "$env_client"; then
    log_warn "client/.env existe, mas VITE_SUPABASE_ANON_KEY esta ausente. O frontend pode nao funcionar."
  fi

  echo ""
}

clone_repository_if_needed() {
  migrate_legacy_install

  if [ -d "$INSTALL_DIR/.git" ]; then
    log_warn "Pasta $INSTALL_DIR ja contem um repositorio. Pulando clone."
    return 0
  fi

  if [ -e "$INSTALL_DIR" ] && [ ! -d "$INSTALL_DIR/.git" ]; then
    log_fail "A pasta $INSTALL_DIR existe, mas nao e um repositorio Git. Mova ou remova antes de instalar."
  fi

  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  log_ok "Repositorio clonado em $INSTALL_DIR."
}

pull_latest_code() {
  require_installation
  cd "$INSTALL_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
  log_ok "Codigo sincronizado com origin/$BRANCH."
}

install_backend() {
  cd "$INSTALL_DIR/server"
  npm install --silent
  log_ok "Dependencias do backend instaladas."
}

build_frontend() {
  cd "$INSTALL_DIR/client"
  npm install --silent
  npm run build
  log_ok "Frontend buildado com sucesso."
}

setup_agent() {
  cd "$INSTALL_DIR/agent"
  bash setup.sh
  log_ok "Agente Python configurado."
}

start_services() {
  cd "$INSTALL_DIR"
  pm2 startOrRestart ecosystem.config.js --env production --update-env
  pm2 save --force
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
  log_ok "Servicos do Organize IA carregados no PM2."
}

run_health_checks() {
  echo ""
  echo -e "\e[1;36mHealth checks\e[0m"
  echo "--------------------------------------------------------------------------------"
  check_url "Backend direto" "http://127.0.0.1:$API_PORT/api/health"
  check_url "Agente direto" "http://127.0.0.1:$AGENT_PORT/health"
  check_url "Backend via proxy" "http://127.0.0.1/api/health"
  check_url "Agente via proxy" "http://127.0.0.1/agent/health"
}

run_install() {
  local total=8

  stravinsky_animation
  echo -e "\e[1;32m  MODO: INSTALACAO COMPLETA\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  log_step 1 $total "Validando privilegios e pre-requisitos..."
  ensure_root
  check_prerequisites

  log_step 2 $total "Clonando ou migrando repositorio..."
  clone_repository_if_needed

  log_step 3 $total "Configurando arquivos .env..."
  configure_env

  log_step 4 $total "Instalando backend Node.js..."
  install_backend

  log_step 5 $total "Buildando frontend..."
  build_frontend

  log_step 6 $total "Configurando agente Python..."
  setup_agent

  log_step 7 $total "Aplicando proxy Nginx..."
  configure_nginx
  log_ok "Nginx configurado e recarregado."

  log_step 8 $total "Subindo servicos no PM2..."
  start_services

  stravinsky_animation
  echo -e "\e[1;32m  INSTALACAO CONCLUIDA COM SUCESSO\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo -e "  Projeto instalado em: \e[1;36m$INSTALL_DIR\e[0m"
  echo -e "  Acesse pelo IP ou dominio da VPS na porta 80"
  pm2 list
  run_health_checks
}

run_update() {
  local total=8

  stravinsky_animation
  echo -e "\e[1;33m  MODO: ATUALIZACAO COMPLETA\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  log_step 1 $total "Validando privilegios e pre-requisitos..."
  ensure_root
  check_prerequisites

  log_step 2 $total "Sincronizando codigo com o GitHub..."
  pull_latest_code

  log_step 3 $total "Garantindo arquivos .env..."
  configure_env

  log_step 4 $total "Atualizando backend Node.js..."
  install_backend

  log_step 5 $total "Rebuildando frontend..."
  build_frontend

  log_step 6 $total "Atualizando agente Python..."
  setup_agent

  log_step 7 $total "Reaplicando proxy Nginx..."
  configure_nginx
  log_ok "Proxy Nginx reaplicado com sucesso."

  log_step 8 $total "Reiniciando servicos do Organize IA..."
  start_services

  stravinsky_animation
  echo -e "\e[1;32m  ATUALIZACAO CONCLUIDA\e[0m"
  echo "--------------------------------------------------------------------------------"
  pm2 list
  run_health_checks
}

run_proxy_fix() {
  local total=3

  stravinsky_animation
  echo -e "\e[1;36m  MODO: CORRECAO DO PROXY\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  log_step 1 $total "Validando privilegios e instalacao..."
  ensure_root
  require_installation

  log_step 2 $total "Reaplicando configuracao do Nginx..."
  configure_nginx
  log_ok "Proxy Nginx corrigido."

  log_step 3 $total "Executando health checks..."
  run_health_checks
}

run_monitor() {
  stravinsky_animation
  echo -e "\e[1;35m  MODO: MONITORAMENTO\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  ensure_root
  require_installation

  echo "Diretorio da aplicacao: $INSTALL_DIR"
  echo ""
  echo -e "\e[1;36mStatus do PM2\e[0m"
  echo "--------------------------------------------------------------------------------"
  pm2 list

  echo ""
  echo -e "\e[1;36mStatus do Nginx\e[0m"
  echo "--------------------------------------------------------------------------------"
  systemctl is-active nginx || true

  echo ""
  echo -e "\e[1;36mPortas em escuta\e[0m"
  echo "--------------------------------------------------------------------------------"
  ss -ltnp | grep -E ":80 |:80$|:3001 |:3001$|:8005 |:8005$" || true

  run_health_checks
}

run_logs() {
  stravinsky_animation
  echo -e "\e[1;35m  MODO: LOGS\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  ensure_root
  require_installation

  echo "Escolha o servico para acompanhar:"
  echo ""
  echo "  [1] API Node.js"
  echo "  [2] Agente Python"
  echo "  [3] Ambos"
  echo "  [0] Voltar"
  echo ""
  read -rp "  -> Sua escolha: " logs_choice

  case "$logs_choice" in
    1)
      pm2 logs "$PM2_API_NAME" --lines 100
      ;;
    2)
      pm2 logs "$PM2_AGENT_NAME" --lines 100
      ;;
    3)
      pm2 logs "$PM2_API_NAME" "$PM2_AGENT_NAME" --lines 100
      ;;
    0)
      return 0
      ;;
    *)
      log_warn "Opcao invalida para logs."
      ;;
  esac
}

# ----------------------------------------------
# MENU PRINCIPAL
# ----------------------------------------------
stravinsky_animation

echo -e "\e[1;37m  Bem-vindo ao Stravinsky Deploy System!\e[0m"
echo -e "  Projeto: \e[1;36mOrganize IA\e[0m  |  Branch: \e[1;36m$BRANCH\e[0m"
echo ""
echo -e "  O que voce deseja fazer?"
echo ""
echo -e "  \e[1;32m[1]\e[0m Instalacao completa \e[2m(primeira vez no servidor)\e[0m"
echo -e "  \e[1;33m[2]\e[0m Atualizacao completa \e[2m(atualiza codigo, deps, proxy e PM2)\e[0m"
echo -e "  \e[1;36m[3]\e[0m Corrigir proxy Nginx \e[2m(reaplica o proxy /api e /agent)\e[0m"
echo -e "  \e[1;35m[4]\e[0m Monitoramento \e[2m(status do PM2, Nginx, portas e health checks)\e[0m"
echo -e "  \e[1;34m[5]\e[0m Logs \e[2m(acompanhar API e agente em tempo real)\e[0m"
echo -e "  \e[1;31m[0]\e[0m Sair"
echo ""
read -rp "  -> Sua escolha: " choice

case "$choice" in
  1)
    run_install
    ;;
  2)
    run_update
    ;;
  3)
    run_proxy_fix
    ;;
  4)
    run_monitor
    ;;
  5)
    run_logs
    ;;
  0)
    echo -e "\n\e[1;33m  Saindo...\e[0m\n"
    exit 0
    ;;
  *)
    echo -e "\n\e[1;31m  Opcao invalida. Execute novamente e escolha 1, 2, 3, 4, 5 ou 0.\e[0m\n"
    exit 1
    ;;
esac
