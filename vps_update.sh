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
# 3. VERIFICAÇÃO DE INTEGRIDADE DE AMBIENTE (Princípio XI)
# ──────────────────────────────────────────────────────────────────────────────
check_env_integrity() {
    echo -e "${BLUE}[2/3] Validando integridade do ambiente...${NC}"
    
    MANDATORY_VARS=(
        "VITE_SUPABASE_URL" 
        "VITE_SUPABASE_ANON_KEY" 
        "SUPABASE_SERVICE_KEY" 
        "OPENAI_API_KEY" 
        "WAZAPI_TOKEN" 
        "WAZAPI_INSTANCE"
        "VITE_API_URL"
    )

    MISSING=0
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️ Arquivo .env não encontrado na raiz.${NC}"
        MISSING=1
    else
        for var in "${MANDATORY_VARS[@]}"; do
            val=$(grep "^$var=" .env | cut -d= -f2-)
            if [ -z "$val" ]; then
                echo -e "${RED}❌ Variável ausente ou vazia: $var${NC}"
                MISSING=1
            fi
        done
    fi

    if [ $MISSING -eq 1 ]; then
        echo -e "${YELLOW}Iniciando Setup Wizard Compulsório...${NC}"
        sleep 2
        run_setup_wizard
    else
        echo -e "${GREEN}✅ Ambiente íntegro!${NC}"
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# 4. SETUP WIZARD INTERATIVO
# ──────────────────────────────────────────────────────────────────────────────
run_setup_wizard() {
    stravinsky_header
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          ASSISTENTE DE CONFIGURAÇÃO INTERATIVO             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo -e "Este assistente irá gerar o arquivo .env mestre para todos os containers."
    echo -e "Campos vazios NÃO são aceitos para chaves críticas.\n"

    # Função para ler entrada com validação rigorosa
    read_required() {
        local var_name=$1
        local current_val=$2
        local prompt_text=$3
        local input=""
        
        while [ -z "$input" ]; do
            read -p "➜ $prompt_text [$current_val]: " input
            input="${input:-$current_val}"
            
            # Impedir valores placeholder
            if [[ "$input" == *"seu-projeto"* || "$input" == *"sua-chave"* || "$input" == *"seu_token"* ]]; then
                echo -e "${RED}   Erro: Por favor, insira um valor real.${NC}"
                input=""
            fi
            
            if [ -z "$input" ]; then
                echo -e "${RED}   Erro: Este campo é obrigatório.${NC}"
            fi
        done
        echo "$input"
    }

    # Carregar valores atuais se existirem para sugerir default
    if [ -f .env ]; then
        S_URL_CUR=$(grep "^SUPABASE_URL=" .env | cut -d= -f2-)
        S_ANON_CUR=$(grep "^VITE_SUPABASE_ANON_KEY=" .env | cut -d= -f2-)
        S_SERV_CUR=$(grep "^SUPABASE_SERVICE_KEY=" .env | cut -d= -f2-)
        O_KEY_CUR=$(grep "^OPENAI_API_KEY=" .env | cut -d= -f2-)
        W_TOK_CUR=$(grep "^WAZAPI_TOKEN=" .env | cut -d= -f2-)
        W_INS_CUR=$(grep "^WAZAPI_INSTANCE=" .env | cut -d= -f2-)
        D_DOM_CUR=$(grep "^VITE_API_URL=" .env | cut -d/ -f3 | cut -d: -f1)
    fi

    S_URL=$(read_required "S_URL" "${S_URL_CUR:-https://seu-projeto.supabase.co}" "Supabase URL")
    S_ANON=$(read_required "S_ANON" "${S_ANON_CUR:-sua-chave-anon-publica}" "Supabase Anon Key")
    S_SERV=$(read_required "S_SERV" "${S_SERV_CUR:-sua-chave-service}" "Supabase Service Key")
    O_KEY=$(read_required "O_KEY" "${O_KEY_CUR:-sk-proj-xxx}" "OpenAI API Key")
    W_TOK=$(read_required "W_TOK" "${W_TOK_CUR:-seu_token_aqui}" "UazAPI Token")
    W_INS=$(read_required "W_INS" "${W_INS_CUR:-organizador}" "UazAPI Instance Name")
    D_DOM=$(read_required "D_DOM" "${D_DOM_CUR:-localhost}" "Domínio/IP da VPS")

    CLEAN_DOM=$(echo $D_DOM | sed -e 's|^[^/]*//||' -e 's|/.*$||' | cut -d: -f1)

    # Persistência Unificada (Fonte de verdade para docker-compose)
    cat > .env <<EOF
# CONFIGURAÇÕES GERADAS PELO SETUP WIZARD EM $(date)
# FRONTEND (Build ARGs)
VITE_SUPABASE_URL=$S_URL
VITE_SUPABASE_ANON_KEY=$S_ANON
VITE_API_URL=http://$CLEAN_DOM:3001

# BACKEND (Runtime ENV)
SUPABASE_URL=$S_URL
SUPABASE_SERVICE_KEY=$S_SERV
OPENAI_API_KEY=$O_KEY
OPENAI_MODEL=gpt-4o
PORT=3001
WHATSAPP_WEBHOOK_SECRET=organizador_webhook_secret_2024

# UAZAPI
WAZAPI_URL=http://host.docker.internal:5000
WAZAPI_TOKEN=$W_TOK
WAZAPI_INSTANCE=$W_INS

# AGENT
BRAIN_URL=http://server:3001/api/agent/process
AGENT_PORT=8005
WEBHOOK_SECRET=organizador_webhook_secret_2024
EOF

    # Replicar para pastas específicas (compatibilidade)
    cp .env server/.env
    cp .env agent/.env

    echo -e "${GREEN}✅ Arquivo .env gerado com sucesso!${NC}"
    sleep 1
}

# ──────────────────────────────────────────────────────────────────────────────
# 4. AÇÃO: INSTALAR / ATUALIZAR (ZERO-BUILD)
# ──────────────────────────────────────────────────────────────────────────────
action_deploy() {
    local mode=$1
    if [ "$mode" == "install" ]; then
        echo -e "${BLUE}Iniciando Instalação Completa...${NC}"
        run_setup_wizard
    else
        echo -e "${BLUE}Iniciando Atualização (Pull do GHCR)...${NC}"
        git pull origin main
        check_env_integrity
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
check_env_integrity

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
