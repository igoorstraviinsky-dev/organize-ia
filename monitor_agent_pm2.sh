#!/bin/bash

set -e

PM2_NAME="${1:-organizador-agente}"
AGENT_PORT="${AGENT_PORT:-8005}"

echo "============================================================"
echo " MONITORAMENTO DO AGENTE PM2"
echo " Processo: $PM2_NAME"
echo "============================================================"
echo ""

if ! command -v pm2 >/dev/null 2>&1; then
  echo "ERRO: PM2 não encontrado neste servidor."
  exit 1
fi

echo "[1/3] Status do processo no PM2"
pm2 describe "$PM2_NAME" || {
  echo ""
  echo "ERRO: Processo '$PM2_NAME' não encontrado no PM2."
  exit 1
}

echo ""
echo "[2/3] Health check direto do agente"
if curl -fsS --max-time 10 "http://127.0.0.1:$AGENT_PORT/health" >/dev/null 2>&1; then
  echo "OK: agente respondeu em http://127.0.0.1:$AGENT_PORT/health"
else
  echo "AVISO: agente não respondeu em http://127.0.0.1:$AGENT_PORT/health"
fi

echo ""
echo "[3/3] Abrindo logs em tempo real"
echo "Pressione Ctrl+C para sair."
echo ""
exec pm2 logs "$PM2_NAME" --lines 100
