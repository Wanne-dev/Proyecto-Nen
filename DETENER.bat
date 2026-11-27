@echo off
setlocal EnableExtensions DisableDelayedExpansion
call "%~dp0INICIAR.bat" detener
exit /b %ERRORLEVEL%
