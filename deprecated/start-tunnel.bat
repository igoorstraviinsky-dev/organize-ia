@echo off
echo Iniciando tunnel publico para o servidor...
:loop
lt --port 3001 --subdomain organizador-app
echo Tunnel caiu, reiniciando em 3 segundos...
timeout /t 3 /nobreak >/dev/null
goto loop
