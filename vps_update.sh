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

  # Nginx (para o frontend estático em produção)
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

PORT=3001
EOF
    log_ok "server/.env criado."
  fi

  if [ -f "$ENV_AGENT" ]; then
    log_ok ".env do agente já existe. Mantendo configuração atual."
  else
    # Copia as credenciais do server para o agente
    cp "$ENV_SERVER" "$ENV_AGENT"
    echo "" >> "$ENV_AGENT"
    cat >> "$ENV_AGENT" <<EOF

# Agente
AGENT_PORT=8005
WEBHOOK_SECRET=organizador_webhook_secret_2024

# WazAPI (WhatsApp)
WAZAPI_URL=http://localhost:5000
WAZAPI_TOKEN=seu_token_aqui
WAZAPI_INSTANCE=organizador
EOF
    log_ok "agent/.env criado."
  fi
  echo ""
}

# ──────────────────────────────────────────────
# INSTALAÇÃO COMPLETA (PRIMEIRA VEZ)
# ──────────────────────────────────────────────
run_install() {
  local TOTAL=7

  stravinsky_animation
  echo -e "\e[1;32m  MODO: INSTALAÇÃO COMPLETA\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  check_prerequisites

  # 1. Clone do repositório
  log_step 1 $TOTAL "📥 Clonando repositório do GitHub..."
  if [ -d "$INSTALL_DIR/.git" ]; then
    log_warn "Pasta $INSTALL_DIR já tem um repositório. Pulando clone."
  else
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    log_ok "Repositório clonado em $INSTALL_DIR"
  fi

  # 2. Configurar .env
  log_step 2 $TOTAL "🔑 Configurando variáveis de ambiente..."
  configure_env

  # 3. Instalar dependências do Backend (Node.js)
  log_step 3 $TOTAL "🧠 Instalando dependências do Backend (Node.js)..."
  cd "$INSTALL_DIR/server" && npm install --silent
  log_ok "Dependências do server instaladas."

  # 4. Build + Instalar dependências do Frontend (React)
  log_step 4 $TOTAL "🎨 Buildando Frontend (React/Vite)..."
  cd "$INSTALL_DIR/client" && npm install --silent && npm run build
  log_ok "Frontend buildado com sucesso."

  # 5. Configurar ambiente Python virtual + Dependências
  log_step 5 $TOTAL "🤖 Configurando Agente Python..."
  cd "$INSTALL_DIR/agent"
  python3 -m venv venv
  source venv/bin/activate
  pip install --upgrade pip --quiet
  pip install -r requirements.txt --quiet
  deactivate
  log_ok "Agente Python configurado."

  # 6. Configurar Nginx (servir o client buildado)
  log_step 6 $TOTAL "🌐 Configurando Nginx para o frontend..."
  cat > /etc/nginx/sites-available/organizador <<'NGINXCONF'
server {
    listen 80;
    server_name _;

    root /var/www/organizador/client/dist;
    index index.html;

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Agente Python
    location /agent/ {
        proxy_pass http://localhost:8005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXCONF

  # Ativar site e reiniciar Nginx
  ln -sf /etc/nginx/sites-available/organizador /etc/nginx/sites-enabled/organizador
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  log_ok "Nginx configurado e recarregado."

  # 7. Iniciar processos com PM2
  log_step 7 $TOTAL "🚀 Iniciando serviços com PM2..."
  cd "$INSTALL_DIR"
  pm2 startOrRestart ecosystem.config.js --env production
  pm2 save --force
  pm2 startup | tail -1 | bash 2>/dev/null || true
  log_ok "Serviços iniciados no PM2."

  stravinsky_animation
  echo -e "\e[1;32m  ✅ INSTALAÇÃO COMPLETA COM SUCESSO!\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo -e "  📦 Projeto instalado em: \e[1;36m$INSTALL_DIR\e[0m"
  echo -e "  🌍 Acesse pelo IP do servidor na porta 80"
  echo -e "  📊 Status dos processos:"
  echo ""
  pm2 list
}

# ──────────────────────────────────────────────
# ATUALIZAÇÃO (CÓDIGO JÁ INSTALADO)
# ──────────────────────────────────────────────
run_update() {
  local TOTAL=5

  stravinsky_animation
  echo -e "\e[1;33m  MODO: ATUALIZAÇÃO\e[0m"
  echo "--------------------------------------------------------------------------------"
  echo ""

  # 1. Puxar código mais novo do GitHub
  log_step 1 $TOTAL "📥 Puxando novidades do GitHub (branch: $BRANCH)..."
  cd "$INSTALL_DIR"
  git fetch origin
  git reset --hard origin/$BRANCH
  log_ok "Código atualizado para o último commit."

  # 2. Preservar .env (nunca sobrescreve — estão no .gitignore)
  log_step 2 $TOTAL "🔑 Verificando arquivos de ambiente..."
  if [ -f "$INSTALL_DIR/server/.env" ]; then
    log_ok "server/.env preservado."
  else
    log_warn "server/.env não encontrado! Crie manualmente antes de reiniciar."
  fi
  if [ -f "$INSTALL_DIR/agent/.env" ]; then
    log_ok "agent/.env preservado."
  else
    log_warn "agent/.env não encontrado! Crie manualmente antes de reiniciar."
  fi

  # 3. Reinstalar dependências e rebuildar
  log_step 3 $TOTAL "🧠 Atualizando dependências e buildando..."
  cd "$INSTALL_DIR/server" && npm install --silent && log_ok "Backend: dependências atualizadas."
  cd "$INSTALL_DIR/client" && npm install --silent && npm run build && log_ok "Frontend: build gerado."

  # 4. Atualizar dependências Python
  log_step 4 $TOTAL "🤖 Atualizando dependências do Agente Python..."
  cd "$INSTALL_DIR/agent"
  source venv/bin/activate
  pip install --upgrade pip --quiet
  pip install -r requirements.txt --quiet
  deactivate
  log_ok "Agente Python: dependências atualizadas."

  # 5. Reiniciar tudo com PM2 injetando novos .env
  log_step 5 $TOTAL "🔄 Reiniciando serviços e limpando logs..."
  cd "$INSTALL_DIR"
  pm2 restart all --update-env
  pm2 flush
  pm2 save --force
  log_ok "Serviços reiniciados com êxito."

  stravinsky_animation
  echo -e "\e[1;32m  ✅ SISTEMA ATUALIZADO E RODANDO LIMPO!\e[0m"
  echo "--------------------------------------------------------------------------------"
  pm2 list
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
  0)
    echo -e "\n\e[1;33m  Saindo...\e[0m\n"
    exit 0
    ;;
  *)
    echo -e "\n\e[1;31m  Opção inválida. Execute novamente e escolha 1 ou 2.\e[0m\n"
    exit 1
    ;;
esac