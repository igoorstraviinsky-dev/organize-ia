#!/bin/bash

# ==============================================================================
# 🚀 STRAVINSKY AUTO-DEPLOY SYSTEM
# ==============================================================================
# Desenvolvido para: Organizador IA
# Funções: Verificação de Dependências, Instalação e Atualização via Docker
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
    echo -e "${YELLOW}                     🔥 STRAVINSKY DEPLOY SYSTEM 🔥${NC}"
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
    # Usamos grep para evitar erros de source com formatos não-bash
    if [ -f server/.env ]; then
        SUPABASE_URL_CURRENT=$(grep "SUPABASE_URL=" server/.env | cut -d= -f2-)
        SUPABASE_SERVICE_KEY_CURRENT=$(grep "SUPABASE_SERVICE_KEY=" server/.env | cut -d= -f2-)
        OPENAI_API_KEY_CURRENT=$(grep "OPENAI_API_KEY=" server/.env | cut -d= -f2-)
        DNS_DOMAIN_CURRENT=$(grep "VITE_API_URL=" server/.env | cut -d/ -f3 | cut -d: -f1)
    fi

    SUPABASE_URL=$(read_with_default "SUPABASE_URL" "${SUPABASE_URL_CURRENT:-https://seu-projeto.supabase.co}" "Supabase URL")
    SUPABASE_SERVICE_KEY=$(read_with_default "SUPABASE_SERVICE_KEY" "${SUPABASE_SERVICE_KEY_CURRENT:-sua-chave-service}" "Supabase Service Key")
    OPENAI_API_KEY=$(read_with_default "OPENAI_API_KEY" "${OPENAI_API_KEY_CURRENT:-sk-proj-xxx}" "OpenAI API Key")
    DNS_DOMAIN=$(read_with_default "DNS_DOMAIN" "${DNS_DOMAIN_CURRENT:-localhost}" "Domínio ou IP da VPS (apenas o nome, ex: organize.meu.site)")
    
    # Limpar o domínio de possíveis http/https
    CLEAN_DOMAIN=$(echo $DNS_DOMAIN | sed -e 's|^[^/]*//||' -e 's|/.*$||')

    # Criar .env do Server
    echo -e "${YELLOW}Salvando server/.env...${NC}"
    cat > server/.env <<EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=gpt-4o
PORT=3001
VITE_API_URL=http://$CLEAN_DOMAIN:3001
EOF

    # Criar .env do Agente (Cópia + específicas)
    echo -e "${YELLOW}Salvando agent/.env...${NC}"
    cat > agent/.env <<EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=gpt-4o
WAZAPI_URL=http://localhost:5000
WAZAPI_TOKEN=seu_token_aqui
WAZAPI_INSTANCE=organizador
AGENT_PORT=8005
WEBHOOK_SECRET=organizador_webhook_secret_2024
EOF

    echo -e "${GREEN}✅ Configurações salvas!${NC}"
}

# ──────────────────────────────────────────────────────────────────────────────
# 4. AÇÃO: INSTALAR
# ──────────────────────────────────────────────────────────────────────────────
action_install() {
    echo -e "${BLUE}Iniciando Instalação Completa...${NC}"
    
    # Configurar .env
    configure_env

    echo -e "${BLUE}Subindo containers com Docker Compose...${NC}"
    docker compose up -d --build

    URL_FINAL=$(grep "VITE_API_URL=" server/.env | cut -d= -f2-)
    echo -e "${GREEN}🚀 Aplicação instalada e rodando!${NC}"
    echo -e "${BLUE}Acesse em: $URL_FINAL${NC}"
    read -p "Pressione ENTER para voltar ao menu..."
}

# ──────────────────────────────────────────────────────────────────────────────
# 5. AÇÃO: ATUALIZAR
# ──────────────────────────────────────────────────────────────────────────────
action_update() {
    echo -e "${BLUE}Iniciando Atualização...${NC}"
    
    echo -e "${YELLOW}Baixando últimas alterações do GitHub...${NC}"
    git pull origin main

    echo -e "${BLUE}Reconstruindo e reiniciando containers...${NC}"
    docker compose up -d --build

    echo -e "${GREEN}✅ Aplicação atualizada com sucesso!${NC}"
    read -p "Pressione ENTER para voltar ao menu..."
}

# ──────────────────────────────────────────────────────────────────────────────
# EXECUÇÃO PRINCIPAL
# ──────────────────────────────────────────────────────────────────────────────

# 1. Verificar dependências antes de qualquer coisa
stravinsky_header
check_dependencies

# 2. Menu Principal
while true; do
    stravinsky_header
    echo -e "${YELLOW}SELECIONE UMA OPERAÇÃO:${NC}"
    echo "--------------------------"
    echo -e "  [1] INSTALAR  (Primeira vez / Novo Setup)"
    echo -e "  [2] ATUALIZAR (Baixar novidades e Reiniciar)"
    echo -e "  [0] SAIR"
    echo "--------------------------"
    read -p "➜ Escolha uma opção: " OPTION

    case $OPTION in
        1) action_install ;;
        2) action_update ;;
        0) echo "Saindo..."; exit 0 ;;
        *) echo -e "${RED}Opção inválida!${NC}"; sleep 1 ;;
    esac
done
