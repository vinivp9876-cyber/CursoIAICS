@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo   Executando o Agente Analisador de Curriculos (RH)...
echo ============================================================
echo.
node agentesAnalisador.js
echo.
pause
