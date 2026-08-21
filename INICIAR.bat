@echo off
setlocal
cd /d "%~dp0"
title BANCA NEN

echo ==========================================
echo            B A N C A   N E N
echo ==========================================
echo.
echo   Iniciando todo automaticamente...
echo   (no tienes que escribir nada)
echo.

echo [1/5] Revisando Docker...
docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo   *** Docker no esta encendido ***
  echo.
  echo   1. Abre Docker Desktop
  echo   2. Espera a que diga "Engine running"
  echo   3. Vuelve a hacer doble clic aqui
  echo.
  pause
  exit /b 1
)
echo       OK
echo.

echo [2/5] Limpiando contenedores viejos...
docker rm -f banca_nen_postgres banca_nen_redis >nul 2>&1
echo       OK
echo.

echo [3/5] Levantando base de datos...
docker compose up -d
if errorlevel 1 (
  echo.
  echo   *** Error al levantar la base de datos ***
  echo   Mira el detalle con:  docker compose logs
  echo.
  pause
  exit /b 1
)
echo.

echo [4/5] Esperando a PostgreSQL...
set /a n=0
:esperar
set /a n+=1
docker exec banca_nen_postgres pg_isready -U banca_nen -d banca_nen >nul 2>&1
if not errorlevel 1 goto listo
if %n% GEQ 40 (
  echo.
  echo   *** PostgreSQL no respondio ***
  echo   Mira el detalle con:  docker compose logs postgres
  echo.
  pause
  exit /b 1
)
timeout /t 2 /nobreak >nul
goto esperar
:listo
echo       OK
echo.

echo [5/5] Instalando dependencias...
call pnpm install
if errorlevel 1 (
  echo.
  echo   *** Error en pnpm install ***
  echo.
  echo   Si dice que pnpm no se reconoce, ejecuta esto y reintenta:
  echo       corepack enable
  echo.
  pause
  exit /b 1
)
echo.

echo ==========================================
echo   TODO LISTO
echo.
echo   Pagina web:  http://localhost:5173
echo   API:         http://localhost:3000
echo.
echo   Para detener: Ctrl + C
echo ==========================================
echo.

start "" http://localhost:5173
call pnpm dev

echo.
pause
