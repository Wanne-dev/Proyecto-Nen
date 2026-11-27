@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0" || exit /b 1
title BANCA NEN - Instalacion local con accesos
rem Identificador historico del stack: conserva los volumenes y las claves TOTP existentes.
set "NEN_PROJECT=nen-demo-accesos-796ed55771"
if not exist "crear-accesos.cjs" goto :incompleto
if not exist "perfil.env" goto :incompleto
if not exist "docker-compose.accesos.yml" goto :incompleto
if not exist "app\local-base.compose.yml" goto :incompleto
docker info >nul 2>&1
if errorlevel 1 goto :docker_cerrado
if /I "%~1"=="codigo" goto :codigo
if /I "%~1"=="detener" goto :detener

echo [1/2] Construyendo e iniciando la instalacion local. La primera vez tarda unos minutos.
docker compose --project-name "%NEN_PROJECT%" --env-file "perfil.env" -f "app\local-base.compose.yml" -f "docker-compose.accesos.yml" up -d --build --wait --wait-timeout 300 frontend
if errorlevel 1 goto :arranque_error

echo [2/2] Preparando las cuentas de usuario y administrador...
docker compose --project-name "%NEN_PROJECT%" --env-file "perfil.env" -f "app\local-base.compose.yml" -f "docker-compose.accesos.yml" exec -T backend node - iniciar < "crear-accesos.cjs"
if errorlevel 1 goto :acceso_error
start "" "http://banca-nen.localhost:5184/login"
goto :ok

:codigo
docker compose --project-name "%NEN_PROJECT%" --env-file "perfil.env" -f "app\local-base.compose.yml" -f "docker-compose.accesos.yml" exec -T backend node - codigo < "crear-accesos.cjs"
if errorlevel 1 goto :acceso_error
goto :ok

:detener
docker compose --project-name "%NEN_PROJECT%" --env-file "perfil.env" -f "app\local-base.compose.yml" -f "docker-compose.accesos.yml" down
if errorlevel 1 goto :arranque_error
echo Instalacion detenida. Se conservaron sus cuentas y volumenes.
goto :ok

:incompleto
echo Falta algun archivo de la instalacion en la carpeta BANCA-NEN.
echo Deben estar crear-accesos.cjs, perfil.env, docker-compose.accesos.yml y app\local-base.compose.yml.
echo Extrae todo el ZIP en una carpeta nueva antes de ejecutar INICIAR.bat.
goto :fail
:docker_cerrado
echo Abre Docker Desktop, espera a que inicie y ejecuta de nuevo.
goto :fail
:arranque_error
echo No se pudo preparar la instalacion. Actualiza Docker Desktop si Compose no acepta !override.
echo Verifica tambien que el puerto local 5184 este libre. No se detuvo otra instalacion.
goto :fail
:acceso_error
echo Revisa el mensaje anterior. Si se interrumpio el arranque, espera un minuto y ejecuta INICIAR.bat otra vez.
goto :fail
:ok
popd
echo.
pause
exit /b 0
:fail
popd
echo.
pause
exit /b 1
