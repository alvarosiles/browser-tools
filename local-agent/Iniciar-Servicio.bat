@echo off
setlocal
title IT Support Tools - Servicio Local
cd /d "%~dp0"

echo ============================================
echo   IT Support Tools - Servicio Local
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Node.js instalado en esta PC.
    echo Descargalo desde https://nodejs.org/ e instalalo, luego
    echo vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Instalando dependencias por primera vez, un momento...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
)

echo Iniciando servicio en http://127.0.0.1:5177 ...
echo NO cierres esta ventana mientras uses la pagina web.
echo.
call npm start

echo.
echo El servicio se detuvo.
pause
