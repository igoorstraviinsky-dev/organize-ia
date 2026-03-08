@echo off
echo ==============================================
echo [ SISTEMA ORGANIZADOR ] - INICIANDO AGENTE
echo ==============================================
echo.

echo 1. Buscando Python no seu computador...
set PYTHON_CMD=

:: Tenta py (launcher oficial do Windows)
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    goto :run
)

:: Tenta comando python direto
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    goto :run
)

:: Tenta buscar na pasta da Microsoft Store (Windows 10/11)
if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe" (
    set PYTHON_CMD="%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
    goto :run
)

echo.
echo [ ERRO GRAVE ] Python nao foi encontrado em nenhum local padrao do Windows!
echo Por favor, baixe e instale do site oficial: https://www.python.org/downloads/
echo ATENCAO: Na primeira tela da instalacao marque a caixa "Add python.exe to PATH"
echo.
pause
exit /b 1

:run
echo [ OK ] Python encontrado! Comando que sera usado: %PYTHON_CMD%
echo.

echo 2. Instalando as dependencias do arquivo requirements.txt...
%PYTHON_CMD% -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo Ops, erro ao tentar usar "%PYTHON_CMD% -m pip... ". Tentando comando "pip" puro...
    pip install -r requirements.txt
)

echo.
echo ==============================================
echo 3. TUDO PRONTO! INICIANDO O SERVIDOR DO AGENTE
echo ==============================================
echo.
%PYTHON_CMD% main.py

echo.
echo O agente parou de funcionar ou foi fechado.
pause
