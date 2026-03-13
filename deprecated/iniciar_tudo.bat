@echo off
color 0A
echo ===================================================
echo       INICIANDO O ORGANIZADOR COMPLETO
echo ===================================================
echo.

echo [1/3] Iniciando o Backend (Node.js)...
start cmd /k "cd server & title Backend Organizador & npm run dev"

timeout /t 2 /nobreak > nul

echo [2/3] Iniciando o Frontend (React/Vite)...
start cmd /k "cd client & title Frontend Organizador & npm run dev"

timeout /t 2 /nobreak > nul

echo [3/3] Iniciando o Agente (Python)...
start cmd /k "cd agent & title Agente IA Organizador & iniciar_agente.bat"

echo.
echo ===================================================
echo  Tudo iniciado! Verifique as 3 novas janelas.
echo ===================================================
pause
