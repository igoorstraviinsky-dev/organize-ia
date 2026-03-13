@echo off
echo === Iniciando Organizador ===

echo [1/3] Iniciando servidor backend...
start "Servidor Backend" cmd /k "cd /d C:\Users\goohf\Desktop\Organizador\server && npm run dev"

timeout /t 2 /nobreak >/dev/null

echo [2/3] Iniciando tunnel publico...
start "Tunnel Publico" cmd /k "C:\Users\goohf\Desktop\Organizador\start-tunnel.bat"

timeout /t 2 /nobreak >/dev/null

echo [3/3] Iniciando frontend...
start "Frontend" cmd /k "cd /d C:\Users\goohf\Desktop\Organizador\client && npm run dev"

echo.
echo Aguarde alguns segundos e acesse: http://localhost:5173
echo Webhook publico: https://organizador-app.loca.lt/api/uazapi/webhook
pause
