#!/bin/bash

# ==============================================================================
# 🚀 STRAVINSKY AUTO-DEPLOY & CONTROL SYSTEM (v3.1.0)
# ==============================================================================
# Desenvolvido para: Organizador IA
# Funções: Monitoramento Unificado, Zero-Build Deploy e Gestão de Containers
# ==============================================================================

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ──────────────────────────────────────────────────────────────────────────────
# 1. CABEÇALHO STRAVINSKY
# ──────────────────────────────────────────────────────────────────────────────
stravinsky_header() {
    clear
    echo -e "${BLUE}"
    echo "  ██████  ████████ ██████   █████  ██    ██ ██ ███    ██ ███████ ██   ██ ██    ██ "
    echo " ██          ██    ██   ██ ██   ██ ██    ██ ██ ████   ██ ██      ██  ██   ██  ██  "
    echo "  █████      ██    ██████  ███████ ██    ██ ██ ██ ██  ██ ███████ █████     ████   "
    echo "      ██     ██    ██   ██ ██   ██  ██  ██  ██ ██  ██ ██      ██ ██  ██     ██    "
    echo " ██████      ██    ██   ██ ██   ██   ████   ██ ██   ████ ███████ ██   ██    ██    "
    echo -e "${NC}"
    echo -e "${YELLOW}                     🔥 STRAVINSKY CONTROL PANEL 🔥${NC}"
    echo "--------------------------------------------------------------------------------"
}

# ──────────────────────────────────────────────────────────────────────────────
# 2. VERIFICAÇÃO E INSTALAÇÃO DE DEPENDÊNCIAS
# ──────────────────────────────────────────────────────────────────────────────
check_dependencies() {
    echo -e "${BLUE}[1/3] Verificando dependências do sistema...${NC}"
    
    # Verificar se é Root
    if [ "$EUID" -ne 0 ]; then 
        echo -e "${RED}Por favor, execute este script como root (sudo).${NC}"
        exit 1
    fi

    # Atualizar repositórios
    apt-get update -y > /dev/null 2>&1

    # Git
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}Instalando Git...${NC}"
        apt-get install -y git > /dev/null 2>&1
    fi

    # Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Instalando Docker...${NC}"
        curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
        systemctl enable docker > /dev/null 2>&1
        systemctl start docker > /dev/null 2>&1
    fi

    # Docker Compose (V2 Plugin ou V1 Binary)
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}Instalando Docker Compose...${NC}"
        apt-get install -y docker-compose-plugin > /dev/null 2>&1
    fi

    echo -e "${GREEN}✅ Dependências ok!${NC}"
    sleep 1
}

# ──────────────────────────────────────────────────────────────────────────────
# 3. CONFIGURAÇÃO DE VARIÁVEIS (.ENV)
# ──────────────────────────────────────────────────────────────────────────────
configure_env() {
    echo -e "\n${BLUE}[Configuração] Vamos configurar suas credenciais:${NC}"
    echo "Pressione ENTER para manter o valor atual (se existir)."

    # Função para ler entrada com default
    read_with_default() {
        local var_name=$1
        local current_val=$2
        local prompt_text=$3
        read -p "$prompt_text [$current_val]: " input
        echo "${input:-$current_val}"
    }

    # Carregar valores atuais se existirem
    if [ -f server/.env ]; then
        SUPABASE_URL_CURRENT=$(grep "SUPABASE_URL=" server/.env | cut -d= -f2-)
        SUPABASE_ANON_KEY_CURRENT=$(grep "VITE_SUPABASE_ANON_KEY=" .env | cut -d= -f2-)
        SUPABASE_SERVICE_KEY_CURRENT=$(grep "SUPABASE_SERVICE_KEY=" server/.env | cut -d= -f2-)
        OPENAI_API_KEY_CURRENT=$(grep "OPENAI_API_KEY=" server/.env | cut -d= -f2-)
        DNS_DOMAIN_CURRENT=$(grep "VITE_API_URL=" server/.env | cut -d/ -f3 | cut -d: -f1)
        WAZAPI_TOKEN_CURRENT=$(grep "WAZAPI_TOKEN=" agent/.env | cut -d= -f2-)
        WAZAPI_INSTANCE_CURRENT=$(grep "WAZAPI_INSTANCE=" agent/.env | cut -d= -f2-)
    fi

    SUPABASE_URL=$(read_with_default "SUPABASE_URL" "${SUPABASE_URL_CURRENT:-https://seu-projeto.supabase.co}" "Supabase URL")
    SUPABASE_ANON_KEY=$(read_with_default "SUPABASE_ANON_KEY" "${SUPABASE_ANON_KEY_CURRENT:-sua-chave-anon-publica}" "Supabase Anon Key (Public)")
    SUPABASE_SERVICE_KEY=$(read_with_default "SUPABASE_SERVICE_KEY" "${SUPABASE_SERVICE_KEY_CURRENT:-sua-chave-service}" "Supabase Service Key (Private)")
    OPENAI_API_KEY=$(read_with_default "OPENAI_API_KEY" "${OPENAI_API_KEY_CURRENT:-sk-proj-xxx}" "OpenAI API Key")
    WAZAPI_TOKEN=$(read_with_default "WAZAPI_TOKEN" "${WAZAPI_TOKEN_CURRENT:-seu_token_aqui}" "UazAPI Token")
    WAZAPI_INSTANCE=$(read_with_default "WAZAPI_INSTANCE" "${WAZAPI_INSTANCE_CURRENT:-organizador}" "UazAPI Instance Name")
    DNS_DOMAIN=$(read_with_default "DNS_DOMAIN" "${DNS_DOMAIN_CURRENT:-localhost}" "Domínio ou IP da VPS (apenas o nome)")
    
    CLEAN_DOMAIN=$(echo $DNS_DOMAIN | sed -e 's|^[^/]*//||' -e 's|/.*$||')

    echo -e "${YELLOW}Salvando configurações...${NC}"
    
    # .env Global (Raiz) - Fonte para Interpolação do Docker Compose
    cat > .env <<EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
VITE_API_URL=http://$CLEAN_DOMAIN:3001
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
WAZAPI_URL=http://host.docker.internal:5000
WAZAPI_TOKEN=$WAZAPI_TOKEN
EOF

    # server/.env
    cat > server/.env <<EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=gpt-4o
PORT=3001
VITE_API_URL=http://$CLEAN_DOMAIN:3001
WHATSAPP_WEBHOOK_SECRET=organizador_webhook_secret_2024
EOF

    # agent/.env
    cat > agent/.env <<EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=gpt-4o
BRAIN_URL=http://server:3001/api/agent/process
WAZAPI_URL=http://host.docker.internal:5000
WAZAPI_TOKEN=$WAZAPI_TOKEN
WAZAPI_INSTANCE=$WAZAPI_INSTANCE
AGENT_PORT=8005
WEBHOOK_SECRET=organizador_webhook_secret_2024
EOF

    echo -e "${GREEN}✅ Configurações salvas!${NC}"
    echo -e "${YELLOW}DICA: Para aplicar, rode: docker compose build --no-cache && docker compose up -d${NC}"
}

# ──────────────────────────────────────────────────────────────────────────────
# 4. AÇÃO: INSTALAR / ATUALIZAR (ZERO-BUILD)
# ──────────────────────────────────────────────────────────────────────────────
action_deploy() {
    local mode=$1
    if [ "$mode" == "install" ]; then
        echo -e "${BLUE}Iniciando Instalação Completa...${NC}"
        configure_env
    else
        echo -e "${BLUE}Iniciando Atualização (Pull do GHCR)...${NC}"
        git pull origin main
    fi

    echo -e "${YELLOW}Sincronizando imagens e containers...${NC}"
    # Se o pull falhar (não logado no GHCR), tentamos o build local como fallback
    if ! docker compose pull; then
        echo -e "${YELLOW}Aviso: Pull falhou ou GHCR não configurado. Usando build local...${NC}"
        docker compose up -d --build
    else
        docker compose up -d
    fi

    echo -e "${GREEN}🚀 Operação concluída com sucesso!${NC}"
    read -p "Pressione ENTER para voltar ao menu..."
}

# ──────────────────────────────────────────────────────────────────────────────
# 5. AÇÃO: MONITORAR LOGS (UNIFICADO)
# ──────────────────────────────────────────────────────────────────────────────
action_monitor_logs() {
    echo -e "${BLUE}Iniciando Monitoramento de Logs em Tempo Real...${NC}"
    echo -e "${YELLOW}Pressione Ctrl+C para sair dos logs e voltar ao menu.${NC}"
    sleep 2
    docker compose logs -f --tail 100
    echo -e "\n${BLUE}Saindo do monitoramento...${NC}"
    sleep 1
}

# ──────────────────────────────────────────────────────────────────────────────
# EXECUÇÃO PRINCIPAL
# ──────────────────────────────────────────────────────────────────────────────

stravinsky_header
check_dependencies

while true; do
    stravinsky_header
    echo -e "${YELLOW}SELECIONE UMA OPERAÇÃO:${NC}"
    echo "--------------------------"
    echo -e "  [1] INSTALAR  (Zero-Build Setup)"
    echo -e "  [2] ATUALIZAR (Pull do GitHub/GHCR)"
    echo -e "  [3] MONITORAR (Logs em tempo real 🟢)"
    echo -e "  [0] SAIR"
    echo "--------------------------"
    read -p "➜ Escolha uma opção: " OPTION

    case $OPTION in
        1) action_deploy "install" ;;
        2) action_deploy "update" ;;
        3) action_monitor_logs ;;
        0) echo "Saindo..."; exit 0 ;;
        *) echo -e "${RED}Opção inválida!${NC}"; sleep 1 ;;
    esac
done
