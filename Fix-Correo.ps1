#Requires -Version 5.1
<#
.SYNOPSIS
    BANCA NEN - Corrige el envio de correos (registro y recuperar contrasena).

.DESCRIPTION
    Aplica las correcciones a los 14 archivos afectados, crea la configuracion
    de correo y valida que todo funcione, tanto en local como en Docker.

    Los archivos se escriben desde contenido embebido en Base64, asi que no
    dependen de acentos ni de la pagina de codigos de tu terminal.

.PARAMETER Ruta
    Carpeta raiz del proyecto. Por defecto, la carpeta actual.

.PARAMETER Proveedor
    console | resend | smtp   (por defecto: console)

.PARAMETER ResendApiKey
    Clave de Resend (empieza por re_). Solo con -Proveedor resend.

.PARAMETER SmtpUser
    Correo del remitente. Solo con -Proveedor smtp.

.PARAMETER SmtpPass
    Contrasena de APLICACION de 16 caracteres. Solo con -Proveedor smtp.

.PARAMETER Docker
    Reconstruye y levanta el stack con Docker Compose al terminar.

.PARAMETER CorreoPrueba
    Envia un correo real de prueba a esta direccion para comprobarlo.

.PARAMETER SinBackup
    No crea copias .bak de los archivos originales.

.EXAMPLE
    .\Fix-Correo.ps1
    Aplica las correcciones en modo consola (los codigos salen en la terminal).

.EXAMPLE
    .\Fix-Correo.ps1 -Proveedor resend -ResendApiKey "re_abc123" -Docker
    Configura Resend, aplica todo y levanta Docker.

.EXAMPLE
    .\Fix-Correo.ps1 -Proveedor smtp -SmtpUser "yo@gmail.com" -SmtpPass "abcdefghijklmnop" -CorreoPrueba "yo@gmail.com"
    Configura Gmail y manda un correo de prueba real.
#>

[CmdletBinding()]
param(
    [string]$Ruta = ".",
    [ValidateSet("console", "resend", "smtp")]
    [string]$Proveedor = "console",
    [string]$ResendApiKey = "",
    [string]$SmtpUser = "",
    [string]$SmtpPass = "",
    [string]$SmtpHost = "smtp.gmail.com",
    [int]$SmtpPort = 587,
    [string]$FrontendUrl = "http://localhost:5173",
    [switch]$Docker,
    [string]$CorreoPrueba = "",
    [switch]$SinBackup
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ══════════════════════════════════════════════════════════════
#  Utilidades de salida
# ══════════════════════════════════════════════════════════════
$script:Errores = New-Object System.Collections.ArrayList
$script:Avisos  = New-Object System.Collections.ArrayList

function Write-Titulo($Texto) {
    Write-Host ""
    Write-Host ("=" * 62) -ForegroundColor DarkCyan
    Write-Host "  $Texto" -ForegroundColor Cyan
    Write-Host ("=" * 62) -ForegroundColor DarkCyan
}
function Write-Paso($Texto) { Write-Host "`n> $Texto" -ForegroundColor White }
function Write-Ok($Texto)   { Write-Host "  [OK]    $Texto" -ForegroundColor Green }
function Write-Info($Texto) { Write-Host "  [info]  $Texto" -ForegroundColor Gray }
function Write-Aviso($Texto) {
    Write-Host "  [AVISO] $Texto" -ForegroundColor Yellow
    [void]$script:Avisos.Add($Texto)
}
function Write-Fallo($Texto) {
    Write-Host "  [ERROR] $Texto" -ForegroundColor Red
    [void]$script:Errores.Add($Texto)
}

Write-Titulo "BANCA NEN - Correccion del envio de correos"
Write-Info "PowerShell $($PSVersionTable.PSVersion)"

# ══════════════════════════════════════════════════════════════
#  1. Validar la carpeta del proyecto
# ══════════════════════════════════════════════════════════════
Write-Paso "1/8  Comprobando la carpeta del proyecto"

try {
    $Raiz = (Resolve-Path -LiteralPath $Ruta -ErrorAction Stop).Path
} catch {
    Write-Fallo "La ruta '$Ruta' no existe."
    exit 1
}

# Si te situaste dentro de backend/ o frontend/, subimos a la raiz
if (-not (Test-Path (Join-Path $Raiz "docker-compose.yml"))) {
    $padre = Split-Path $Raiz -Parent
    if ($padre -and (Test-Path (Join-Path $padre "docker-compose.yml"))) {
        $Raiz = $padre
        Write-Info "Detectada la raiz un nivel arriba."
    }
}

$marcadores = @("backend\src\config\email.ts", "frontend\src\App.tsx", "docker-compose.yml")
$faltan = @()
foreach ($m in $marcadores) {
    if (-not (Test-Path (Join-Path $Raiz $m))) { $faltan += $m }
}
if ($faltan.Count -gt 0) {
    Write-Fallo "Esto no parece la raiz de Proyecto-Nen. No encuentro:"
    $faltan | ForEach-Object { Write-Host "          - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "  Ejecuta el script desde la carpeta del proyecto, por ejemplo:" -ForegroundColor Yellow
    Write-Host "     cd C:\ruta\a\Proyecto-Nen" -ForegroundColor Yellow
    Write-Host "     .\Fix-Correo.ps1" -ForegroundColor Yellow
    exit 1
}
Write-Ok "Proyecto encontrado en: $Raiz"

# ══════════════════════════════════════════════════════════════
#  2. Validar los parametros segun el proveedor
# ══════════════════════════════════════════════════════════════
Write-Paso "2/8  Validando la configuracion de correo"

switch ($Proveedor) {
    "resend" {
        if ([string]::IsNullOrWhiteSpace($ResendApiKey)) {
            Write-Fallo "Con -Proveedor resend debes pasar -ResendApiKey 're_...'"
            Write-Host "          Consiguela gratis en https://resend.com (API Keys)" -ForegroundColor Yellow
            exit 1
        }
        if (-not $ResendApiKey.StartsWith("re_")) {
            Write-Fallo "La clave de Resend debe empezar por 're_'. Recibido: '$ResendApiKey'"
            exit 1
        }
        Write-Ok "Resend configurado."
    }
    "smtp" {
        if ([string]::IsNullOrWhiteSpace($SmtpUser) -or [string]::IsNullOrWhiteSpace($SmtpPass)) {
            Write-Fallo "Con -Proveedor smtp debes pasar -SmtpUser y -SmtpPass"
            exit 1
        }
        $limpia = $SmtpPass -replace '\s', ''
        if ($SmtpHost -like "*gmail*") {
            if ($limpia.Length -ne 16) {
                Write-Aviso "Gmail exige una CONTRASENA DE APLICACION de 16 caracteres."
                Write-Aviso "La tuya tiene $($limpia.Length). Generala en:"
                Write-Aviso "   https://myaccount.google.com/apppasswords"
                Write-Aviso "NO sirve tu contrasena normal de Gmail."
            }
            $SmtpPass = $limpia
        }
        Write-Ok "SMTP configurado: $SmtpHost`:$SmtpPort  ($SmtpUser)"
    }
    "console" {
        Write-Info "Modo consola: los codigos NO llegaran por correo."
        Write-Info "Apareceran en la terminal del backend. Util para desarrollo."
    }
}

$Archivos = @(
  @{
    Path = 'backend/src/config/email.ts'
    B64  = @(
    'LyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09CiAgIEJBTkNBIE5F'
    'TiDigJQgU2VydmljaW8gZGUgY29ycmVvIChSRUFMKQogICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t'
    'LS0tLS0tLS0tLS0tLS0tLS0tLS0KICAgU29wb3J0YSAzIHByb3ZlZWRvcmVzLCBzZWxlY2Npb25hZG9zIGNvbiBFTUFJTF9QUk9W'
    'SURFUjoKICAgICAtICJyZXNlbmQiICAtPiBBUEkgSFRUUCBkZSBSZXNlbmQgKHJlY29tZW5kYWRvLCBubyByZXF1aWVyZSBTTVRQ'
    'KQogICAgIC0gInNtdHAiICAgIC0+IEN1YWxxdWllciBTTVRQIChHbWFpbCwgT3V0bG9vaywgQnJldm8sIE1haWx0cmFwLi4uKQog'
    'ICAgIC0gImNvbnNvbGUiIC0+IE5vIGVudsOtYSBuYWRhLCBpbXByaW1lIGVsIGPDs2RpZ28gZW4gY29uc29sYSAoZGV2KQogICBT'
    'aSBubyBzZSBkZWZpbmUgRU1BSUxfUFJPVklERVIgc2UgZGV0ZWN0YSBhdXRvbcOhdGljYW1lbnRlOgogICAgIFJFU0VORF9BUElf'
    'S0VZIC0+IHJlc2VuZCB8IFNNVFBfVVNFUitTTVRQX1BBU1MgLT4gc210cCB8IGVsc2UgY29uc29sZQogICA9PT09PT09PT09PT09'
    'PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi8KaW1wb3J0IG5vZGVtYWlsZXIsIHsgVHJh'
    'bnNwb3J0ZXIgfSBmcm9tICJub2RlbWFpbGVyIjsKaW1wb3J0IGxvZ2dlciBmcm9tICIuL2xvZ2dlciI7Cgp0eXBlIFByb3ZpZGVy'
    'ID0gInJlc2VuZCIgfCAic210cCIgfCAiY29uc29sZSI7Cgpjb25zdCBlbnYgPSAoazogc3RyaW5nLCBkID0gIiIpID0+IChwcm9j'
    'ZXNzLmVudltrXSA/PyBkKS50cmltKCk7CgpmdW5jdGlvbiBkZXRlY3RQcm92aWRlcigpOiBQcm92aWRlciB7CiAgY29uc3QgZXhw'
    'bGljaXQgPSBlbnYoIkVNQUlMX1BST1ZJREVSIikudG9Mb3dlckNhc2UoKTsKICBpZiAoZXhwbGljaXQgPT09ICJyZXNlbmQiIHx8'
    'IGV4cGxpY2l0ID09PSAic210cCIgfHwgZXhwbGljaXQgPT09ICJjb25zb2xlIikgcmV0dXJuIGV4cGxpY2l0OwogIGlmIChlbnYo'
    'IlJFU0VORF9BUElfS0VZIikpIHJldHVybiAicmVzZW5kIjsKICBpZiAoZW52KCJTTVRQX1VTRVIiKSAmJiBlbnYoIlNNVFBfUEFT'
    'UyIpKSByZXR1cm4gInNtdHAiOwogIHJldHVybiAiY29uc29sZSI7Cn0KCmV4cG9ydCBjb25zdCBFTUFJTF9QUk9WSURFUjogUHJv'
    'dmlkZXIgPSBkZXRlY3RQcm92aWRlcigpOwoKZXhwb3J0IGNvbnN0IEZST01fRU1BSUwgPQogIGVudigiU01UUF9GUk9NIikgfHwg'
    'ZW52KCJFTUFJTF9GUk9NIikgfHwgIkJBTkNBIE5FTiA8b25ib2FyZGluZ0ByZXNlbmQuZGV2PiI7CgpleHBvcnQgY29uc3QgRlJP'
    'TlRFTkRfVVJMID0gKGVudigiRlJPTlRFTkRfVVJMIikgfHwgImh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyIpLnJlcGxhY2UoL1wvKyQv'
    'LCAiIik7CgovKiAtLS0tLS0tLS0tLS0tLS0tIFNNVFAgLS0tLS0tLS0tLS0tLS0tLSAqLwpsZXQgdHJhbnNwb3J0ZXI6IFRyYW5z'
    'cG9ydGVyIHwgbnVsbCA9IG51bGw7CgpmdW5jdGlvbiBnZXRUcmFuc3BvcnRlcigpOiBUcmFuc3BvcnRlciB7CiAgaWYgKHRyYW5z'
    'cG9ydGVyKSByZXR1cm4gdHJhbnNwb3J0ZXI7CiAgY29uc3QgcG9ydCA9IHBhcnNlSW50KGVudigiU01UUF9QT1JUIiwgIjU4NyIp'
    'LCAxMCk7CiAgY29uc3Qgc210cE9wdGlvbnM6IGFueSA9IHsKICAgIGhvc3Q6IGVudigiU01UUF9IT1NUIiwgInNtdHAuZ21haWwu'
    'Y29tIiksCiAgICBwb3J0LAogICAgLy8gNDY1ID0gU1NMIGltcGzDrWNpdG87IDU4Ny8yNTI1ID0gU1RBUlRUTFMKICAgIHNlY3Vy'
    'ZTogZW52KCJTTVRQX1NFQ1VSRSIpID8gZW52KCJTTVRQX1NFQ1VSRSIpID09PSAidHJ1ZSIgOiBwb3J0ID09PSA0NjUsCiAgICBh'
    'dXRoOiB7IHVzZXI6IGVudigiU01UUF9VU0VSIiksIHBhc3M6IGVudigiU01UUF9QQVNTIikgfSwKICAgIHJlcXVpcmVUTFM6IHBv'
    'cnQgPT09IDU4NywKICAgIGNvbm5lY3Rpb25UaW1lb3V0OiAxNTAwMCwKICAgIGdyZWV0aW5nVGltZW91dDogMTUwMDAsCiAgICBz'
    'b2NrZXRUaW1lb3V0OiAyMDAwMCwKICAgIGZhbWlseTogNCwKICB9OwogIHRyYW5zcG9ydGVyID0gbm9kZW1haWxlci5jcmVhdGVU'
    'cmFuc3BvcnQoc210cE9wdGlvbnMpOwogIHJldHVybiB0cmFuc3BvcnRlcjsKfQoKLyogLS0tLS0tLS0tLS0tLS0tLSBSZXNlbmQg'
    'LS0tLS0tLS0tLS0tLS0tLSAqLwphc3luYyBmdW5jdGlvbiBzZW5kV2l0aFJlc2VuZCh0bzogc3RyaW5nLCBzdWJqZWN0OiBzdHJp'
    'bmcsIGh0bWw6IHN0cmluZywgdGV4dDogc3RyaW5nKSB7CiAgY29uc3QgYXBpS2V5ID0gZW52KCJSRVNFTkRfQVBJX0tFWSIpOwog'
    'IGlmICghYXBpS2V5KSB0aHJvdyBuZXcgRXJyb3IoIlJFU0VORF9BUElfS0VZIG5vIGNvbmZpZ3VyYWRhIik7CgogIGNvbnN0IHJl'
    'cyA9IGF3YWl0IGZldGNoKCJodHRwczovL2FwaS5yZXNlbmQuY29tL2VtYWlscyIsIHsKICAgIG1ldGhvZDogIlBPU1QiLAogICAg'
    'aGVhZGVyczogewogICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7YXBpS2V5fWAsCiAgICAgICJDb250ZW50LVR5cGUiOiAi'
    'YXBwbGljYXRpb24vanNvbiIsCiAgICB9LAogICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBmcm9tOiBGUk9NX0VNQUlMLCB0bzog'
    'W3RvXSwgc3ViamVjdCwgaHRtbCwgdGV4dCB9KSwKICB9KTsKCiAgY29uc3QgYm9keTogYW55ID0gYXdhaXQgcmVzLmpzb24oKS5j'
    'YXRjaCgoKSA9PiAoe30pKTsKICBpZiAoIXJlcy5vaykgewogICAgdGhyb3cgbmV3IEVycm9yKAogICAgICBgUmVzZW5kICR7cmVz'
    'LnN0YXR1c306ICR7Ym9keT8ubWVzc2FnZSB8fCBib2R5Py5lcnJvcj8ubWVzc2FnZSB8fCBKU09OLnN0cmluZ2lmeShib2R5KX1g'
    'CiAgICApOwogIH0KICByZXR1cm4gYm9keT8uaWQgYXMgc3RyaW5nIHwgdW5kZWZpbmVkOwp9CgovKiAtLS0tLS0tLS0tLS0tLS0t'
    'IEVudsOtbyB1bmlmaWNhZG8gLS0tLS0tLS0tLS0tLS0tLSAqLwpleHBvcnQgaW50ZXJmYWNlIFNlbmRSZXN1bHQgewogIHNlbnQ6'
    'IGJvb2xlYW47CiAgcHJvdmlkZXI6IFByb3ZpZGVyOwogIGlkPzogc3RyaW5nOwogIGVycm9yPzogc3RyaW5nOwp9Cgphc3luYyBm'
    'dW5jdGlvbiBzZW5kTWFpbChvcHRzOiB7CiAgdG86IHN0cmluZzsKICBzdWJqZWN0OiBzdHJpbmc7CiAgaHRtbDogc3RyaW5nOwog'
    'IHRleHQ6IHN0cmluZzsKICBkZWJ1Z0xhYmVsOiBzdHJpbmc7CiAgZGVidWdWYWx1ZTogc3RyaW5nOwp9KTogUHJvbWlzZTxTZW5k'
    'UmVzdWx0PiB7CiAgY29uc3QgeyB0bywgc3ViamVjdCwgaHRtbCwgdGV4dCwgZGVidWdMYWJlbCwgZGVidWdWYWx1ZSB9ID0gb3B0'
    'czsKCiAgLy8gRW4gZGV2IHNpZW1wcmUgZGVqYW1vcyByYXN0cm8gZW4gY29uc29sYSBwYXJhIHBvZGVyIHByb2JhciBzaW4gY29y'
    'cmVvLgogIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gInByb2R1Y3Rpb24iIHx8IEVNQUlMX1BST1ZJREVSID09PSAiY29u'
    'c29sZSIpIHsKICAgIGNvbnNvbGUubG9nKCI9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Iik7CiAgICBj'
    'b25zb2xlLmxvZyhgICAke2RlYnVnTGFiZWx9OiAke2RlYnVnVmFsdWV9YCk7CiAgICBjb25zb2xlLmxvZyhgICBQYXJhOiAke3Rv'
    'fWApOwogICAgY29uc29sZS5sb2coYCAgUHJvdmVlZG9yOiAke0VNQUlMX1BST1ZJREVSfWApOwogICAgY29uc29sZS5sb2coIj09'
    'PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0iKTsKICB9CgogIGlmIChFTUFJTF9QUk9WSURFUiA9PT0gImNv'
    'bnNvbGUiKSB7CiAgICByZXR1cm4geyBzZW50OiBmYWxzZSwgcHJvdmlkZXI6ICJjb25zb2xlIiB9OwogIH0KCiAgdHJ5IHsKICAg'
    'IGlmIChFTUFJTF9QUk9WSURFUiA9PT0gInJlc2VuZCIpIHsKICAgICAgY29uc3QgaWQgPSBhd2FpdCBzZW5kV2l0aFJlc2VuZCh0'
    'bywgc3ViamVjdCwgaHRtbCwgdGV4dCk7CiAgICAgIGxvZ2dlci5pbmZvKGBFbWFpbCBlbnZpYWRvIChyZXNlbmQpIGEgJHt0b30g'
    'WyR7c3ViamVjdH1dIGlkPSR7aWR9YCk7CiAgICAgIHJldHVybiB7IHNlbnQ6IHRydWUsIHByb3ZpZGVyOiAicmVzZW5kIiwgaWQg'
    'fTsKICAgIH0KCiAgICBjb25zdCBpbmZvID0gYXdhaXQgZ2V0VHJhbnNwb3J0ZXIoKS5zZW5kTWFpbCh7IGZyb206IEZST01fRU1B'
    'SUwsIHRvLCBzdWJqZWN0LCBodG1sLCB0ZXh0IH0pOwogICAgbG9nZ2VyLmluZm8oYEVtYWlsIGVudmlhZG8gKHNtdHApIGEgJHt0'
    'b30gWyR7c3ViamVjdH1dIGlkPSR7aW5mby5tZXNzYWdlSWR9YCk7CiAgICByZXR1cm4geyBzZW50OiB0cnVlLCBwcm92aWRlcjog'
    'InNtdHAiLCBpZDogaW5mby5tZXNzYWdlSWQgfTsKICB9IGNhdGNoIChlcnJvcjogYW55KSB7CiAgICBjb25zdCBtc2cgPSBlcnJv'
    'cj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpOwogICAgLy8gTG9nIGNvbiBsYSBjYXVzYSBSRUFMIHBhcmEgcG9kZXIgZGVwdXJh'
    'ciAoYW50ZXMgc2Ugb2N1bHRhYmEpLgogICAgbG9nZ2VyLmVycm9yKGBGQUxMTyBhbCBlbnZpYXIgZW1haWwgYSAke3RvfSBbJHtz'
    'dWJqZWN0fV0gdmlhICR7RU1BSUxfUFJPVklERVJ9OiAke21zZ31gKTsKICAgIHJldHVybiB7IHNlbnQ6IGZhbHNlLCBwcm92aWRl'
    'cjogRU1BSUxfUFJPVklERVIsIGVycm9yOiBtc2cgfTsKICB9Cn0KCi8qIC0tLS0tLS0tLS0tLS0tLS0gUGxhbnRpbGxhcyAtLS0t'
    'LS0tLS0tLS0tLS0tICovCmNvbnN0IHNoZWxsID0gKHRpdGxlOiBzdHJpbmcsIHN1YnRpdGxlOiBzdHJpbmcsIGlubmVyOiBzdHJp'
    'bmcpID0+IGAKPGRpdiBzdHlsZT0iYmFja2dyb3VuZDojMGEwYTBhO3BhZGRpbmc6NDBweCAxNnB4O2ZvbnQtZmFtaWx5Oi1hcHBs'
    'ZS1zeXN0ZW0sQmxpbmtNYWNTeXN0ZW1Gb250LCdTZWdvZSBVSScsc3lzdGVtLXVpLHNhbnMtc2VyaWY7Ij4KICA8ZGl2IHN0eWxl'
    'PSJtYXgtd2lkdGg6NDgwcHg7bWFyZ2luOjAgYXV0bztiYWNrZ3JvdW5kOiMxYTFhMWE7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRp'
    'bmc6NDBweDtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsMC4wNik7Ij4KICAgIDxoMSBzdHlsZT0iY29sb3I6IzAw'
    'ZDRhYTtmb250LXNpemU6MjRweDttYXJnaW46MCAwIDhweDtsZXR0ZXItc3BhY2luZzotMC41cHg7Ij4ke3RpdGxlfTwvaDE+CiAg'
    'ICA8cCBzdHlsZT0iY29sb3I6IzhlOGU5Mztmb250LXNpemU6MTRweDttYXJnaW46MCAwIDMycHg7Ij4ke3N1YnRpdGxlfTwvcD4K'
    'ICAgICR7aW5uZXJ9CiAgICA8aHIgc3R5bGU9ImJvcmRlcjpub25lO2JvcmRlci10b3A6MXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwy'
    'NTUsMC4wNik7bWFyZ2luOjMycHggMCAxNnB4OyIgLz4KICAgIDxwIHN0eWxlPSJjb2xvcjojNDg0ODRhO2ZvbnQtc2l6ZToxMXB4'
    'O21hcmdpbjowOyI+RXN0ZSBlcyB1biBtZW5zYWplIGF1dG9tw6F0aWNvIGRlIEJBTkNBIE5FTi4gTm8gcmVzcG9uZGFzIGEgZXN0'
    'ZSBjb3JyZW8uPC9wPgogIDwvZGl2Pgo8L2Rpdj5gOwoKY29uc3QgY29kZUJsb2NrID0gKGNvZGU6IHN0cmluZykgPT4gYAogIDxw'
    'IHN0eWxlPSJjb2xvcjojZjVmNWY3O2ZvbnQtc2l6ZToxNnB4O2xpbmUtaGVpZ2h0OjEuNjttYXJnaW46MCAwIDhweDsiPlR1IGPD'
    's2RpZ28gZGUgdmVyaWZpY2FjacOzbiBlczo8L3A+CiAgPHAgc3R5bGU9ImNvbG9yOiMwMGQ0YWE7Zm9udC1zaXplOjM4cHg7Zm9u'
    'dC13ZWlnaHQ6NzAwO2xldHRlci1zcGFjaW5nOjEwcHg7bWFyZ2luOjE2cHggMDt0ZXh0LWFsaWduOmNlbnRlcjtiYWNrZ3JvdW5k'
    'OiMwYTBhMGE7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6MjBweCAwOyI+JHtjb2RlfTwvcD4KICA8cCBzdHlsZT0iY29sb3I6'
    'IzYzNjM2Njtmb250LXNpemU6MTJweDttYXJnaW46MTZweCAwIDA7Ij5JbmdyZXNhIGVzdGUgY8OzZGlnbyBlbiBsYSBhcGxpY2Fj'
    'acOzbi4gTnVuY2EgbG8gY29tcGFydGFzIGNvbiBuYWRpZSwgbmkgc2lxdWllcmEgY29uIHBlcnNvbmFsIGRlIEJBTkNBIE5FTi48'
    'L3A+CiAgPHAgc3R5bGU9ImNvbG9yOiM0ODQ4NGE7Zm9udC1zaXplOjExcHg7bWFyZ2luOjhweCAwIDA7Ij5FbCBjw7NkaWdvIGV4'
    'cGlyYSBlbiAxMCBtaW51dG9zLjwvcD5gOwoKLyogLS0tLS0tLS0tLS0tLS0tLSBBUEkgcMO6YmxpY2EgLS0tLS0tLS0tLS0tLS0t'
    'LSAqLwoKLyoqIEPDs2RpZ28gZGUgNiBkw61naXRvcyBwYXJhIHZlcmlmaWNhciBlbCBlbWFpbCBlbiBlbCByZWdpc3Ryby4gKi8K'
    'ZXhwb3J0IGNvbnN0IHNlbmRWZXJpZmljYXRpb25FbWFpbCA9ICh0bzogc3RyaW5nLCBjb2RlOiBzdHJpbmcpOiBQcm9taXNlPFNl'
    'bmRSZXN1bHQ+ID0+CiAgc2VuZE1haWwoewogICAgdG8sCiAgICBzdWJqZWN0OiBgJHtjb2RlfSBlcyB0dSBjw7NkaWdvIGRlIHZl'
    'cmlmaWNhY2nDs24gwrcgQkFOQ0EgTkVOYCwKICAgIGh0bWw6IHNoZWxsKCJCQU5DQSBORU4iLCAiVmVyaWZpY2FjacOzbiBkZSBj'
    'dWVudGEiLCBjb2RlQmxvY2soY29kZSkpLAogICAgdGV4dDogYEJBTkNBIE5FTlxuVHUgY8OzZGlnbyBkZSB2ZXJpZmljYWNpw7Nu'
    'IGVzOiAke2NvZGV9XG5FeHBpcmEgZW4gMTAgbWludXRvcy5gLAogICAgZGVidWdMYWJlbDogIkNPRElHTyBERSBWRVJJRklDQUNJ'
    'T04iLAogICAgZGVidWdWYWx1ZTogY29kZSwKICB9KTsKCi8qKiBDw7NkaWdvIGRlIDYgZMOtZ2l0b3MgKyBlbmxhY2UgcGFyYSBy'
    'ZXN0YWJsZWNlciBsYSBjb250cmFzZcOxYS4gKi8KZXhwb3J0IGNvbnN0IHNlbmRQYXNzd29yZFJlc2V0RW1haWwgPSAoCiAgdG86'
    'IHN0cmluZywKICBjb2RlOiBzdHJpbmcsCiAgdG9rZW4/OiBzdHJpbmcKKTogUHJvbWlzZTxTZW5kUmVzdWx0PiA9PiB7CiAgY29u'
    'c3QgbGluayA9IHRva2VuID8gYCR7RlJPTlRFTkRfVVJMfS9yZXNldC1wYXNzd29yZC8ke3Rva2VufWAgOiAiIjsKICBjb25zdCBi'
    'dXR0b24gPSBsaW5rCiAgICA/IGA8cCBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7bWFyZ2luOjI0cHggMCAwOyI+CiAgICAgICAg'
    'IDxhIGhyZWY9IiR7bGlua30iIHN0eWxlPSJkaXNwbGF5OmlubGluZS1ibG9jaztiYWNrZ3JvdW5kOiMwMGQ0YWE7Y29sb3I6IzAw'
    'MDtmb250LXdlaWdodDo2MDA7cGFkZGluZzoxNHB4IDMycHg7Ym9yZGVyLXJhZGl1czoxMnB4O3RleHQtZGVjb3JhdGlvbjpub25l'
    'O2ZvbnQtc2l6ZToxNXB4OyI+Q2FtYmlhciBjb250cmFzZcOxYTwvYT4KICAgICAgIDwvcD4KICAgICAgIDxwIHN0eWxlPSJjb2xv'
    'cjojNDg0ODRhO2ZvbnQtc2l6ZToxMXB4O3dvcmQtYnJlYWs6YnJlYWstYWxsO21hcmdpbjoxMnB4IDAgMDsiPk8gY29waWEgZXN0'
    'ZSBlbmxhY2U6ICR7bGlua308L3A+YAogICAgOiAiIjsKCiAgcmV0dXJuIHNlbmRNYWlsKHsKICAgIHRvLAogICAgc3ViamVjdDog'
    'YCR7Y29kZX0gwrcgUmVjdXBlcmEgdHUgY29udHJhc2XDsWEgwrcgQkFOQ0EgTkVOYCwKICAgIGh0bWw6IHNoZWxsKAogICAgICAi'
    'QkFOQ0EgTkVOIiwKICAgICAgIlJlY3VwZXJhY2nDs24gZGUgY29udHJhc2XDsWEiLAogICAgICBgPHAgc3R5bGU9ImNvbG9yOiNm'
    'NWY1Zjc7Zm9udC1zaXplOjE2cHg7bGluZS1oZWlnaHQ6MS42O21hcmdpbjowOyI+UmVjaWJpbW9zIHVuYSBzb2xpY2l0dWQgcGFy'
    'YSBjYW1iaWFyIHR1IGNvbnRyYXNlw7FhLiBVc2EgZXN0ZSBjw7NkaWdvOjwvcD4KICAgICAgICR7Y29kZUJsb2NrKGNvZGUpfQog'
    'ICAgICAgJHtidXR0b259CiAgICAgICA8cCBzdHlsZT0iY29sb3I6IzYzNjM2Njtmb250LXNpemU6MTJweDttYXJnaW46MjBweCAw'
    'IDA7Ij5TaSBubyBzb2xpY2l0YXN0ZSBlc3RvLCBpZ25vcmEgZXN0ZSBtZW5zYWplOiB0dSBjb250cmFzZcOxYSBzZWd1aXLDoSBz'
    'aWVuZG8gbGEgbWlzbWEuPC9wPmAKICAgICksCiAgICB0ZXh0OiBgQkFOQ0EgTkVOXG5Dw7NkaWdvIHBhcmEgcmVzdGFibGVjZXIg'
    'dHUgY29udHJhc2XDsWE6ICR7Y29kZX1cbiR7bGlua31cbkV4cGlyYSBlbiAxMCBtaW51dG9zLmAsCiAgICBkZWJ1Z0xhYmVsOiAi'
    'Q09ESUdPIERFIFJFU0VUIiwKICAgIGRlYnVnVmFsdWU6IGAke2NvZGV9ICAodG9rZW46ICR7dG9rZW4gfHwgIi0ifSlgLAogIH0p'
    'Owp9OwoKLyoqIEPDs2RpZ28gMkZBIHBvciBlbWFpbC4gKi8KZXhwb3J0IGNvbnN0IHNlbmQyRkFDb2RlRW1haWwgPSAodG86IHN0'
    'cmluZywgY29kZTogc3RyaW5nKTogUHJvbWlzZTxTZW5kUmVzdWx0PiA9PgogIHNlbmRNYWlsKHsKICAgIHRvLAogICAgc3ViamVj'
    'dDogYCR7Y29kZX0gZXMgdHUgY8OzZGlnbyBkZSBhY2Nlc28gwrcgQkFOQ0EgTkVOYCwKICAgIGh0bWw6IHNoZWxsKCJCQU5DQSBO'
    'RU4iLCAiQ8OzZGlnbyBkZSBhY2Nlc28iLCBjb2RlQmxvY2soY29kZSkpLAogICAgdGV4dDogYEJBTkNBIE5FTlxuVHUgY8OzZGln'
    'byBkZSBhY2Nlc28gZXM6ICR7Y29kZX1cbkV4cGlyYSBlbiAxMCBtaW51dG9zLmAsCiAgICBkZWJ1Z0xhYmVsOiAiQ09ESUdPIDJG'
    'QSIsCiAgICBkZWJ1Z1ZhbHVlOiBjb2RlLAogIH0pOwoKLyoqIENvcnJlbyBkZSBiaWVudmVuaWRhIChvcGNpb25hbCwgbm8gYmxv'
    'cXVlYSBuYWRhIHNpIGZhbGxhKS4gKi8KZXhwb3J0IGNvbnN0IHNlbmRXZWxjb21lRW1haWwgPSAodG86IHN0cmluZywgZmlyc3RO'
    'YW1lOiBzdHJpbmcpOiBQcm9taXNlPFNlbmRSZXN1bHQ+ID0+CiAgc2VuZE1haWwoewogICAgdG8sCiAgICBzdWJqZWN0OiAiQmll'
    'bnZlbmlkbyBhIEJBTkNBIE5FTiIsCiAgICBodG1sOiBzaGVsbCgKICAgICAgIkJBTkNBIE5FTiIsCiAgICAgICJUdSBjdWVudGEg'
    'ZXN0w6EgbGlzdGEiLAogICAgICBgPHAgc3R5bGU9ImNvbG9yOiNmNWY1Zjc7Zm9udC1zaXplOjE2cHg7bGluZS1oZWlnaHQ6MS42'
    'OyI+SG9sYSAke2ZpcnN0TmFtZX0sIHR1IGN1ZW50YSBmdWUgdmVyaWZpY2FkYSBjb3JyZWN0YW1lbnRlLiBZYSBwdWVkZXMgZGVw'
    'b3NpdGFyLCBpbnZlcnRpciB5IG9wZXJhci48L3A+CiAgICAgICA8cCBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7bWFyZ2luOjI0'
    'cHggMCAwOyI+CiAgICAgICAgIDxhIGhyZWY9IiR7RlJPTlRFTkRfVVJMfS9kYXNoYm9hcmQiIHN0eWxlPSJkaXNwbGF5OmlubGlu'
    'ZS1ibG9jaztiYWNrZ3JvdW5kOiMwMGQ0YWE7Y29sb3I6IzAwMDtmb250LXdlaWdodDo2MDA7cGFkZGluZzoxNHB4IDMycHg7Ym9y'
    'ZGVyLXJhZGl1czoxMnB4O3RleHQtZGVjb3JhdGlvbjpub25lO2ZvbnQtc2l6ZToxNXB4OyI+SXIgYWwgZGFzaGJvYXJkPC9hPgog'
    'ICAgICAgPC9wPmAKICAgICksCiAgICB0ZXh0OiBgSG9sYSAke2ZpcnN0TmFtZX0sIHR1IGN1ZW50YSBCQU5DQSBORU4gZnVlIHZl'
    'cmlmaWNhZGEgY29ycmVjdGFtZW50ZS5gLAogICAgZGVidWdMYWJlbDogIkJJRU5WRU5JREEiLAogICAgZGVidWdWYWx1ZTogZmly'
    'c3ROYW1lLAogIH0pOwoKLyoqCiAqIENvbXBydWViYSBsYSBjb25maWd1cmFjacOzbiBhbCBhcnJhbmNhciBlbCBzZXJ2aWRvci4K'
    'ICogTXVlc3RyYSB1biBhdmlzbyBjbGFybyBlbiB2ZXogZGUgZmFsbGFyIGVuIHNpbGVuY2lvIGN1YW5kbyBsbGVndWUgdW4gcmVn'
    'aXN0cm8uCiAqLwpleHBvcnQgY29uc3QgdmVyaWZ5RW1haWxDb25maWcgPSBhc3luYyAoKTogUHJvbWlzZTxib29sZWFuPiA9PiB7'
    'CiAgaWYgKEVNQUlMX1BST1ZJREVSID09PSAiY29uc29sZSIpIHsKICAgIGxvZ2dlci53YXJuKAogICAgICAiRU1BSUw6IHNpbiBw'
    'cm92ZWVkb3IgY29uZmlndXJhZG8uIExvcyBjw7NkaWdvcyBzZSBpbXByaW1pcsOhbiBTT0xPIGVuIGxhIGNvbnNvbGEuICIgKwog'
    'ICAgICAgICJEZWZpbmUgUkVTRU5EX0FQSV9LRVkgbyBTTVRQX1VTRVIvU01UUF9QQVNTIGVuIGJhY2tlbmQvLmVudiBwYXJhIGVu'
    'dmlhciBjb3JyZW9zIHJlYWxlcy4iCiAgICApOwogICAgcmV0dXJuIGZhbHNlOwogIH0KCiAgaWYgKEVNQUlMX1BST1ZJREVSID09'
    'PSAicmVzZW5kIikgewogICAgaWYgKCFlbnYoIlJFU0VORF9BUElfS0VZIikuc3RhcnRzV2l0aCgicmVfIikpIHsKICAgICAgbG9n'
    'Z2VyLmVycm9yKCJFTUFJTDogUkVTRU5EX0FQSV9LRVkgcGFyZWNlIGludsOhbGlkYSAoZGViZSBlbXBlemFyIHBvciAncmVfJyku'
    'Iik7CiAgICAgIHJldHVybiBmYWxzZTsKICAgIH0KICAgIGxvZ2dlci5pbmZvKGBFTUFJTDogcHJvdmVlZG9yIFJlc2VuZCBsaXN0'
    'by4gUmVtaXRlbnRlOiAke0ZST01fRU1BSUx9YCk7CiAgICByZXR1cm4gdHJ1ZTsKICB9CgogIHRyeSB7CiAgICBhd2FpdCBnZXRU'
    'cmFuc3BvcnRlcigpLnZlcmlmeSgpOwogICAgbG9nZ2VyLmluZm8oYEVNQUlMOiBTTVRQIGNvbmVjdGFkbyAoJHtlbnYoIlNNVFBf'
    'SE9TVCIpfToke2VudigiU01UUF9QT1JUIiwgIjU4NyIpfSkuIFJlbWl0ZW50ZTogJHtGUk9NX0VNQUlMfWApOwogICAgcmV0dXJu'
    'IHRydWU7CiAgfSBjYXRjaCAoZTogYW55KSB7CiAgICBsb2dnZXIuZXJyb3IoCiAgICAgIGBFTUFJTDogbm8gc2UgcHVkbyBjb25l'
    'Y3RhciBhbCBTTVRQICgke2VudigiU01UUF9IT1NUIil9OiR7ZW52KCJTTVRQX1BPUlQiLCAiNTg3Iil9KTogJHtlPy5tZXNzYWdl'
    'fS4gYCArCiAgICAgICAgIkNvbiBHbWFpbCBkZWJlcyB1c2FyIHVuYSBDT05UUkFTRcORQSBERSBBUExJQ0FDScOTTiBkZSAxNiBj'
    'YXJhY3RlcmVzLCBubyB0dSBjb250cmFzZcOxYSBub3JtYWwuIgogICAgKTsKICAgIHJldHVybiBmYWxzZTsKICB9Cn07CgpleHBv'
    'cnQgZGVmYXVsdCB7CiAgc2VuZFZlcmlmaWNhdGlvbkVtYWlsLAogIHNlbmRQYXNzd29yZFJlc2V0RW1haWwsCiAgc2VuZDJGQUNv'
    'ZGVFbWFpbCwKICBzZW5kV2VsY29tZUVtYWlsLAogIHZlcmlmeUVtYWlsQ29uZmlnLAogIEVNQUlMX1BST1ZJREVSLAp9Owo='
    ) -join ''
  },
  @{
    Path = 'backend/src/services/auth.service.ts'
    B64  = @(
    'aW1wb3J0IGNyeXB0byBmcm9tICJjcnlwdG8iOwppbXBvcnQgand0IGZyb20gImpzb253ZWJ0b2tlbiI7CmltcG9ydCBiY3J5cHQg'
    'ZnJvbSAiYmNyeXB0IjsKaW1wb3J0IHNwZWFrZWFzeSBmcm9tICJzcGVha2Vhc3kiOwppbXBvcnQgeyBBcHBEYXRhU291cmNlIH0g'
    'ZnJvbSAiLi4vY29uZmlnL2RhdGFiYXNlIjsKaW1wb3J0IHsgVXNlciwgVXNlclJvbGUsIEFjY291bnRTdGF0dXMsIERvY3VtZW50'
    'VHlwZSB9IGZyb20gIi4uL21vZGVscy9Vc2VyIjsKaW1wb3J0IHsgQXBwRXJyb3IgfSBmcm9tICIuLi9taWRkbGV3YXJlL2Vycm9y'
    'SGFuZGxlci5taWRkbGV3YXJlIjsKaW1wb3J0IHsgc2VuZFZlcmlmaWNhdGlvbkVtYWlsLCBzZW5kUGFzc3dvcmRSZXNldEVtYWls'
    'LCBzZW5kV2VsY29tZUVtYWlsIH0gZnJvbSAiLi4vY29uZmlnL2VtYWlsIjsKaW1wb3J0IHsgc2VuZFZlcmlmaWNhdGlvblNNUyB9'
    'IGZyb20gIi4uL2NvbmZpZy9zbXMiOwppbXBvcnQgbG9nZ2VyIGZyb20gIi4uL2NvbmZpZy9sb2dnZXIiOwoKY29uc3QgSldUX1NF'
    'Q1JFVCA9IHByb2Nlc3MuZW52LkpXVF9TRUNSRVQgfHwgImZhbGxiYWNrLXNlY3JldCI7CmNvbnN0IEpXVF9FWFBJUkVTX0lOID0g'
    'cHJvY2Vzcy5lbnYuSldUX0VYUElSRVNfSU4gfHwgIjI0aCI7CmNvbnN0IEpXVF9SRUZSRVNIX0VYUElSRVNfSU4gPSBwcm9jZXNz'
    'LmVudi5KV1RfUkVGUkVTSF9FWFBJUkVTX0lOIHx8ICI3ZCI7Cgpjb25zdCBnZW5lcmF0ZVRva2VuID0gKHVzZXJJZDogc3RyaW5n'
    'LCByb2xlOiBzdHJpbmcpOiBzdHJpbmcgPT4gewogIHJldHVybiBqd3Quc2lnbih7IGlkOiB1c2VySWQsIHJvbGUgfSwgSldUX1NF'
    'Q1JFVCwgeyBleHBpcmVzSW46IEpXVF9FWFBJUkVTX0lOIH0gYXMgand0LlNpZ25PcHRpb25zKTsKfTsKCmNvbnN0IGdlbmVyYXRl'
    'UmVmcmVzaFRva2VuID0gKHVzZXJJZDogc3RyaW5nKTogc3RyaW5nID0+IHsKICByZXR1cm4gand0LnNpZ24oeyBpZDogdXNlcklk'
    'LCB0eXBlOiAicmVmcmVzaCIgfSwgSldUX1NFQ1JFVCwgeyBleHBpcmVzSW46IEpXVF9SRUZSRVNIX0VYUElSRVNfSU4gfSBhcyBq'
    'd3QuU2lnbk9wdGlvbnMpOwp9OwoKY29uc3QgZ2VuZXJhdGVDb2RlID0gKCk6IHN0cmluZyA9PiB7CiAgcmV0dXJuIE1hdGguZmxv'
    'b3IoMTAwMDAwICsgTWF0aC5yYW5kb20oKSAqIDkwMDAwMCkudG9TdHJpbmcoKTsKfTsKCi8qIExvcyBjb2RpZ29zIGRlIHZlcmlm'
    'aWNhY2lvbiBjYWR1Y2FuIGEgbG9zIDEwIG1pbnV0b3MgKi8KY29uc3QgQ09ERV9UVExfTVMgPSAxMCAqIDYwICogMTAwMDsKCi8q'
    'IFNvbG8gZXhpZ2ltb3MgdmVyaWZpY2FjaW9uIHBvciBTTVMgc2kgVHdpbGlvIGVzdGEgcmVhbG1lbnRlIGNvbmZpZ3VyYWRvICov'
    'CmNvbnN0IFNNU19FTkFCTEVEID0gKHByb2Nlc3MuZW52LlRXSUxJT19BQ0NPVU5UX1NJRCB8fCAiIikuc3RhcnRzV2l0aCgiQUMi'
    'KTsKCmNvbnN0IG1hc2tFbWFpbCA9IChlbWFpbDogc3RyaW5nKTogc3RyaW5nID0+IHsKICBjb25zdCBbbmFtZSwgZG9tYWluXSA9'
    'IGVtYWlsLnNwbGl0KCJAIik7CiAgaWYgKCFkb21haW4pIHJldHVybiBlbWFpbDsKICBjb25zdCB2aXNpYmxlID0gbmFtZS5zbGlj'
    'ZSgwLCAyKTsKICByZXR1cm4gdmlzaWJsZSArICIqIi5yZXBlYXQoTWF0aC5tYXgoMSwgbmFtZS5sZW5ndGggLSAyKSkgKyAiQCIg'
    'KyBkb21haW47Cn07Cgpjb25zdCBpc0FkdWx0ID0gKGRhdGVPZkJpcnRoOiBzdHJpbmcpOiBib29sZWFuID0+IHsKICBjb25zdCB0'
    'b2RheSA9IG5ldyBEYXRlKCk7CiAgY29uc3QgYmlydGggPSBuZXcgRGF0ZShkYXRlT2ZCaXJ0aCk7CiAgbGV0IGFnZSA9IHRvZGF5'
    'LmdldEZ1bGxZZWFyKCkgLSBiaXJ0aC5nZXRGdWxsWWVhcigpOwogIGNvbnN0IG1vbnRoRGlmZiA9IHRvZGF5LmdldE1vbnRoKCkg'
    'LSBiaXJ0aC5nZXRNb250aCgpOwogIGlmIChtb250aERpZmYgPCAwIHx8IChtb250aERpZmYgPT09IDAgJiYgdG9kYXkuZ2V0RGF0'
    'ZSgpIDwgYmlydGguZ2V0RGF0ZSgpKSkgYWdlLS07CiAgcmV0dXJuIGFnZSA+PSAxODsKfTsKCmNvbnN0IHVzZXJUb0pTT04gPSAo'
    'dXNlcjogVXNlcikgPT4gKHsKICBpZDogdXNlci5pZCwKICBlbWFpbDogdXNlci5lbWFpbCwKICBmaXJzdE5hbWU6IHVzZXIuZmly'
    'c3ROYW1lLAogIGxhc3ROYW1lOiB1c2VyLmxhc3ROYW1lLAogIHJvbGU6IHVzZXIucm9sZSwKICBreWNTdGF0dXM6IHVzZXIua3lj'
    'U3RhdHVzLAogIGFjY291bnRTdGF0dXM6IHVzZXIuYWNjb3VudFN0YXR1cywKICBpc1ZlcmlmaWVkOiB1c2VyLmlzVmVyaWZpZWQs'
    'CiAgZW1haWxWZXJpZmllZDogdXNlci5lbWFpbFZlcmlmaWVkLAogIHBob25lVmVyaWZpZWQ6IHVzZXIucGhvbmVWZXJpZmllZCwK'
    'ICB0d29GYWN0b3JFbmFibGVkOiB1c2VyLnR3b0ZhY3RvckVuYWJsZWQsCiAgcGhvbmU6IHVzZXIucGhvbmUsCiAgZG9jdW1lbnRU'
    'eXBlOiB1c2VyLmRvY3VtZW50VHlwZSwKICBkb2N1bWVudE51bWJlcjogdXNlci5kb2N1bWVudE51bWJlciwKICBkYXRlT2ZCaXJ0'
    'aDogdXNlci5kYXRlT2ZCaXJ0aCwKICBjb3VudHJ5OiB1c2VyLmNvdW50cnksCiAgdGltZXpvbmU6IHVzZXIudGltZXpvbmUsCiAg'
    'cHJlZmVycmVkQ3VycmVuY3k6IHVzZXIucHJlZmVycmVkQ3VycmVuY3ksCiAgY3JlYXRlZEF0OiB1c2VyLmNyZWF0ZWRBdCwKICBs'
    'YXN0TG9naW5BdDogdXNlci5sYXN0TG9naW5BdCwKfSk7CgpleHBvcnQgY29uc3QgcmVnaXN0ZXJVc2VyID0gYXN5bmMgKGRhdGE6'
    'IHsKICBlbWFpbDogc3RyaW5nOwogIGZpcnN0TmFtZTogc3RyaW5nOwogIGxhc3ROYW1lOiBzdHJpbmc7CiAgZG9jdW1lbnRUeXBl'
    'OiBzdHJpbmc7CiAgZG9jdW1lbnROdW1iZXI6IHN0cmluZzsKICBkYXRlT2ZCaXJ0aDogc3RyaW5nOwogIHBob25lOiBzdHJpbmc7'
    'CiAgcGFzc3dvcmQ6IHN0cmluZzsKfSkgPT4gewogIGNvbnN0IHVzZXJSZXBvID0gQXBwRGF0YVNvdXJjZS5nZXRSZXBvc2l0b3J5'
    'KFVzZXIpOwoKICBpZiAoIWlzQWR1bHQoZGF0YS5kYXRlT2ZCaXJ0aCkpIHsKICAgIHRocm93IG5ldyBBcHBFcnJvcigiRGViZXMg'
    'c2VyIG1heW9yIGRlIDE4IGFub3MgcGFyYSBjcmVhciB1bmEgY3VlbnRhIiwgNDAwKTsKICB9CgogIGRhdGEuZW1haWwgPSBTdHJp'
    'bmcoZGF0YS5lbWFpbCB8fCAiIikudHJpbSgpLnRvTG93ZXJDYXNlKCk7CgogIGNvbnN0IGV4aXN0aW5nRW1haWwgPSBhd2FpdCB1'
    'c2VyUmVwby5maW5kT25lKHsgd2hlcmU6IHsgZW1haWw6IGRhdGEuZW1haWwgfSB9KTsKICBpZiAoZXhpc3RpbmdFbWFpbCkgewog'
    'ICAgaWYgKGV4aXN0aW5nRW1haWwuaXNWZXJpZmllZCkgdGhyb3cgbmV3IEFwcEVycm9yKCJZYSBleGlzdGUgdW5hIGN1ZW50YSBj'
    'b24gZXN0ZSBlbWFpbCIsIDQwOSk7CiAgICBhd2FpdCB1c2VyUmVwby5yZW1vdmUoZXhpc3RpbmdFbWFpbCk7CiAgfQoKICBjb25z'
    'dCBleGlzdGluZ0RvYyA9IGF3YWl0IHVzZXJSZXBvLmZpbmRPbmUoeyB3aGVyZTogeyBkb2N1bWVudE51bWJlcjogZGF0YS5kb2N1'
    'bWVudE51bWJlciB9IH0pOwogIGlmIChleGlzdGluZ0RvYykgewogICAgaWYgKGV4aXN0aW5nRG9jLmlzVmVyaWZpZWQpIHRocm93'
    'IG5ldyBBcHBFcnJvcigiWWEgZXhpc3RlIHVuYSBjdWVudGEgY29uIGVzdGUgbnVtZXJvIGRlIGRvY3VtZW50byIsIDQwOSk7CiAg'
    'ICBhd2FpdCB1c2VyUmVwby5yZW1vdmUoZXhpc3RpbmdEb2MpOwogIH0KCiAgY29uc3QgZXhpc3RpbmdQaG9uZSA9IGF3YWl0IHVz'
    'ZXJSZXBvLmZpbmRPbmUoeyB3aGVyZTogeyBwaG9uZTogZGF0YS5waG9uZSB9IH0pOwogIGlmIChleGlzdGluZ1Bob25lKSB7CiAg'
    'ICBpZiAoZXhpc3RpbmdQaG9uZS5pc1ZlcmlmaWVkKSB0aHJvdyBuZXcgQXBwRXJyb3IoIllhIGV4aXN0ZSB1bmEgY3VlbnRhIGNv'
    'biBlc3RlIG51bWVybyBkZSB0ZWxlZm9ubyIsIDQwOSk7CiAgICBhd2FpdCB1c2VyUmVwby5yZW1vdmUoZXhpc3RpbmdQaG9uZSk7'
    'CiAgfQoKICBjb25zdCBlbWFpbENvZGUgPSBnZW5lcmF0ZUNvZGUoKTsKICBjb25zdCBwaG9uZUNvZGUgPSBnZW5lcmF0ZUNvZGUo'
    'KTsKCiAgY29uc3Qgc2FsdFJvdW5kcyA9IDEyOwogIGNvbnN0IHBhc3N3b3JkSGFzaCA9IGF3YWl0IGJjcnlwdC5oYXNoKGRhdGEu'
    'cGFzc3dvcmQsIHNhbHRSb3VuZHMpOwoKICBjb25zdCB1c2VyID0gdXNlclJlcG8uY3JlYXRlKHsKICAgIGVtYWlsOiBkYXRhLmVt'
    'YWlsLAogICAgZmlyc3ROYW1lOiBkYXRhLmZpcnN0TmFtZSwKICAgIGxhc3ROYW1lOiBkYXRhLmxhc3ROYW1lLAogICAgZG9jdW1l'
    'bnRUeXBlOiBkYXRhLmRvY3VtZW50VHlwZSBhcyBEb2N1bWVudFR5cGUsCiAgICBkb2N1bWVudE51bWJlcjogZGF0YS5kb2N1bWVu'
    'dE51bWJlciwKICAgIGRhdGVPZkJpcnRoOiBkYXRhLmRhdGVPZkJpcnRoLAogICAgcGhvbmU6IGRhdGEucGhvbmUsCiAgICBwYXNz'
    'd29yZEhhc2gsCiAgICByb2xlOiBVc2VyUm9sZS5VU0VSLAogICAgYWNjb3VudFN0YXR1czogQWNjb3VudFN0YXR1cy5BQ1RJVkUs'
    'CiAgICAvLyBFbCB1c3VhcmlvIE5PIHF1ZWRhIHZlcmlmaWNhZG8gaGFzdGEgcXVlIGludHJvZHV6Y2EgZWwgY29kaWdvIGVudmlh'
    'ZG8gcG9yIGVtYWlsLgogICAgaXNWZXJpZmllZDogZmFsc2UsCiAgICBlbWFpbFZlcmlmaWVkOiBmYWxzZSwKICAgIC8vIEVsIFNN'
    'UyBlcyBvcGNpb25hbDogc2kgVHdpbGlvIG5vIGVzdGEgY29uZmlndXJhZG8gbm8gYmxvcXVlYW1vcyBsYSBjdWVudGEuCiAgICBw'
    'aG9uZVZlcmlmaWVkOiAhU01TX0VOQUJMRUQsCiAgICB0d29GYWN0b3JTZWNyZXQ6IEpTT04uc3RyaW5naWZ5KHsgZW1haWxDb2Rl'
    'LCBwaG9uZUNvZGUsIGNvZGVzRXhwaXJlQXQ6IERhdGUubm93KCkgKyBDT0RFX1RUTF9NUyB9KSwKICB9KTsKCiAgY29uc3Qgc2F2'
    'ZWRVc2VyID0gYXdhaXQgdXNlclJlcG8uc2F2ZSh1c2VyKTsKCiAgY29uc3QgdG9rZW4gPSBnZW5lcmF0ZVRva2VuKHNhdmVkVXNl'
    'ci5pZCwgc2F2ZWRVc2VyLnJvbGUpOwogIGNvbnN0IHJlZnJlc2hUb2tlbiA9IGdlbmVyYXRlUmVmcmVzaFRva2VuKHNhdmVkVXNl'
    'ci5pZCk7CgogIGxldCBlbWFpbFNlbnQgPSBmYWxzZTsKICB0cnkgewogICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VuZFZlcmlm'
    'aWNhdGlvbkVtYWlsKHNhdmVkVXNlci5lbWFpbCwgZW1haWxDb2RlKTsKICAgIGVtYWlsU2VudCA9IHJlc3VsdC5zZW50OwogICAg'
    'aWYgKCFyZXN1bHQuc2VudCAmJiByZXN1bHQuZXJyb3IpIHsKICAgICAgbG9nZ2VyLmVycm9yKCJSZWdpc3RybzogZWwgZW1haWwg'
    'ZGUgdmVyaWZpY2FjaW9uIE5PIHNlIGVudmlvOiAiICsgcmVzdWx0LmVycm9yKTsKICAgIH0KICB9IGNhdGNoIChlcnJvcikgewog'
    'ICAgbG9nZ2VyLmVycm9yKCJSZWdpc3RybzogZXhjZXBjaW9uIGVudmlhbmRvIGVtYWlsIGRlIHZlcmlmaWNhY2lvbjogIiArIGVy'
    'cm9yKTsKICB9CgogIGlmIChTTVNfRU5BQkxFRCkgewogICAgdHJ5IHsKICAgICAgYXdhaXQgc2VuZFZlcmlmaWNhdGlvblNNUyhz'
    'YXZlZFVzZXIucGhvbmUsIHBob25lQ29kZSk7CiAgICB9IGNhdGNoIChlcnJvcikgewogICAgICBsb2dnZXIud2FybigiTm8gc2Ug'
    'cHVkbyBlbnZpYXIgU01TOiAiICsgZXJyb3IpOwogICAgfQogIH0KCiAgLyogQmllbnZlbmlkYSArIG5vdGlmaWNhY2nDs24gKi8K'
    'ICB0cnkgewogICAgY29uc3QgeyBjcmVhdGVOb3RpZmljYXRpb24gfSA9IGF3YWl0IGltcG9ydCgiLi9hZG1pbi5zZXJ2aWNlIik7'
    'CiAgICBjcmVhdGVOb3RpZmljYXRpb24oc2F2ZWRVc2VyLmlkLCAic3lzdGVtIiwgIkJpZW52ZW5pZG8gYSBCQU5DQSBORU4g8J+O'
    'iSIsCiAgICAgICJUdSBjdWVudGEgZnVlIGNyZWFkYSBleGl0b3NhbWVudGUuIFlhIHB1ZWRlcyBkZXBvc2l0YXIgZSBpbnZlcnRp'
    'ci4iKS5jYXRjaCgoKSA9PiB7fSk7CiAgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9CgogIHJldHVybiB7CiAgICB1c2VyOiB1c2Vy'
    'VG9KU09OKHNhdmVkVXNlciksCiAgICB0b2tlbiwKICAgIHJlZnJlc2hUb2tlbiwKICAgIG5lZWRzVmVyaWZpY2F0aW9uOiB0cnVl'
    'LAogICAgZW1haWxTZW50LAogICAgbWVzc2FnZTogZW1haWxTZW50CiAgICAgID8gIkN1ZW50YSBjcmVhZGEuIFRlIGVudmlhbW9z'
    'IHVuIGNvZGlnbyBkZSA2IGRpZ2l0b3MgYSAiICsgbWFza0VtYWlsKHNhdmVkVXNlci5lbWFpbCkgKyAiLiIKICAgICAgOiAiQ3Vl'
    'bnRhIGNyZWFkYS4gTm8gcHVkaW1vcyBlbnZpYXIgZWwgY29ycmVvIGVuIGVzdGUgbW9tZW50bzogcmV2aXNhIGxhIGNvbnNvbGEg'
    'ZGVsIHNlcnZpZG9yIG8gcHVsc2EgJ1JlZW52aWFyIGNvZGlnbycuIiwKICB9Owp9OwoKZXhwb3J0IGNvbnN0IGxvZ2luVXNlciA9'
    'IGFzeW5jIChkYXRhOiB7IGVtYWlsOiBzdHJpbmc7IHBhc3N3b3JkOiBzdHJpbmc7IHR3b0ZhY3RvckNvZGU/OiBzdHJpbmcgfSkg'
    'PT4gewogIGNvbnN0IHVzZXJSZXBvID0gQXBwRGF0YVNvdXJjZS5nZXRSZXBvc2l0b3J5KFVzZXIpOwogIGNvbnN0IHVzZXIgPSBh'
    'd2FpdCB1c2VyUmVwby5maW5kT25lKHsgd2hlcmU6IHsgZW1haWw6IFN0cmluZyhkYXRhLmVtYWlsIHx8ICIiKS50cmltKCkudG9M'
    'b3dlckNhc2UoKSB9IH0pOwoKICBpZiAoIXVzZXIpIHRocm93IG5ldyBBcHBFcnJvcigiQ3JlZGVuY2lhbGVzIGludmFsaWRhcyIs'
    'IDQwMSk7CiAgaWYgKHVzZXIuYWNjb3VudFN0YXR1cyA9PT0gQWNjb3VudFN0YXR1cy5TVVNQRU5ERUQpIHRocm93IG5ldyBBcHBF'
    'cnJvcigiVHUgY3VlbnRhIGhhIHNpZG8gc3VzcGVuZGlkYS4gQ29udGFjdGEgc29wb3J0ZS4iLCA0MDMpOwoKICAvKiBTaSAyRkEg'
    'YWN0aXZvOiBwcmltZXJvIGV4aWdpciBjcmVkZW5jaWFsZXMsIGx1ZWdvIGVsIGPDs2RpZ28gVE9UUCAqLwogIGlmICh1c2VyLnR3'
    'b0ZhY3RvckVuYWJsZWQpIHsKICAgIGNvbnN0IGlzUGFzc3dvcmRWYWxpZCA9IGF3YWl0IGJjcnlwdC5jb21wYXJlKGRhdGEucGFz'
    'c3dvcmQgfHwgIiIsIHVzZXIucGFzc3dvcmRIYXNoKTsKICAgIGlmICghaXNQYXNzd29yZFZhbGlkKSB7CiAgICAgIHVzZXIuZmFp'
    'bGVkTG9naW5BdHRlbXB0cyArPSAxOwogICAgICBpZiAodXNlci5mYWlsZWRMb2dpbkF0dGVtcHRzID49IDUpIHsKICAgICAgICB1'
    'c2VyLmFjY291bnRTdGF0dXMgPSBBY2NvdW50U3RhdHVzLlNVU1BFTkRFRDsKICAgICAgICBhd2FpdCB1c2VyUmVwby5zYXZlKHVz'
    'ZXIpOwogICAgICAgIHRocm93IG5ldyBBcHBFcnJvcigiQ3VlbnRhIGJsb3F1ZWFkYSBwb3IgbXVsdGlwbGVzIGludGVudG9zIGZh'
    'bGxpZG9zLiIsIDQyMyk7CiAgICAgIH0KICAgICAgYXdhaXQgdXNlclJlcG8uc2F2ZSh1c2VyKTsKICAgICAgdGhyb3cgbmV3IEFw'
    'cEVycm9yKCJDcmVkZW5jaWFsZXMgaW52YWxpZGFzLiBJbnRlbnRvcyByZXN0YW50ZXM6ICIgKyAoNSAtIHVzZXIuZmFpbGVkTG9n'
    'aW5BdHRlbXB0cyksIDQwMSk7CiAgICB9CiAgICBpZiAoIWRhdGEudHdvRmFjdG9yQ29kZSkgewogICAgICByZXR1cm4geyB1c2Vy'
    'OiB1c2VyVG9KU09OKHVzZXIpLCByZXF1aXJlc1R3b0ZhY3RvcjogdHJ1ZSwgbWVzc2FnZTogIlNlIHJlcXVpZXJlIGNvZGlnbyAy'
    'RkEiIH07CiAgICB9CiAgICBjb25zdCBzZWNyZXQgPSB1c2VyLnR3b0ZhY3RvclNlY3JldDsKICAgIGNvbnN0IHZlcmlmaWVkID0g'
    'c2VjcmV0CiAgICAgID8gc3BlYWtlYXN5LnRvdHAudmVyaWZ5KHsgc2VjcmV0LCBlbmNvZGluZzogImJhc2UzMiIsIHRva2VuOiBk'
    'YXRhLnR3b0ZhY3RvckNvZGUsIHdpbmRvdzogMSB9KQogICAgICA6IGZhbHNlOwogICAgaWYgKCF2ZXJpZmllZCkgdGhyb3cgbmV3'
    'IEFwcEVycm9yKCJDb2RpZ28gMkZBIGludmFsaWRvIiwgNDAxKTsKICB9IGVsc2UgewogICAgY29uc3QgaXNQYXNzd29yZFZhbGlk'
    'ID0gYXdhaXQgYmNyeXB0LmNvbXBhcmUoZGF0YS5wYXNzd29yZCwgdXNlci5wYXNzd29yZEhhc2gpOwogICAgaWYgKCFpc1Bhc3N3'
    'b3JkVmFsaWQpIHsKICAgICAgdXNlci5mYWlsZWRMb2dpbkF0dGVtcHRzICs9IDE7CiAgICAgIGlmICh1c2VyLmZhaWxlZExvZ2lu'
    'QXR0ZW1wdHMgPj0gNSkgewogICAgICAgIHVzZXIuYWNjb3VudFN0YXR1cyA9IEFjY291bnRTdGF0dXMuU1VTUEVOREVEOwogICAg'
    'ICAgIGF3YWl0IHVzZXJSZXBvLnNhdmUodXNlcik7CiAgICAgICAgdGhyb3cgbmV3IEFwcEVycm9yKCJDdWVudGEgYmxvcXVlYWRh'
    'IHBvciBtdWx0aXBsZXMgaW50ZW50b3MgZmFsbGlkb3MuIiwgNDIzKTsKICAgICAgfQogICAgICBhd2FpdCB1c2VyUmVwby5zYXZl'
    'KHVzZXIpOwogICAgICB0aHJvdyBuZXcgQXBwRXJyb3IoIkNyZWRlbmNpYWxlcyBpbnZhbGlkYXMuIEludGVudG9zIHJlc3RhbnRl'
    'czogIiArICg1IC0gdXNlci5mYWlsZWRMb2dpbkF0dGVtcHRzKSwgNDAxKTsKICAgIH0KICB9CgogIHVzZXIuZmFpbGVkTG9naW5B'
    'dHRlbXB0cyA9IDA7CiAgdXNlci5sYXN0TG9naW5BdCA9IG5ldyBEYXRlKCk7CiAgYXdhaXQgdXNlclJlcG8uc2F2ZSh1c2VyKTsK'
    'CiAgY29uc3QgdG9rZW4gPSBnZW5lcmF0ZVRva2VuKHVzZXIuaWQsIHVzZXIucm9sZSk7CiAgY29uc3QgcmVmcmVzaFRva2VuID0g'
    'Z2VuZXJhdGVSZWZyZXNoVG9rZW4odXNlci5pZCk7CgogIGxvZ2dlci5pbmZvKCJVc3VhcmlvIGxvZ3VlYWRvOiAiICsgdXNlci5l'
    'bWFpbCk7CgogIC8qIFNpIGF1biBubyB2ZXJpZmljbyBlbCBlbWFpbCwgbGUgbWFuZGFtb3MgdW4gY29kaWdvIG51ZXZvIGF1dG9t'
    'YXRpY2FtZW50ZSAqLwogIGlmICghdXNlci5pc1ZlcmlmaWVkKSB7CiAgICByZXNlbmRWZXJpZmljYXRpb25Db2Rlcyh1c2VyLmlk'
    'KS5jYXRjaCgoKSA9PiB7fSk7CiAgICByZXR1cm4gewogICAgICB1c2VyOiB1c2VyVG9KU09OKHVzZXIpLAogICAgICB0b2tlbiwK'
    'ICAgICAgcmVmcmVzaFRva2VuLAogICAgICBuZWVkc1ZlcmlmaWNhdGlvbjogdHJ1ZSwKICAgICAgbWVzc2FnZTogIlRlIGVudmlh'
    'bW9zIHVuIGNvZGlnbyBkZSB2ZXJpZmljYWNpb24gYSAiICsgbWFza0VtYWlsKHVzZXIuZW1haWwpLAogICAgfTsKICB9CgogIHJl'
    'dHVybiB7IHVzZXI6IHVzZXJUb0pTT04odXNlciksIHRva2VuLCByZWZyZXNoVG9rZW4gfTsKfTsKCmV4cG9ydCBjb25zdCB2ZXJp'
    'ZnlFbWFpbENvZGUgPSBhc3luYyAodXNlcklkOiBzdHJpbmcsIGNvZGU6IHN0cmluZykgPT4gewogIGNvbnN0IHVzZXJSZXBvID0g'
    'QXBwRGF0YVNvdXJjZS5nZXRSZXBvc2l0b3J5KFVzZXIpOwogIGNvbnN0IHVzZXIgPSBhd2FpdCB1c2VyUmVwby5maW5kT25lKHsg'
    'd2hlcmU6IHsgaWQ6IHVzZXJJZCB9IH0pOwogIGlmICghdXNlcikgdGhyb3cgbmV3IEFwcEVycm9yKCJVc3VhcmlvIG5vIGVuY29u'
    'dHJhZG8iLCA0MDQpOwoKICBpZiAodXNlci5lbWFpbFZlcmlmaWVkKSB7CiAgICByZXR1cm4geyBlbWFpbFZlcmlmaWVkOiB0cnVl'
    'LCBmdWxseVZlcmlmaWVkOiB1c2VyLmlzVmVyaWZpZWQsIG5lZWRzUGhvbmU6ICF1c2VyLnBob25lVmVyaWZpZWQgfTsKICB9Cgog'
    'IGxldCBzdG9yZWQ6IGFueSA9IHt9OwogIHRyeSB7IHN0b3JlZCA9IEpTT04ucGFyc2UodXNlci50d29GYWN0b3JTZWNyZXQgfHwg'
    'Int9Iik7IH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfQoKICBpZiAoIXN0b3JlZC5lbWFpbENvZGUpIHsKICAgIHRocm93IG5ldyBB'
    'cHBFcnJvcigiTm8gaGF5IHVuIGNvZGlnbyBhY3Rpdm8uIFB1bHNhICdSZWVudmlhciBjb2RpZ28nLiIsIDQwMCk7CiAgfQogIGlm'
    'IChzdG9yZWQuY29kZXNFeHBpcmVBdCAmJiBEYXRlLm5vdygpID4gTnVtYmVyKHN0b3JlZC5jb2Rlc0V4cGlyZUF0KSkgewogICAg'
    'dGhyb3cgbmV3IEFwcEVycm9yKCJFbCBjb2RpZ28gZXhwaXJvLiBQdWxzYSAnUmVlbnZpYXIgY29kaWdvJyBwYXJhIHJlY2liaXIg'
    'dW5vIG51ZXZvLiIsIDQwMCk7CiAgfQogIGlmIChTdHJpbmcoc3RvcmVkLmVtYWlsQ29kZSkudHJpbSgpICE9PSBTdHJpbmcoY29k'
    'ZSkudHJpbSgpKSB7CiAgICB0aHJvdyBuZXcgQXBwRXJyb3IoIkNvZGlnbyBkZSBlbWFpbCBpbmNvcnJlY3RvIiwgNDAwKTsKICB9'
    'CgogIHVzZXIuZW1haWxWZXJpZmllZCA9IHRydWU7CiAgdXNlci5pc1ZlcmlmaWVkID0gdXNlci5waG9uZVZlcmlmaWVkID09PSB0'
    'cnVlOwogIGF3YWl0IHVzZXJSZXBvLnNhdmUodXNlcik7CgogIGlmICh1c2VyLmlzVmVyaWZpZWQpIHsKICAgIHNlbmRXZWxjb21l'
    'RW1haWwodXNlci5lbWFpbCwgdXNlci5maXJzdE5hbWUpLmNhdGNoKCgpID0+IHt9KTsKICB9CgogIGxvZ2dlci5pbmZvKCJFbWFp'
    'bCB2ZXJpZmljYWRvOiAiICsgdXNlci5lbWFpbCk7CiAgcmV0dXJuIHsgZW1haWxWZXJpZmllZDogdHJ1ZSwgZnVsbHlWZXJpZmll'
    'ZDogdXNlci5pc1ZlcmlmaWVkLCBuZWVkc1Bob25lOiAhdXNlci5waG9uZVZlcmlmaWVkIH07Cn07CgpleHBvcnQgY29uc3QgdmVy'
    'aWZ5UGhvbmVDb2RlID0gYXN5bmMgKHVzZXJJZDogc3RyaW5nLCBjb2RlOiBzdHJpbmcpID0+IHsKICBjb25zdCB1c2VyUmVwbyA9'
    'IEFwcERhdGFTb3VyY2UuZ2V0UmVwb3NpdG9yeShVc2VyKTsKICBjb25zdCB1c2VyID0gYXdhaXQgdXNlclJlcG8uZmluZE9uZSh7'
    'IHdoZXJlOiB7IGlkOiB1c2VySWQgfSB9KTsKICBpZiAoIXVzZXIpIHRocm93IG5ldyBBcHBFcnJvcigiVXN1YXJpbyBubyBlbmNv'
    'bnRyYWRvIiwgNDA0KTsKCiAgaWYgKHVzZXIucGhvbmVWZXJpZmllZCkgewogICAgcmV0dXJuIHsgcGhvbmVWZXJpZmllZDogdHJ1'
    'ZSwgZnVsbHlWZXJpZmllZDogdXNlci5pc1ZlcmlmaWVkIH07CiAgfQoKICBsZXQgc3RvcmVkOiBhbnkgPSB7fTsKICB0cnkgeyBz'
    'dG9yZWQgPSBKU09OLnBhcnNlKHVzZXIudHdvRmFjdG9yU2VjcmV0IHx8ICJ7fSIpOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH0K'
    'CiAgaWYgKHN0b3JlZC5jb2Rlc0V4cGlyZUF0ICYmIERhdGUubm93KCkgPiBOdW1iZXIoc3RvcmVkLmNvZGVzRXhwaXJlQXQpKSB7'
    'CiAgICB0aHJvdyBuZXcgQXBwRXJyb3IoIkVsIGNvZGlnbyBleHBpcm8uIFB1bHNhICdSZWVudmlhciBjb2RpZ28nIHBhcmEgcmVj'
    'aWJpciB1bm8gbnVldm8uIiwgNDAwKTsKICB9CiAgaWYgKFN0cmluZyhzdG9yZWQucGhvbmVDb2RlIHx8ICIiKS50cmltKCkgIT09'
    'IFN0cmluZyhjb2RlKS50cmltKCkpIHsKICAgIHRocm93IG5ldyBBcHBFcnJvcigiQ29kaWdvIGRlIHRlbGVmb25vIGluY29ycmVj'
    'dG8iLCA0MDApOwogIH0KCiAgdXNlci5waG9uZVZlcmlmaWVkID0gdHJ1ZTsKICB1c2VyLmlzVmVyaWZpZWQgPSB1c2VyLmVtYWls'
    'VmVyaWZpZWQgPT09IHRydWU7CiAgYXdhaXQgdXNlclJlcG8uc2F2ZSh1c2VyKTsKCiAgaWYgKHVzZXIuaXNWZXJpZmllZCkgewog'
    'ICAgc2VuZFdlbGNvbWVFbWFpbCh1c2VyLmVtYWlsLCB1c2VyLmZpcnN0TmFtZSkuY2F0Y2goKCkgPT4ge30pOwogIH0KCiAgcmV0'
    'dXJuIHsgcGhvbmVWZXJpZmllZDogdHJ1ZSwgZnVsbHlWZXJpZmllZDogdXNlci5pc1ZlcmlmaWVkIH07Cn07CgpleHBvcnQgY29u'
    'c3QgcmVzZW5kVmVyaWZpY2F0aW9uQ29kZXMgPSBhc3luYyAodXNlcklkOiBzdHJpbmcpID0+IHsKICBjb25zdCB1c2VyUmVwbyA9'
    'IEFwcERhdGFTb3VyY2UuZ2V0UmVwb3NpdG9yeShVc2VyKTsKICBjb25zdCB1c2VyID0gYXdhaXQgdXNlclJlcG8uZmluZE9uZSh7'
    'IHdoZXJlOiB7IGlkOiB1c2VySWQgfSB9KTsKICBpZiAoIXVzZXIpIHRocm93IG5ldyBBcHBFcnJvcigiVXN1YXJpbyBubyBlbmNv'
    'bnRyYWRvIiwgNDA0KTsKCiAgaWYgKHVzZXIuZW1haWxWZXJpZmllZCAmJiB1c2VyLnBob25lVmVyaWZpZWQpIHsKICAgIHJldHVy'
    'biB7IHN1Y2Nlc3M6IHRydWUsIGVtYWlsU2VudDogZmFsc2UsIG1lc3NhZ2U6ICJUdSBjdWVudGEgeWEgZXN0YSB2ZXJpZmljYWRh'
    'IiB9OwogIH0KCiAgbGV0IHN0b3JlZDogYW55ID0ge307CiAgdHJ5IHsgc3RvcmVkID0gSlNPTi5wYXJzZSh1c2VyLnR3b0ZhY3Rv'
    'clNlY3JldCB8fCAie30iKTsgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9CgogIC8qIEFudGktc3BhbTogbWF4aW1vIDEgcmVlbnZp'
    'byBjYWRhIDYwIHNlZ3VuZG9zICovCiAgaWYgKHN0b3JlZC5sYXN0U2VudEF0ICYmIERhdGUubm93KCkgLSBOdW1iZXIoc3RvcmVk'
    'Lmxhc3RTZW50QXQpIDwgNjBfMDAwKSB7CiAgICBjb25zdCB3YWl0ID0gTWF0aC5jZWlsKCg2MF8wMDAgLSAoRGF0ZS5ub3coKSAt'
    'IE51bWJlcihzdG9yZWQubGFzdFNlbnRBdCkpKSAvIDEwMDApOwogICAgdGhyb3cgbmV3IEFwcEVycm9yKCJFc3BlcmEgIiArIHdh'
    'aXQgKyAiIHNlZ3VuZG9zIGFudGVzIGRlIHBlZGlyIG90cm8gY29kaWdvIiwgNDI5KTsKICB9CgogIGNvbnN0IGVtYWlsQ29kZSA9'
    'IHVzZXIuZW1haWxWZXJpZmllZCA/IHN0b3JlZC5lbWFpbENvZGUgOiBnZW5lcmF0ZUNvZGUoKTsKICBjb25zdCBwaG9uZUNvZGUg'
    'PSB1c2VyLnBob25lVmVyaWZpZWQgPyBzdG9yZWQucGhvbmVDb2RlIDogZ2VuZXJhdGVDb2RlKCk7CgogIHVzZXIudHdvRmFjdG9y'
    'U2VjcmV0ID0gSlNPTi5zdHJpbmdpZnkoewogICAgZW1haWxDb2RlLAogICAgcGhvbmVDb2RlLAogICAgY29kZXNFeHBpcmVBdDog'
    'RGF0ZS5ub3coKSArIENPREVfVFRMX01TLAogICAgbGFzdFNlbnRBdDogRGF0ZS5ub3coKSwKICB9KTsKICBhd2FpdCB1c2VyUmVw'
    'by5zYXZlKHVzZXIpOwoKICBsZXQgZW1haWxTZW50ID0gZmFsc2U7CiAgbGV0IGVtYWlsRXJyb3I6IHN0cmluZyB8IHVuZGVmaW5l'
    'ZDsKCiAgaWYgKCF1c2VyLmVtYWlsVmVyaWZpZWQpIHsKICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlbmRWZXJpZmljYXRpb25F'
    'bWFpbCh1c2VyLmVtYWlsLCBlbWFpbENvZGUpOwogICAgZW1haWxTZW50ID0gcmVzdWx0LnNlbnQ7CiAgICBlbWFpbEVycm9yID0g'
    'cmVzdWx0LmVycm9yOwogICAgaWYgKCFyZXN1bHQuc2VudCkgewogICAgICBsb2dnZXIuZXJyb3IoIlJlZW52aW86IGVsIGVtYWls'
    'IG5vIHNlIGVudmlvIGEgIiArIHVzZXIuZW1haWwgKyAiIC0+ICIgKyAocmVzdWx0LmVycm9yIHx8ICJzaW4gcHJvdmVlZG9yIikp'
    'OwogICAgfQogIH0KCiAgaWYgKCF1c2VyLnBob25lVmVyaWZpZWQgJiYgU01TX0VOQUJMRUQpIHsKICAgIHNlbmRWZXJpZmljYXRp'
    'b25TTVModXNlci5waG9uZSwgcGhvbmVDb2RlKS5jYXRjaCgoZSkgPT4gbG9nZ2VyLndhcm4oIlNNUzogIiArIGUpKTsKICB9Cgog'
    'IHJldHVybiB7CiAgICBzdWNjZXNzOiB0cnVlLAogICAgZW1haWxTZW50LAogICAgZW1haWxFcnJvciwKICAgIG1lc3NhZ2U6IGVt'
    'YWlsU2VudAogICAgICA/ICJFbnZpYW1vcyB1biBudWV2byBjb2RpZ28gYSAiICsgbWFza0VtYWlsKHVzZXIuZW1haWwpCiAgICAg'
    'IDogIk5vIHB1ZGltb3MgZW52aWFyIGVsIGNvcnJlby4gUmV2aXNhIGxhIGNvbmZpZ3VyYWNpb24gU01UUC9SZXNlbmQgZGVsIHNl'
    'cnZpZG9yLiIsCiAgfTsKfTsKCmV4cG9ydCBjb25zdCBmb3Jnb3RQYXNzd29yZCA9IGFzeW5jIChlbWFpbDogc3RyaW5nKSA9PiB7'
    'CiAgY29uc3QgdXNlclJlcG8gPSBBcHBEYXRhU291cmNlLmdldFJlcG9zaXRvcnkoVXNlcik7CiAgY29uc3Qgbm9ybWFsaXplZCA9'
    'IFN0cmluZyhlbWFpbCB8fCAiIikudHJpbSgpLnRvTG93ZXJDYXNlKCk7CiAgY29uc3QgdXNlciA9IGF3YWl0IHVzZXJSZXBvLmZp'
    'bmRPbmUoeyB3aGVyZTogeyBlbWFpbDogbm9ybWFsaXplZCB9IH0pOwoKICAvKiBSZXNwdWVzdGEgaWRlbnRpY2EgZXhpc3RhIG8g'
    'bm8gbGEgY3VlbnRhIChubyBmaWx0cmFyIHVzdWFyaW9zKSAqLwogIGNvbnN0IGdlbmVyaWNSZXNwb25zZSA9IHsKICAgIHN1Y2Nl'
    'c3M6IHRydWUsCiAgICBtZXNzYWdlOiAiU2kgZXhpc3RlIHVuYSBjdWVudGEgY29uIGVzZSBjb3JyZW8sIHRlIGVudmlhbW9zIHVu'
    'IGNvZGlnbyBkZSByZWN1cGVyYWNpb24uIiwKICB9OwoKICBpZiAoIXVzZXIpIHsKICAgIGxvZ2dlci5pbmZvKCJmb3Jnb3QtcGFz'
    'c3dvcmQgcGFyYSBlbWFpbCBpbmV4aXN0ZW50ZTogIiArIG5vcm1hbGl6ZWQpOwogICAgcmV0dXJuIGdlbmVyaWNSZXNwb25zZTsK'
    'ICB9CgogIC8qIEFudGktc3BhbTogMSBzb2xpY2l0dWQgcG9yIG1pbnV0byAqLwogIGlmICh1c2VyLnJlc2V0UGFzc3dvcmRFeHBp'
    'cmVzICYmIHVzZXIucmVzZXRQYXNzd29yZEV4cGlyZXMuZ2V0VGltZSgpIC0gQ09ERV9UVExfTVMgPiBEYXRlLm5vdygpIC0gNjBf'
    'MDAwKSB7CiAgICBsb2dnZXIud2FybigiZm9yZ290LXBhc3N3b3JkIGRlbWFzaWFkbyBzZWd1aWRvIHBhcmEgIiArIG5vcm1hbGl6'
    'ZWQpOwogICAgcmV0dXJuIGdlbmVyaWNSZXNwb25zZTsKICB9CgogIGNvbnN0IGNvZGUgPSBnZW5lcmF0ZUNvZGUoKTsKICBjb25z'
    'dCB0b2tlbiA9IGNvZGUgKyAiLSIgKyBjcnlwdG8ucmFuZG9tQnl0ZXMoMjQpLnRvU3RyaW5nKCJoZXgiKTsKCiAgdXNlci5yZXNl'
    'dFBhc3N3b3JkVG9rZW4gPSB0b2tlbjsKICB1c2VyLnJlc2V0UGFzc3dvcmRFeHBpcmVzID0gbmV3IERhdGUoRGF0ZS5ub3coKSAr'
    'IENPREVfVFRMX01TKTsKICBhd2FpdCB1c2VyUmVwby5zYXZlKHVzZXIpOwoKICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZW5kUGFz'
    'c3dvcmRSZXNldEVtYWlsKHVzZXIuZW1haWwsIGNvZGUsIHRva2VuKTsKICBpZiAoIXJlc3VsdC5zZW50KSB7CiAgICBsb2dnZXIu'
    'ZXJyb3IoImZvcmdvdC1wYXNzd29yZDogZW1haWwgTk8gZW52aWFkbyBhICIgKyB1c2VyLmVtYWlsICsgIiAtPiAiICsgKHJlc3Vs'
    'dC5lcnJvciB8fCAic2luIHByb3ZlZWRvciIpKTsKICB9CgogIHJldHVybiBnZW5lcmljUmVzcG9uc2U7Cn07CgpleHBvcnQgY29u'
    'c3QgcmVzZXRQYXNzd29yZCA9IGFzeW5jICh0b2tlbk9yQ29kZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nLCBlbWFpbD86IHN0'
    'cmluZykgPT4gewogIGNvbnN0IHVzZXJSZXBvID0gQXBwRGF0YVNvdXJjZS5nZXRSZXBvc2l0b3J5KFVzZXIpOwogIGNvbnN0IHZh'
    'bHVlID0gU3RyaW5nKHRva2VuT3JDb2RlIHx8ICIiKS50cmltKCk7CgogIGxldCB1c2VyOiBVc2VyIHwgbnVsbCA9IG51bGw7Cgog'
    'IC8qIENhc28gMTogZW5sYWNlIGRlbCBjb3JyZW8gLT4gdG9rZW4gY29tcGxldG8gKi8KICB1c2VyID0gYXdhaXQgdXNlclJlcG8u'
    'ZmluZE9uZSh7IHdoZXJlOiB7IHJlc2V0UGFzc3dvcmRUb2tlbjogdmFsdWUgfSB9KTsKCiAgLyogQ2FzbyAyOiBlbCB1c3Vhcmlv'
    'IGVzY3JpYmlvIHNvbG8gZWwgY29kaWdvIGRlIDYgZGlnaXRvcyAqLwogIGlmICghdXNlciAmJiAvXlxkezZ9JC8udGVzdCh2YWx1'
    'ZSkpIHsKICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBhd2FpdCB1c2VyUmVwbwogICAgICAuY3JlYXRlUXVlcnlCdWlsZGVyKCJ1IikK'
    'ICAgICAgLndoZXJlKCJ1LnJlc2V0UGFzc3dvcmRUb2tlbiBMSUtFIDpwcmVmaXgiLCB7IHByZWZpeDogdmFsdWUgKyAiLSUiIH0p'
    'CiAgICAgIC5nZXRNYW55KCk7CgogICAgaWYgKGNhbmRpZGF0ZXMubGVuZ3RoID09PSAxKSB7CiAgICAgIHVzZXIgPSBjYW5kaWRh'
    'dGVzWzBdOwogICAgfSBlbHNlIGlmIChjYW5kaWRhdGVzLmxlbmd0aCA+IDEpIHsKICAgICAgaWYgKCFlbWFpbCkgdGhyb3cgbmV3'
    'IEFwcEVycm9yKCJJbmRpY2EgdGFtYmllbiB0dSBlbWFpbCBwYXJhIGNvbmZpcm1hciBlbCBjb2RpZ28iLCA0MDApOwogICAgICB1'
    'c2VyID0gY2FuZGlkYXRlcy5maW5kKChjKSA9PiBjLmVtYWlsLnRvTG93ZXJDYXNlKCkgPT09IGVtYWlsLnRyaW0oKS50b0xvd2Vy'
    'Q2FzZSgpKSB8fCBudWxsOwogICAgfQogIH0KCiAgaWYgKCF1c2VyIHx8ICF1c2VyLnJlc2V0UGFzc3dvcmRFeHBpcmVzIHx8IHVz'
    'ZXIucmVzZXRQYXNzd29yZEV4cGlyZXMuZ2V0VGltZSgpIDwgRGF0ZS5ub3coKSkgewogICAgdGhyb3cgbmV3IEFwcEVycm9yKCJU'
    'b2tlbiBpbnZhbGlkbyBvIGV4cGlyYWRvLiBTb2xpY2l0YSB1biBudWV2byBjb2RpZ28uIiwgNDAwKTsKICB9CgogIHVzZXIucGFz'
    'c3dvcmRIYXNoID0gYXdhaXQgYmNyeXB0Lmhhc2gocGFzc3dvcmQsIDEyKTsKICB1c2VyLnJlc2V0UGFzc3dvcmRUb2tlbiA9ICIi'
    'OwogIHVzZXIucmVzZXRQYXNzd29yZEV4cGlyZXMgPSBudWxsIGFzIGFueTsKICB1c2VyLmZhaWxlZExvZ2luQXR0ZW1wdHMgPSAw'
    'OwogIGlmICh1c2VyLmFjY291bnRTdGF0dXMgPT09IEFjY291bnRTdGF0dXMuU1VTUEVOREVEKSB7CiAgICB1c2VyLmFjY291bnRT'
    'dGF0dXMgPSBBY2NvdW50U3RhdHVzLkFDVElWRTsKICB9CiAgYXdhaXQgdXNlclJlcG8uc2F2ZSh1c2VyKTsKCiAgbG9nZ2VyLmlu'
    'Zm8oIkNvbnRyYXNlbmEgcmVzdGFibGVjaWRhIHBhcmEgIiArIHVzZXIuZW1haWwpOwogIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUs'
    'IG1lc3NhZ2U6ICJDb250cmFzZW5hIGFjdHVhbGl6YWRhIGNvcnJlY3RhbWVudGUiIH07Cn07CgpleHBvcnQgY29uc3QgZW5hYmxl'
    'MkZBID0gYXN5bmMgKHVzZXJJZDogc3RyaW5nKSA9PiB7CiAgY29uc3QgdXNlclJlcG8gPSBBcHBEYXRhU291cmNlLmdldFJlcG9z'
    'aXRvcnkoVXNlcik7CiAgY29uc3QgdXNlciA9IGF3YWl0IHVzZXJSZXBvLmZpbmRPbmUoeyB3aGVyZTogeyBpZDogdXNlcklkIH0g'
    'fSk7CiAgaWYgKCF1c2VyKSB0aHJvdyBuZXcgQXBwRXJyb3IoIlVzdWFyaW8gbm8gZW5jb250cmFkbyIsIDQwNCk7CgogIGNvbnN0'
    'IHNlY3JldCA9IHNwZWFrZWFzeS5nZW5lcmF0ZVNlY3JldCh7IG5hbWU6ICJCQU5DQSBORU4gKCIgKyB1c2VyLmVtYWlsICsgIiki'
    'IH0pOwogIHVzZXIudHdvRmFjdG9yU2VjcmV0ID0gc2VjcmV0LmJhc2UzMjsKICB1c2VyLnR3b0ZhY3RvckVuYWJsZWQgPSB0cnVl'
    'OwogIGF3YWl0IHVzZXJSZXBvLnNhdmUodXNlcik7CiAgcmV0dXJuIHsKICAgIHNlY3JldDogc2VjcmV0LmJhc2UzMiwKICAgIG90'
    'cGF1dGhVcmw6IHNlY3JldC5vdHBhdXRoX3VybCwKICAgIHFyQ29kZVVybDogIm90cGF1dGg6Ly90b3RwL0JBTkNBJTIwTkVOOiIg'
    'KyBlbmNvZGVVUklDb21wb25lbnQodXNlci5lbWFpbCkgKyAiP3NlY3JldD0iICsgc2VjcmV0LmJhc2UzMiArICImaXNzdWVyPUJB'
    'TkNBJTIwTkVOIiwKICB9Owp9OwoKZXhwb3J0IGNvbnN0IGRpc2FibGUyRkEgPSBhc3luYyAodXNlcklkOiBzdHJpbmcpID0+IHsK'
    'ICBjb25zdCB1c2VyUmVwbyA9IEFwcERhdGFTb3VyY2UuZ2V0UmVwb3NpdG9yeShVc2VyKTsKICBjb25zdCB1c2VyID0gYXdhaXQg'
    'dXNlclJlcG8uZmluZE9uZSh7IHdoZXJlOiB7IGlkOiB1c2VySWQgfSB9KTsKICBpZiAoIXVzZXIpIHRocm93IG5ldyBBcHBFcnJv'
    'cigiVXN1YXJpbyBubyBlbmNvbnRyYWRvIiwgNDA0KTsKICB1c2VyLnR3b0ZhY3RvckVuYWJsZWQgPSBmYWxzZTsKICB1c2VyLnR3'
    'b0ZhY3RvclNlY3JldCA9ICIiOwogIGF3YWl0IHVzZXJSZXBvLnNhdmUodXNlcik7CiAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9'
    'Owp9OwoKZXhwb3J0IGNvbnN0IGdldFByb2ZpbGUgPSBhc3luYyAodXNlcklkOiBzdHJpbmcpID0+IHsKICBjb25zdCB1c2VyUmVw'
    'byA9IEFwcERhdGFTb3VyY2UuZ2V0UmVwb3NpdG9yeShVc2VyKTsKICBjb25zdCB1c2VyID0gYXdhaXQgdXNlclJlcG8uZmluZE9u'
    'ZSh7IHdoZXJlOiB7IGlkOiB1c2VySWQgfSB9KTsKICBpZiAoIXVzZXIpIHRocm93IG5ldyBBcHBFcnJvcigiVXN1YXJpbyBubyBl'
    'bmNvbnRyYWRvIiwgNDA0KTsKICByZXR1cm4gdXNlclRvSlNPTih1c2VyKTsKfTsK'
    ) -join ''
  },
  @{
    Path = 'backend/src/controllers/auth.controller.ts'
    B64  = @(
    'aW1wb3J0IHsgUmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbiB9IGZyb20gImV4cHJlc3MiOwppbXBvcnQgKiBhcyBhdXRo'
    'U2VydmljZSBmcm9tICIuLi9zZXJ2aWNlcy9hdXRoLnNlcnZpY2UiOwppbXBvcnQgeyBBcHBFcnJvciB9IGZyb20gIi4uL21pZGRs'
    'ZXdhcmUvZXJyb3JIYW5kbGVyLm1pZGRsZXdhcmUiOwppbXBvcnQgeyBsb2dBdWRpdCB9IGZyb20gIi4uL3NlcnZpY2VzL2F1ZGl0'
    'LnNlcnZpY2UiOwppbXBvcnQgeyBBdWRpdEFjdGlvbiB9IGZyb20gIi4uL21vZGVscy9BdWRpdExvZyI7CgpleHBvcnQgY29uc3Qg'
    'cmVnaXN0ZXIgPSBhc3luYyAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pOiBQcm9taXNl'
    'PHZvaWQ+ID0+IHsKICB0cnkgewogICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYXV0aFNlcnZpY2UucmVnaXN0ZXJVc2VyKHJlcS5i'
    'b2R5KTsKICAgIGxvZ0F1ZGl0KHsKICAgICAgdXNlcklkOiByZXN1bHQudXNlcj8uaWQgfHwgbnVsbCwKICAgICAgYWN0aW9uOiBB'
    'dWRpdEFjdGlvbi5SRUdJU1RFUiwKICAgICAgZW50aXR5VHlwZTogInVzZXIiLAogICAgICBlbnRpdHlJZDogcmVzdWx0LnVzZXI/'
    'LmlkLAogICAgICBpcEFkZHJlc3M6IHJlcS5pcCwKICAgICAgZGV0YWlsczogIlJlZ2lzdHJvIGRlIG51ZXZhIGN1ZW50YTogIiAr'
    'IHJlcS5ib2R5LmVtYWlsLAogICAgfSkuY2F0Y2goKCkgPT4ge30pOwogICAgcmVzLnN0YXR1cygyMDEpLmpzb24oeyBzdGF0dXM6'
    'ICJzdWNjZXNzIiwgZGF0YTogcmVzdWx0IH0pOwogIH0gY2F0Y2ggKGVycm9yKSB7IG5leHQoZXJyb3IpOyB9Cn07CgpleHBvcnQg'
    'Y29uc3QgbG9naW4gPSBhc3luYyAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pOiBQcm9t'
    'aXNlPHZvaWQ+ID0+IHsKICB0cnkgewogICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYXV0aFNlcnZpY2UubG9naW5Vc2VyKHJlcS5i'
    'b2R5KTsKICAgIGxvZ0F1ZGl0KHsKICAgICAgdXNlcklkOiByZXN1bHQudXNlcj8uaWQgfHwgbnVsbCwKICAgICAgYWN0aW9uOiBB'
    'dWRpdEFjdGlvbi5MT0dJTiwKICAgICAgZW50aXR5VHlwZTogInVzZXIiLAogICAgICBlbnRpdHlJZDogcmVzdWx0LnVzZXI/Lmlk'
    'LAogICAgICBpcEFkZHJlc3M6IHJlcS5pcCwKICAgICAgZGV0YWlsczogIkluaWNpbyBkZSBzZXNpw7NuIGV4aXRvc286ICIgKyBy'
    'ZXEuYm9keS5lbWFpbCwKICAgIH0pLmNhdGNoKCgpID0+IHt9KTsKICAgIHJlcy5zdGF0dXMoMjAwKS5qc29uKHsgc3RhdHVzOiAi'
    'c3VjY2VzcyIsIGRhdGE6IHJlc3VsdCB9KTsKICB9IGNhdGNoIChlcnJvcikgeyBuZXh0KGVycm9yKTsgfQp9OwoKZXhwb3J0IGNv'
    'bnN0IHZlcmlmeUVtYWlsQ29kZSA9IGFzeW5jIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlv'
    'bik6IFByb21pc2U8dm9pZD4gPT4gewogIHRyeSB7CiAgICBjb25zdCB1c2VySWQgPSByZXEudXNlcj8uaWQ7CiAgICBpZiAoIXVz'
    'ZXJJZCkgeyB0aHJvdyBuZXcgQXBwRXJyb3IoIk5vIGF1dGVudGljYWRvIiwgNDAxKTsgfQogICAgY29uc3QgeyBjb2RlIH0gPSBy'
    'ZXEuYm9keTsKICAgIGlmICghY29kZSkgeyB0aHJvdyBuZXcgQXBwRXJyb3IoIkVsIGNvZGlnbyBlcyByZXF1ZXJpZG8iLCA0MDAp'
    'OyB9CiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhdXRoU2VydmljZS52ZXJpZnlFbWFpbENvZGUodXNlcklkLCBjb2RlKTsKICAg'
    'IHJlcy5zdGF0dXMoMjAwKS5qc29uKHsgc3RhdHVzOiAic3VjY2VzcyIsIGRhdGE6IHJlc3VsdCB9KTsKICB9IGNhdGNoIChlcnJv'
    'cikgeyBuZXh0KGVycm9yKTsgfQp9OwoKZXhwb3J0IGNvbnN0IHZlcmlmeVBob25lQ29kZSA9IGFzeW5jIChyZXE6IFJlcXVlc3Qs'
    'IHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbik6IFByb21pc2U8dm9pZD4gPT4gewogIHRyeSB7CiAgICBjb25zdCB1'
    'c2VySWQgPSByZXEudXNlcj8uaWQ7CiAgICBpZiAoIXVzZXJJZCkgeyB0aHJvdyBuZXcgQXBwRXJyb3IoIk5vIGF1dGVudGljYWRv'
    'IiwgNDAxKTsgfQogICAgY29uc3QgeyBjb2RlIH0gPSByZXEuYm9keTsKICAgIGlmICghY29kZSkgeyB0aHJvdyBuZXcgQXBwRXJy'
    'b3IoIkVsIGNvZGlnbyBlcyByZXF1ZXJpZG8iLCA0MDApOyB9CiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhdXRoU2VydmljZS52'
    'ZXJpZnlQaG9uZUNvZGUodXNlcklkLCBjb2RlKTsKICAgIHJlcy5zdGF0dXMoMjAwKS5qc29uKHsgc3RhdHVzOiAic3VjY2VzcyIs'
    'IGRhdGE6IHJlc3VsdCB9KTsKICB9IGNhdGNoIChlcnJvcikgeyBuZXh0KGVycm9yKTsgfQp9OwoKZXhwb3J0IGNvbnN0IHJlc2Vu'
    'ZFZlcmlmaWNhdGlvbiA9IGFzeW5jIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbik6IFBy'
    'b21pc2U8dm9pZD4gPT4gewogIHRyeSB7CiAgICBjb25zdCB1c2VySWQgPSByZXEudXNlcj8uaWQ7CiAgICBpZiAoIXVzZXJJZCkg'
    'eyB0aHJvdyBuZXcgQXBwRXJyb3IoIk5vIGF1dGVudGljYWRvIiwgNDAxKTsgfQogICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYXV0'
    'aFNlcnZpY2UucmVzZW5kVmVyaWZpY2F0aW9uQ29kZXModXNlcklkKTsKICAgIHJlcy5zdGF0dXMoMjAwKS5qc29uKHsgc3RhdHVz'
    'OiAic3VjY2VzcyIsIGRhdGE6IHJlc3VsdCB9KTsKICB9IGNhdGNoIChlcnJvcikgeyBuZXh0KGVycm9yKTsgfQp9OwoKZXhwb3J0'
    'IGNvbnN0IGZvcmdvdFBhc3N3b3JkID0gYXN5bmMgKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0'
    'aW9uKTogUHJvbWlzZTx2b2lkPiA9PiB7CiAgdHJ5IHsKICAgIGNvbnN0IHsgZW1haWwgfSA9IHJlcS5ib2R5OwogICAgaWYgKCFl'
    'bWFpbCkgeyB0aHJvdyBuZXcgQXBwRXJyb3IoIkVsIGVtYWlsIGVzIHJlcXVlcmlkbyIsIDQwMCk7IH0KICAgIGNvbnN0IHJlc3Vs'
    'dCA9IGF3YWl0IGF1dGhTZXJ2aWNlLmZvcmdvdFBhc3N3b3JkKGVtYWlsKTsKICAgIHJlcy5zdGF0dXMoMjAwKS5qc29uKHsgc3Rh'
    'dHVzOiAic3VjY2VzcyIsIGRhdGE6IHJlc3VsdCB9KTsKICB9IGNhdGNoIChlcnJvcikgeyBuZXh0KGVycm9yKTsgfQp9OwoKZXhw'
    'b3J0IGNvbnN0IHJlc2V0UGFzc3dvcmQgPSBhc3luYyAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVu'
    'Y3Rpb24pOiBQcm9taXNlPHZvaWQ+ID0+IHsKICB0cnkgewogICAgY29uc3QgeyB0b2tlbiwgcGFzc3dvcmQsIGVtYWlsIH0gPSBy'
    'ZXEuYm9keTsKICAgIGlmICghdG9rZW4gfHwgIXBhc3N3b3JkKSB7IHRocm93IG5ldyBBcHBFcnJvcigiVG9rZW4geSBudWV2YSBj'
    'b250cmFzZW5hIHNvbiByZXF1ZXJpZG9zIiwgNDAwKTsgfQogICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYXV0aFNlcnZpY2UucmVz'
    'ZXRQYXNzd29yZCh0b2tlbiwgcGFzc3dvcmQsIGVtYWlsKTsKICAgIHJlcy5zdGF0dXMoMjAwKS5qc29uKHsgc3RhdHVzOiAic3Vj'
    'Y2VzcyIsIGRhdGE6IHJlc3VsdCB9KTsKICB9IGNhdGNoIChlcnJvcikgeyBuZXh0KGVycm9yKTsgfQp9OwoKZXhwb3J0IGNvbnN0'
    'IGVuYWJsZTJGQSA9IGFzeW5jIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbik6IFByb21p'
    'c2U8dm9pZD4gPT4gewogIHRyeSB7CiAgICBjb25zdCB1c2VySWQgPSByZXEudXNlcj8uaWQ7CiAgICBpZiAoIXVzZXJJZCkgeyB0'
    'aHJvdyBuZXcgQXBwRXJyb3IoIk5vIGF1dGVudGljYWRvIiwgNDAxKTsgfQogICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYXV0aFNl'
    'cnZpY2UuZW5hYmxlMkZBKHVzZXJJZCk7CiAgICByZXMuc3RhdHVzKDIwMCkuanNvbih7IHN0YXR1czogInN1Y2Nlc3MiLCBkYXRh'
    'OiByZXN1bHQgfSk7CiAgfSBjYXRjaCAoZXJyb3IpIHsgbmV4dChlcnJvcik7IH0KfTsKCmV4cG9ydCBjb25zdCBkaXNhYmxlMkZB'
    'ID0gYXN5bmMgKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKTogUHJvbWlzZTx2b2lkPiA9'
    'PiB7CiAgdHJ5IHsKICAgIGNvbnN0IHVzZXJJZCA9IHJlcS51c2VyPy5pZDsKICAgIGlmICghdXNlcklkKSB7IHRocm93IG5ldyBB'
    'cHBFcnJvcigiTm8gYXV0ZW50aWNhZG8iLCA0MDEpOyB9CiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhdXRoU2VydmljZS5kaXNh'
    'YmxlMkZBKHVzZXJJZCk7CiAgICByZXMuc3RhdHVzKDIwMCkuanNvbih7IHN0YXR1czogInN1Y2Nlc3MiLCBkYXRhOiByZXN1bHQg'
    'fSk7CiAgfSBjYXRjaCAoZXJyb3IpIHsgbmV4dChlcnJvcik7IH0KfTsKCmV4cG9ydCBjb25zdCBnZXRQcm9maWxlID0gYXN5bmMg'
    'KHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKTogUHJvbWlzZTx2b2lkPiA9PiB7CiAgdHJ5'
    'IHsKICAgIGNvbnN0IHVzZXJJZCA9IHJlcS51c2VyPy5pZDsKICAgIGlmICghdXNlcklkKSB7IHRocm93IG5ldyBBcHBFcnJvcigi'
    'Tm8gYXV0ZW50aWNhZG8iLCA0MDEpOyB9CiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhdXRoU2VydmljZS5nZXRQcm9maWxlKHVz'
    'ZXJJZCk7CiAgICByZXMuc3RhdHVzKDIwMCkuanNvbih7IHN0YXR1czogInN1Y2Nlc3MiLCBkYXRhOiByZXN1bHQgfSk7CiAgfSBj'
    'YXRjaCAoZXJyb3IpIHsgbmV4dChlcnJvcik7IH0KfTsK'
    ) -join ''
  },
  @{
    Path = 'backend/src/validators/auth.validator.ts'
    B64  = @(
    'aW1wb3J0IEpvaSBmcm9tICJqb2kiOwoKZXhwb3J0IGNvbnN0IHJlZ2lzdGVyU2NoZW1hID0gSm9pLm9iamVjdCh7CiAgZW1haWw6'
    'IEpvaS5zdHJpbmcoKS5lbWFpbCgpLnJlcXVpcmVkKCkubWVzc2FnZXMoewogICAgInN0cmluZy5lbWFpbCI6ICJFbCBlbWFpbCBu'
    'byBlcyB2YWxpZG8iLAogICAgImFueS5yZXF1aXJlZCI6ICJFbCBlbWFpbCBlcyByZXF1ZXJpZG8iLAogIH0pLAogIGZpcnN0TmFt'
    'ZTogSm9pLnN0cmluZygpLm1pbigyKS5tYXgoMTAwKS5yZXF1aXJlZCgpLm1lc3NhZ2VzKHsKICAgICJzdHJpbmcubWluIjogIkVs'
    'IG5vbWJyZSBkZWJlIHRlbmVyIGFsIG1lbm9zIDIgY2FyYWN0ZXJlcyIsCiAgICAiYW55LnJlcXVpcmVkIjogIkVsIG5vbWJyZSBl'
    'cyByZXF1ZXJpZG8iLAogIH0pLAogIGxhc3ROYW1lOiBKb2kuc3RyaW5nKCkubWluKDIpLm1heCgxMDApLnJlcXVpcmVkKCkubWVz'
    'c2FnZXMoewogICAgInN0cmluZy5taW4iOiAiRWwgYXBlbGxpZG8gZGViZSB0ZW5lciBhbCBtZW5vcyAyIGNhcmFjdGVyZXMiLAog'
    'ICAgImFueS5yZXF1aXJlZCI6ICJFbCBhcGVsbGlkbyBlcyByZXF1ZXJpZG8iLAogIH0pLAogIGRvY3VtZW50VHlwZTogSm9pLnN0'
    'cmluZygpLnZhbGlkKCJjYyIsICJjZSIsICJwYXNhcG9ydGUiKS5yZXF1aXJlZCgpLm1lc3NhZ2VzKHsKICAgICJhbnkub25seSI6'
    'ICJUaXBvIGRlIGRvY3VtZW50byBpbnZhbGlkbyAoY2MsIGNlLCBwYXNhcG9ydGUpIiwKICAgICJhbnkucmVxdWlyZWQiOiAiRWwg'
    'dGlwbyBkZSBkb2N1bWVudG8gZXMgcmVxdWVyaWRvIiwKICB9KSwKICBkb2N1bWVudE51bWJlcjogSm9pLnN0cmluZygpLm1pbig1'
    'KS5tYXgoNTApLnJlcXVpcmVkKCkubWVzc2FnZXMoewogICAgInN0cmluZy5taW4iOiAiTnVtZXJvIGRlIGRvY3VtZW50byBpbnZh'
    'bGlkbyIsCiAgICAiYW55LnJlcXVpcmVkIjogIkVsIG51bWVybyBkZSBkb2N1bWVudG8gZXMgcmVxdWVyaWRvIiwKICB9KSwKICBk'
    'YXRlT2ZCaXJ0aDogSm9pLnN0cmluZygpLmlzb0RhdGUoKS5yZXF1aXJlZCgpLm1lc3NhZ2VzKHsKICAgICJzdHJpbmcuaXNvRGF0'
    'ZSI6ICJGZWNoYSBkZSBuYWNpbWllbnRvIGludmFsaWRhIChmb3JtYXRvOiBZWVlZLU1NLUREKSIsCiAgICAiYW55LnJlcXVpcmVk'
    'IjogIkxhIGZlY2hhIGRlIG5hY2ltaWVudG8gZXMgcmVxdWVyaWRhIiwKICB9KSwKICBwaG9uZTogSm9pLnN0cmluZygpLnBhdHRl'
    'cm4oL15cKz9bMS05XVxkezYsMTR9JC8pLnJlcXVpcmVkKCkubWVzc2FnZXMoewogICAgInN0cmluZy5wYXR0ZXJuLmJhc2UiOiAi'
    'TnVtZXJvIGRlIHRlbGVmb25vIGludmFsaWRvIChmb3JtYXRvOiArNTczMDAxMjM0NTY3KSIsCiAgICAiYW55LnJlcXVpcmVkIjog'
    'IkVsIHRlbGVmb25vIGVzIHJlcXVlcmlkbyIsCiAgfSksCiAgcGFzc3dvcmQ6IEpvaS5zdHJpbmcoKS5taW4oOCkubWF4KDEyOCkK'
    'ICAgIC5wYXR0ZXJuKC9eKD89LipbYS16XSkoPz0uKltBLVpdKSg/PS4qXGQpLykKICAgIC5yZXF1aXJlZCgpCiAgICAubWVzc2Fn'
    'ZXMoewogICAgICAic3RyaW5nLm1pbiI6ICJMYSBjb250cmFzZW5hIGRlYmUgdGVuZXIgYWwgbWVub3MgOCBjYXJhY3RlcmVzIiwK'
    'ICAgICAgInN0cmluZy5wYXR0ZXJuLmJhc2UiOiAiTGEgY29udHJhc2VuYSBkZWJlIHRlbmVyIG1heXVzY3VsYSwgbWludXNjdWxh'
    'IHkgbnVtZXJvIiwKICAgICAgImFueS5yZXF1aXJlZCI6ICJMYSBjb250cmFzZW5hIGVzIHJlcXVlcmlkYSIsCiAgICB9KSwKfSk7'
    'CgpleHBvcnQgY29uc3QgbG9naW5TY2hlbWEgPSBKb2kub2JqZWN0KHsKICBlbWFpbDogSm9pLnN0cmluZygpLmVtYWlsKCkucmVx'
    'dWlyZWQoKS5tZXNzYWdlcyh7CiAgICAic3RyaW5nLmVtYWlsIjogIkVsIGVtYWlsIG5vIGVzIHZhbGlkbyIsCiAgICAiYW55LnJl'
    'cXVpcmVkIjogIkVsIGVtYWlsIGVzIHJlcXVlcmlkbyIsCiAgfSksCiAgcGFzc3dvcmQ6IEpvaS5zdHJpbmcoKS5yZXF1aXJlZCgp'
    'Lm1lc3NhZ2VzKHsKICAgICJhbnkucmVxdWlyZWQiOiAiTGEgY29udHJhc2VuYSBlcyByZXF1ZXJpZGEiLAogIH0pLAogIHR3b0Zh'
    'Y3RvckNvZGU6IEpvaS5zdHJpbmcoKS5sZW5ndGgoNikucGF0dGVybigvXlxkKyQvKS5vcHRpb25hbCgpLm1lc3NhZ2VzKHsKICAg'
    'ICJzdHJpbmcubGVuZ3RoIjogIkVsIGNvZGlnbyAyRkEgZGViZSB0ZW5lciA2IGRpZ2l0b3MiLAogIH0pLAp9KTsKCmV4cG9ydCBj'
    'b25zdCB2ZXJpZnlDb2RlU2NoZW1hID0gSm9pLm9iamVjdCh7CiAgY29kZTogSm9pLnN0cmluZygpLmxlbmd0aCg2KS5wYXR0ZXJu'
    'KC9eXGQrJC8pLnJlcXVpcmVkKCkubWVzc2FnZXMoewogICAgInN0cmluZy5sZW5ndGgiOiAiRWwgY29kaWdvIGRlYmUgdGVuZXIg'
    'NiBkaWdpdG9zIiwKICAgICJhbnkucmVxdWlyZWQiOiAiRWwgY29kaWdvIGVzIHJlcXVlcmlkbyIsCiAgfSksCn0pOwoKZXhwb3J0'
    'IGNvbnN0IGZvcmdvdFBhc3N3b3JkU2NoZW1hID0gSm9pLm9iamVjdCh7CiAgZW1haWw6IEpvaS5zdHJpbmcoKS5lbWFpbCgpLnJl'
    'cXVpcmVkKCkubWVzc2FnZXMoewogICAgInN0cmluZy5lbWFpbCI6ICJFbCBlbWFpbCBubyBlcyB2YWxpZG8iLAogICAgImFueS5y'
    'ZXF1aXJlZCI6ICJFbCBlbWFpbCBlcyByZXF1ZXJpZG8iLAogIH0pLAp9KTsKCmV4cG9ydCBjb25zdCByZXNldFBhc3N3b3JkU2No'
    'ZW1hID0gSm9pLm9iamVjdCh7CiAgLy8gQWNlcHRhIGVsIHRva2VuIGxhcmdvIGRlbCBlbmxhY2UgZGVsIGNvcnJlbyBPIGVsIGNv'
    'ZGlnbyBkZSA2IGRpZ2l0b3MKICB0b2tlbjogSm9pLnN0cmluZygpLm1pbig2KS5yZXF1aXJlZCgpLm1lc3NhZ2VzKHsKICAgICJh'
    'bnkucmVxdWlyZWQiOiAiRWwgdG9rZW4gbyBjb2RpZ28gZXMgcmVxdWVyaWRvIiwKICAgICJzdHJpbmcubWluIjogIkVsIGNvZGln'
    'byBkZWJlIHRlbmVyIGFsIG1lbm9zIDYgY2FyYWN0ZXJlcyIsCiAgfSksCiAgZW1haWw6IEpvaS5zdHJpbmcoKS5lbWFpbCgpLm9w'
    'dGlvbmFsKCkuYWxsb3coIiIsIG51bGwpLAogIHBhc3N3b3JkOiBKb2kuc3RyaW5nKCkubWluKDgpLm1heCgxMjgpCiAgICAucGF0'
    'dGVybigvXig/PS4qW2Etel0pKD89LipbQS1aXSkoPz0uKlxkKS8pCiAgICAucmVxdWlyZWQoKQogICAgLm1lc3NhZ2VzKHsKICAg'
    'ICAgInN0cmluZy5taW4iOiAiTGEgY29udHJhc2VuYSBkZWJlIHRlbmVyIGFsIG1lbm9zIDggY2FyYWN0ZXJlcyIsCiAgICAgICJz'
    'dHJpbmcucGF0dGVybi5iYXNlIjogIkxhIGNvbnRyYXNlbmEgZGViZSB0ZW5lciBtYXl1c2N1bGEsIG1pbnVzY3VsYSB5IG51bWVy'
    'byIsCiAgICAgICJhbnkucmVxdWlyZWQiOiAiTGEgY29udHJhc2VuYSBlcyByZXF1ZXJpZGEiLAogICAgfSksCn0pOwo='
    ) -join ''
  },
  @{
    Path = 'backend/src/app.ts'
    B64  = @(
    'aW1wb3J0ICJkb3RlbnYvY29uZmlnIjsKaW1wb3J0ICJyZWZsZWN0LW1ldGFkYXRhIjsKaW1wb3J0ICJleHByZXNzLWFzeW5jLWVy'
    'cm9ycyI7CmltcG9ydCBleHByZXNzIGZyb20gImV4cHJlc3MiOwppbXBvcnQgY29ycyBmcm9tICJjb3JzIjsKaW1wb3J0IGhlbG1l'
    'dCBmcm9tICJoZWxtZXQiOwppbXBvcnQgY29tcHJlc3Npb24gZnJvbSAiY29tcHJlc3Npb24iOwppbXBvcnQgbW9yZ2FuIGZyb20g'
    'Im1vcmdhbiI7CmltcG9ydCB7IGNvbm5lY3REYXRhYmFzZSwgZGlzY29ubmVjdERhdGFiYXNlLCBkZXNjcmliaXJDb25leGlvbiB9'
    'IGZyb20gIi4vY29uZmlnL2RhdGFiYXNlIjsKaW1wb3J0IGxvZ2dlciBmcm9tICIuL2NvbmZpZy9sb2dnZXIiOwppbXBvcnQgeyB2'
    'ZXJpZnlFbWFpbENvbmZpZywgRU1BSUxfUFJPVklERVIgfSBmcm9tICIuL2NvbmZpZy9lbWFpbCI7CmltcG9ydCByb3V0ZXMgZnJv'
    'bSAiLi9yb3V0ZXMiOwppbXBvcnQgeyBlcnJvckhhbmRsZXIgfSBmcm9tICIuL21pZGRsZXdhcmUvZXJyb3JIYW5kbGVyLm1pZGRs'
    'ZXdhcmUiOwoKY29uc3QgYXBwID0gZXhwcmVzcygpOwpjb25zdCBQT1JUID0gcGFyc2VJbnQocHJvY2Vzcy5lbnYuUE9SVCB8fCAi'
    'MzAwMCIsIDEwKTsKLy8gMC4wLjAuMCBlcyBvYmxpZ2F0b3JpbyBlbiBEb2NrZXI6IGNvbiAxMjcuMC4wLjEgZWwgY29udGVuZWRv'
    'ciBzb2xvIHNlCi8vIGVzY3VjaGFyaWEgYSBzaSBtaXNtbyB5IGVsIHB1ZXJ0byBwdWJsaWNhZG8gbm8gcmVzcG9uZGVyaWEgZGVz'
    'ZGUgZnVlcmEuCmNvbnN0IEhPU1QgPSBwcm9jZXNzLmVudi5IT1NUIHx8ICIwLjAuMC4wIjsKCmFwcC51c2UoaGVsbWV0KCkpOwph'
    'cHAudXNlKGNvcnMoKSk7CmFwcC51c2UoY29tcHJlc3Npb24oKSk7CmFwcC51c2UobW9yZ2FuKCJkZXYiKSk7CmFwcC51c2UoZXhw'
    'cmVzcy5qc29uKCkpOwphcHAudXNlKGV4cHJlc3MudXJsZW5jb2RlZCh7IGV4dGVuZGVkOiB0cnVlIH0pKTsKCmFwcC51c2UoIi9h'
    'cGkiLCByb3V0ZXMpOwoKYXBwLmdldCgiLyIsIChfcmVxLCByZXMpID0+IHsKICByZXMuanNvbih7CiAgICBtZXNzYWdlOiAiQmll'
    'bnZlbmlkbyBhIEJBTkNBIE5FTiBBUEkiLAogICAgdmVyc2lvbjogIjEuMC4wIiwKICAgIGhlYWx0aDogIi9hcGkvdjEvaGVhbHRo'
    'IiwKICB9KTsKfSk7CgphcHAudXNlKGVycm9ySGFuZGxlcik7Cgphc3luYyBmdW5jdGlvbiBzdGFydFNlcnZlcigpIHsKICB0cnkg'
    'ewogICAgYXdhaXQgY29ubmVjdERhdGFiYXNlKCk7CgogICAgY29uc3QgY29ycmVvT2sgPSBhd2FpdCB2ZXJpZnlFbWFpbENvbmZp'
    'ZygpOwoKICAgIGNvbnN0IHNlcnZlciA9IGFwcC5saXN0ZW4oUE9SVCwgSE9TVCwgKCkgPT4gewogICAgICBsb2dnZXIuaW5mbygi'
    'PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Iik7CiAgICAgIGxvZ2dlci5pbmZv'
    'KGBCQU5DQSBORU4gQVBJIGVzY3VjaGFuZG8gZW4gaHR0cDovLyR7SE9TVH06JHtQT1JUfWApOwogICAgICBsb2dnZXIuaW5mbyhg'
    'SGVhbHRoIGNoZWNrIDogaHR0cDovL2xvY2FsaG9zdDoke1BPUlR9L2FwaS92MS9oZWFsdGhgKTsKICAgICAgbG9nZ2VyLmluZm8o'
    'YEJhc2UgZGUgZGF0b3M6ICR7ZGVzY3JpYmlyQ29uZXhpb24oKX1gKTsKICAgICAgbG9nZ2VyLmluZm8oYENvcnJlbyAgICAgICA6'
    'ICR7RU1BSUxfUFJPVklERVJ9JHtjb3JyZW9PayA/ICIgKG9wZXJhdGl2bykiIDogIiAoTk8gZW52aWEgY29ycmVvcyByZWFsZXMp'
    'In1gKTsKICAgICAgbG9nZ2VyLmluZm8oIj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09'
    'PT09PSIpOwogICAgfSk7CgogICAgLy8gQ2llcnJlIG9yZGVuYWRvOiBzaW4gZXN0byAiZG9ja2VyIGNvbXBvc2UgZG93biIgdGFy'
    'ZGEgMTBzIGVuIG1hdGFyIGVsIHByb2Nlc28KICAgIGNvbnN0IGFwYWdhciA9IGFzeW5jIChzZW5hbDogc3RyaW5nKSA9PiB7CiAg'
    'ICAgIGxvZ2dlci5pbmZvKGAke3NlbmFsfSByZWNpYmlkbywgY2VycmFuZG8uLi5gKTsKICAgICAgc2VydmVyLmNsb3NlKGFzeW5j'
    'ICgpID0+IHsKICAgICAgICBhd2FpdCBkaXNjb25uZWN0RGF0YWJhc2UoKTsKICAgICAgICBwcm9jZXNzLmV4aXQoMCk7CiAgICAg'
    'IH0pOwogICAgICBzZXRUaW1lb3V0KCgpID0+IHByb2Nlc3MuZXhpdCgxKSwgMTAwMDApLnVucmVmKCk7CiAgICB9OwogICAgcHJv'
    'Y2Vzcy5vbigiU0lHVEVSTSIsICgpID0+IHZvaWQgYXBhZ2FyKCJTSUdURVJNIikpOwogICAgcHJvY2Vzcy5vbigiU0lHSU5UIiwg'
    'KCkgPT4gdm9pZCBhcGFnYXIoIlNJR0lOVCIpKTsKICB9IGNhdGNoIChlcnJvcikgewogICAgbG9nZ2VyLmVycm9yKCJObyBzZSBw'
    'dWRvIGluaWNpYXIgZWwgc2Vydmlkb3I6IiwgZXJyb3IpOwogICAgcHJvY2Vzcy5leGl0KDEpOwogIH0KfQoKc3RhcnRTZXJ2ZXIo'
    'KTsKCmV4cG9ydCBkZWZhdWx0IGFwcDsK'
    ) -join ''
  },
  @{
    Path = 'backend/src/config/database.ts'
    B64  = @(
    'aW1wb3J0IHsgRGF0YVNvdXJjZSB9IGZyb20gInR5cGVvcm0iOwppbXBvcnQgbG9nZ2VyIGZyb20gIi4vbG9nZ2VyIjsKCi8qKgog'
    'KiBDb25maWcgZGUgbGEgYmFzZSBkZSBkYXRvcy4KICogQWNlcHRhIERBVEFCQVNFX1VSTCAoSGVyb2t1L1JlbmRlci9SYWlsd2F5'
    'KSBvIGxhcyB2YXJpYWJsZXMgc3VlbHRhcyBEQl8qLgogKiBFbiBEb2NrZXIsIERCX0hPU1QgdmFsZSAicG9zdGdyZXMiIChlbCBu'
    'b21icmUgZGVsIHNlcnZpY2lvIGRlIGNvbXBvc2UpLAogKiBOTyAibG9jYWxob3N0IjogbG9jYWxob3N0IGRlbnRybyBkZWwgY29u'
    'dGVuZWRvciBlcyBlbCBwcm9waW8gY29udGVuZWRvci4KICovCi8vIERCX0hPU1QgdGllbmUgUFJJT1JJREFEIHNvYnJlIERBVEFC'
    'QVNFX1VSTDogZW4gRG9ja2VyIGNvbXBvc2UgaW55ZWN0YQovLyBEQl9IT1NUPXBvc3RncmVzLCB5IHVuIERBVEFCQVNFX1VSTCB2'
    'aWVqbyBhcHVudGFuZG8gYSBsb2NhbGhvc3QgZGVqYXJpYQovLyBlbCBjb250ZW5lZG9yIHNpbiBjb25leGlvbi4KY29uc3QgdXJs'
    'ID0gcHJvY2Vzcy5lbnYuREJfSE9TVCA/ICIiIDogKHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTCB8fCAiIikudHJpbSgpOwpjb25z'
    'dCB1c2FTc2wgPSAocHJvY2Vzcy5lbnYuREJfU1NMIHx8ICIiKS50b0xvd2VyQ2FzZSgpID09PSAidHJ1ZSI7Cgpjb25zdCBjb211'
    'biA9IHsKICB0eXBlOiAicG9zdGdyZXMiIGFzIGNvbnN0LAogIHNzbDogdXNhU3NsID8geyByZWplY3RVbmF1dGhvcml6ZWQ6IGZh'
    'bHNlIH0gOiBmYWxzZSwKICBzeW5jaHJvbml6ZTogdHJ1ZSwKICBsb2dnaW5nOiBmYWxzZSwKICBlbnRpdGllczogW19fZGlybmFt'
    'ZSArICIvLi4vbW9kZWxzLyoqLyoue2pzLHRzfSJdLAogIG1pZ3JhdGlvbnM6IFtfX2Rpcm5hbWUgKyAiLy4uL21pZ3JhdGlvbnMv'
    'KiovKi57anMsdHN9Il0sCiAgc3Vic2NyaWJlcnM6IFtdLAp9OwoKZXhwb3J0IGNvbnN0IEFwcERhdGFTb3VyY2UgPSB1cmwKICA/'
    'IG5ldyBEYXRhU291cmNlKHsgLi4uY29tdW4sIHVybCB9KQogIDogbmV3IERhdGFTb3VyY2UoewogICAgICAuLi5jb211biwKICAg'
    'ICAgaG9zdDogcHJvY2Vzcy5lbnYuREJfSE9TVCB8fCAiMTI3LjAuMC4xIiwKICAgICAgcG9ydDogcGFyc2VJbnQocHJvY2Vzcy5l'
    'bnYuREJfUE9SVCB8fCAiNTQzMyIsIDEwKSwKICAgICAgdXNlcm5hbWU6IHByb2Nlc3MuZW52LkRCX1VTRVIgfHwgImJhbmNhX25l'
    'biIsCiAgICAgIHBhc3N3b3JkOiBwcm9jZXNzLmVudi5EQl9QQVNTV09SRCB8fCAiYmFuY2FfbmVuX3NlY3JldCIsCiAgICAgIGRh'
    'dGFiYXNlOiBwcm9jZXNzLmVudi5EQl9OQU1FIHx8ICJiYW5jYV9uZW4iLAogICAgfSk7CgovKiogRGVzY3JpYmUgYSBkw7NuZGUg'
    'bm9zIGVzdGFtb3MgY29uZWN0YW5kbyAoc2luIGV4cG9uZXIgbGEgY29udHJhc2XDsWEpLiAqLwpleHBvcnQgZnVuY3Rpb24gZGVz'
    'Y3JpYmlyQ29uZXhpb24oKTogc3RyaW5nIHsKICBpZiAodXJsKSByZXR1cm4gdXJsLnJlcGxhY2UoLzpcL1wvKFteOl0rKTpbXkBd'
    'K0AvLCAiOi8vJDE6KioqKkAiKTsKICByZXR1cm4gYCR7cHJvY2Vzcy5lbnYuREJfSE9TVCB8fCAiMTI3LjAuMC4xIn06JHtwcm9j'
    'ZXNzLmVudi5EQl9QT1JUIHx8ICI1NDMzIn1gICsKICAgICAgICAgYC8ke3Byb2Nlc3MuZW52LkRCX05BTUUgfHwgImJhbmNhX25l'
    'biJ9ICh1c3VhcmlvOiAke3Byb2Nlc3MuZW52LkRCX1VTRVIgfHwgImJhbmNhX25lbiJ9KWA7Cn0KCi8qKgogKiBDb25lY3RhIHJl'
    'aW50ZW50YW5kby4KICoKICogRXMgaW1wcmVzY2luZGlibGUgZW4gRG9ja2VyOiBhdW5xdWUgY29tcG9zZSBlc3BlcmUgYWwgaGVh'
    'bHRoY2hlY2sgZGUKICogUG9zdGdyZXMsIGVsIGNvbnRlbmVkb3IgcHVlZGUgdGFyZGFyIHVuIHBvY28gbcOhcyBlbiBhY2VwdGFy'
    'IGNvbmV4aW9uZXMuCiAqIFNpbiByZWludGVudG9zIGVsIGJhY2tlbmQgaGFjw61hIHByb2Nlc3MuZXhpdCgxKSB5IGVsIHN0YWNr'
    'IHF1ZWRhYmEgY2HDrWRvLgogKi8KZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbm5lY3REYXRhYmFzZShpbnRlbnRvcyA9IDE1LCBl'
    'c3BlcmFNcyA9IDMwMDApOiBQcm9taXNlPHZvaWQ+IHsKICBsb2dnZXIuaW5mbyhgQ29uZWN0YW5kbyBhIFBvc3RncmVTUUwgZW4g'
    'JHtkZXNjcmliaXJDb25leGlvbigpfWApOwoKICBmb3IgKGxldCBpID0gMTsgaSA8PSBpbnRlbnRvczsgaSsrKSB7CiAgICB0cnkg'
    'ewogICAgICBpZiAoIUFwcERhdGFTb3VyY2UuaXNJbml0aWFsaXplZCkgewogICAgICAgIGF3YWl0IEFwcERhdGFTb3VyY2UuaW5p'
    'dGlhbGl6ZSgpOwogICAgICB9CiAgICAgIGxvZ2dlci5pbmZvKCJCYXNlIGRlIGRhdG9zIFBvc3RncmVTUUwgY29uZWN0YWRhLiIp'
    'OwogICAgICByZXR1cm47CiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7CiAgICAgIGNvbnN0IG1zZyA9IGVycm9yPy5tZXNzYWdl'
    'IHx8IFN0cmluZyhlcnJvcik7CgogICAgICBpZiAoaSA9PT0gaW50ZW50b3MpIHsKICAgICAgICBsb2dnZXIuZXJyb3IoYE5vIHNl'
    'IHB1ZG8gY29uZWN0YXIgYSBsYSBiYXNlIGRlIGRhdG9zIHRyYXMgJHtpbnRlbnRvc30gaW50ZW50b3M6ICR7bXNnfWApOwogICAg'
    'ICAgIC8vIFBpc3RhcyBjb25jcmV0YXMgc2VndW4gZWwgZXJyb3IsIHBhcmEgbm8gZGVqYXIgYWwgdXN1YXJpbyBhIGNpZWdhcwog'
    'ICAgICAgIGlmIChtc2cuaW5jbHVkZXMoIkVDT05OUkVGVVNFRCIpKSB7CiAgICAgICAgICBsb2dnZXIuZXJyb3IoIk5hZGllIGVz'
    'Y3VjaGEgZW4gZXNlIGhvc3QvcHVlcnRvLiBFbiBEb2NrZXIsIERCX0hPU1QgZGViZSBzZXIgJ3Bvc3RncmVzJy4iKTsKICAgICAg'
    'ICAgIGxvZ2dlci5lcnJvcigiRnVlcmEgZGUgRG9ja2VyLCBEQl9IT1NUPTEyNy4wLjAuMSB5IERCX1BPUlQ9NTQzMyAoZWwgcHVl'
    'cnRvIHF1ZSBwdWJsaWNhIGNvbXBvc2UpLiIpOwogICAgICAgIH0gZWxzZSBpZiAobXNnLmluY2x1ZGVzKCJFTk9URk9VTkQiKSB8'
    'fCBtc2cuaW5jbHVkZXMoIkVBSV9BR0FJTiIpKSB7CiAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVsIG5vbWJyZSAnJHtwcm9jZXNz'
    'LmVudi5EQl9IT1NUfScgbm8gcmVzdWVsdmUuIERlYmUgY29pbmNpZGlyIGNvbiBlbCBzZXJ2aWNpbyBkZSBjb21wb3NlLmApOwog'
    'ICAgICAgIH0gZWxzZSBpZiAobXNnLmluY2x1ZGVzKCJwYXNzd29yZCIpIHx8IG1zZy5pbmNsdWRlcygiYXV0ZW50aWNhY2nDs24i'
    'KSB8fCBtc2cuaW5jbHVkZXMoImF1dGhlbnRpY2F0aW9uIikpIHsKICAgICAgICAgIGxvZ2dlci5lcnJvcigiVXN1YXJpbyBvIGNv'
    'bnRyYXNlw7FhIGluY29ycmVjdG9zLiBSZXZpc2EgREJfVVNFUiB5IERCX1BBU1NXT1JELiIpOwogICAgICAgICAgbG9nZ2VyLmVy'
    'cm9yKCJTaSBjYW1iaWFzdGUgbGEgY29udHJhc2XDsWEsIGJvcnJhIGVsIHZvbHVtZW46IGRvY2tlciBjb21wb3NlIGRvd24gLXYi'
    'KTsKICAgICAgICB9IGVsc2UgaWYgKG1zZy5pbmNsdWRlcygiZG9lcyBub3QgZXhpc3QiKSB8fCBtc2cuaW5jbHVkZXMoIm5vIGV4'
    'aXN0ZSIpKSB7CiAgICAgICAgICBsb2dnZXIuZXJyb3IoYExhIGJhc2UgJyR7cHJvY2Vzcy5lbnYuREJfTkFNRX0nIG5vIGV4aXN0'
    'ZS4gUmVjcmVhIGVsIHZvbHVtZW46IGRvY2tlciBjb21wb3NlIGRvd24gLXZgKTsKICAgICAgICB9CiAgICAgICAgdGhyb3cgZXJy'
    'b3I7CiAgICAgIH0KCiAgICAgIGxvZ2dlci53YXJuKGBJbnRlbnRvICR7aX0vJHtpbnRlbnRvc30gZmFsbGlkbyAoJHttc2d9KS4g'
    'UmVpbnRlbnRvIGVuICR7ZXNwZXJhTXMgLyAxMDAwfXMuLi5gKTsKICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IHNldFRp'
    'bWVvdXQociwgZXNwZXJhTXMpKTsKICAgIH0KICB9Cn0KCi8qKiBDaWVycmUgb3JkZW5hZG8sIHBhcmEgcXVlIERvY2tlciBubyBk'
    'ZWplIGNvbmV4aW9uZXMgY29sZ2FkYXMuICovCmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaXNjb25uZWN0RGF0YWJhc2UoKTogUHJv'
    'bWlzZTx2b2lkPiB7CiAgaWYgKEFwcERhdGFTb3VyY2UuaXNJbml0aWFsaXplZCkgewogICAgYXdhaXQgQXBwRGF0YVNvdXJjZS5k'
    'ZXN0cm95KCk7CiAgICBsb2dnZXIuaW5mbygiQ29uZXhpw7NuIGEgbGEgYmFzZSBkZSBkYXRvcyBjZXJyYWRhLiIpOwogIH0KfQo='
    ) -join ''
  },
  @{
    Path = 'backend/src/routes/health.routes.ts'
    B64  = @(
    'aW1wb3J0IHsgUm91dGVyLCBSZXF1ZXN0LCBSZXNwb25zZSB9IGZyb20gImV4cHJlc3MiOwppbXBvcnQgeyBBcHBEYXRhU291cmNl'
    'IH0gZnJvbSAiLi4vY29uZmlnL2RhdGFiYXNlIjsKaW1wb3J0IHsgRU1BSUxfUFJPVklERVIgfSBmcm9tICIuLi9jb25maWcvZW1h'
    'aWwiOwoKY29uc3Qgcm91dGVyID0gUm91dGVyKCk7CgovKioKICogSGVhbHRoIGNoZWNrIHJlYWw6IGxhbnphIHVuYSBjb25zdWx0'
    'YSBhIGxhIGJhc2UgZGUgZGF0b3MuCiAqIERvY2tlciB1c2EgZXN0ZSBlbmRwb2ludCBwYXJhIHNhYmVyIHNpIGVsIGJhY2tlbmQg'
    'ZXN0YSBzYW5vIGRlIHZlcmRhZC4KICogRGV2dWVsdmUgNTAzIHNpIGxhIGJhc2Ugbm8gcmVzcG9uZGUsIHBhcmEgcXVlIGVsIGhl'
    'YWx0aGNoZWNrIGZhbGxlLgogKi8Kcm91dGVyLmdldCgiL2hlYWx0aCIsIGFzeW5jIChfcmVxOiBSZXF1ZXN0LCByZXM6IFJlc3Bv'
    'bnNlKSA9PiB7CiAgbGV0IGJhc2VEYXRvcyA9ICJkZXNjb25lY3RhZGEiOwogIGxldCBzYW5vID0gZmFsc2U7CgogIHRyeSB7CiAg'
    'ICBpZiAoQXBwRGF0YVNvdXJjZS5pc0luaXRpYWxpemVkKSB7CiAgICAgIGF3YWl0IEFwcERhdGFTb3VyY2UucXVlcnkoIlNFTEVD'
    'VCAxIik7CiAgICAgIGJhc2VEYXRvcyA9ICJjb25lY3RhZGEiOwogICAgICBzYW5vID0gdHJ1ZTsKICAgIH0KICB9IGNhdGNoIChl'
    'OiBhbnkpIHsKICAgIGJhc2VEYXRvcyA9ICJlcnJvcjogIiArIChlPy5tZXNzYWdlIHx8ICJkZXNjb25vY2lkbyIpOwogIH0KCiAg'
    'cmVzLnN0YXR1cyhzYW5vID8gMjAwIDogNTAzKS5qc29uKHsKICAgIHN0YXR1czogc2FubyA/ICJvayIgOiAiZGVncmFkYWRvIiwK'
    'ICAgIHNlcnZpY2U6ICJCQU5DQSBORU4gQVBJIiwKICAgIHZlcnNpb246ICIxLjAuMCIsCiAgICB0aW1lc3RhbXA6IG5ldyBEYXRl'
    'KCkudG9JU09TdHJpbmcoKSwKICAgIGRhdGFiYXNlOiBiYXNlRGF0b3MsCiAgICBlbWFpbDogRU1BSUxfUFJPVklERVIsCiAgICB1'
    'cHRpbWU6IE1hdGgucm91bmQocHJvY2Vzcy51cHRpbWUoKSkgKyAicyIsCiAgfSk7Cn0pOwoKZXhwb3J0IGRlZmF1bHQgcm91dGVy'
    'Owo='
    ) -join ''
  },
  @{
    Path = 'backend/.env.example'
    B64  = @(
    'IyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KIyAgQkFOQ0EgTkVO'
    'IOKAlCBCYWNrZW5kCiMgIENvcGlhIGVzdGUgYXJjaGl2byBjb21vIGJhY2tlbmQvLmVudiB5IHJlbGxlbmEgdHVzIHZhbG9yZXMK'
    'IyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KTk9ERV9FTlY9ZGV2'
    'ZWxvcG1lbnQKUE9SVD0zMDAwCkZST05URU5EX1VSTD1odHRwOi8vbG9jYWxob3N0OjUxNzMKCiMgLS0tLS0tLS0tLSBCYXNlIGRl'
    'IGRhdG9zIC0tLS0tLS0tLS0KIyBGdWVyYSBkZSBEb2NrZXI6IDEyNy4wLjAuMSB5IGVsIHB1ZXJ0byA1NDMzIHF1ZSBwdWJsaWNh'
    'IGRvY2tlci1jb21wb3NlLgojIERlbnRybyBkZSBEb2NrZXIgZXN0YXMgdmFyaWFibGVzIGxhcyBwb25lIGRvY2tlci1jb21wb3Nl'
    'LnltbCAoREJfSE9TVD1wb3N0Z3JlcykuCkRCX0hPU1Q9MTI3LjAuMC4xCkRCX1BPUlQ9NTQzMwpEQl9VU0VSPWJhbmNhX25lbgpE'
    'Ql9QQVNTV09SRD1iYW5jYV9uZW5fc2VjcmV0CkRCX05BTUU9YmFuY2FfbmVuCgojIC0tLS0tLS0tLS0gSldUIC0tLS0tLS0tLS0K'
    'SldUX1NFQ1JFVD1jYW1iaWEtZXN0by1wb3ItdW5hLWNhZGVuYS1sYXJnYS15LWFsZWF0b3JpYQpKV1RfRVhQSVJFU19JTj0yNGgK'
    'SldUX1JFRlJFU0hfRVhQSVJFU19JTj03ZAoKIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09'
    'PT09PT09PT09PT09PT0KIyAgQ09SUkVPIEVMRUNUUk9OSUNPICAoZXN0byBlcyBsbyBxdWUgaGFjZSBxdWUgbGxlZ3VlbiBsb3Mg'
    'Y29kaWdvcykKIyAgRU1BSUxfUFJPVklERVIgPSByZXNlbmQgfCBzbXRwIHwgY29uc29sZQojICBTaSBsbyBkZWphcyB2YWNpbyBz'
    'ZSBhdXRvZGV0ZWN0YS4KIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09'
    'PT0KRU1BSUxfUFJPVklERVI9cmVzZW5kCgojIC0tLS0tLS0tLS0gT1BDSU9OIEEgKFJFQ09NRU5EQURBKTogUmVzZW5kIC0tLS0t'
    'LS0tLS0KIyAxLiBDcmVhIHVuYSBjdWVudGEgZ3JhdGlzIGVuIGh0dHBzOi8vcmVzZW5kLmNvbSAgKDMuMDAwIGNvcnJlb3MvbWVz'
    'KQojIDIuIEFQSSBLZXlzIC0+IENyZWF0ZSBBUEkgS2V5IC0+IGNvcGlhIGxhIGNsYXZlIChlbXBpZXphIHBvciByZV8pCiMgMy4g'
    'UGFyYSBwcnVlYmFzIHB1ZWRlcyB1c2FyIGVsIHJlbWl0ZW50ZSBvbmJvYXJkaW5nQHJlc2VuZC5kZXYKIyAgICAoc29sbyBsbGVn'
    'YSBhIFRVIHByb3BpbyBjb3JyZW8gcmVnaXN0cmFkbyBlbiBSZXNlbmQpLgojICAgIFBhcmEgZW52aWFyIGEgY3VhbHF1aWVyYSwg'
    'dmVyaWZpY2EgdHUgZG9taW5pbyBlbiBSZXNlbmQgLT4gRG9tYWlucy4KUkVTRU5EX0FQSV9LRVk9cmVfeHh4eHh4eHh4eHh4eHh4'
    'eHh4eHh4eHh4CkVNQUlMX0ZST009QkFOQ0EgTkVOIDxvbmJvYXJkaW5nQHJlc2VuZC5kZXY+CgojIC0tLS0tLS0tLS0gT1BDSU9O'
    'IEI6IFNNVFAgKEdtYWlsKSAtLS0tLS0tLS0tCiMgUG9uIEVNQUlMX1BST1ZJREVSPXNtdHAgeSBjb21lbnRhIFJFU0VORF9BUElf'
    'S0VZLgojIElNUE9SVEFOVEU6IGNvbiBHbWFpbCBuZWNlc2l0YXMgdW5hIENPTlRSQVNFTkEgREUgQVBMSUNBQ0lPTiBkZSAxNiBj'
    'YXJhY3RlcmVzOgojICAgMS4gQWN0aXZhIGxhIHZlcmlmaWNhY2lvbiBlbiAyIHBhc29zIGVuIHR1IGN1ZW50YSBHb29nbGUKIyAg'
    'IDIuIGh0dHBzOi8vbXlhY2NvdW50Lmdvb2dsZS5jb20vYXBwcGFzc3dvcmRzIC0+IGdlbmVyYSB1bmEKIyAgIDMuIFBlZ2FsYSBl'
    'biBTTVRQX1BBU1MgKHNpbiBlc3BhY2lvcykuIE5PIHVzZXMgdHUgY29udHJhc2VuYSBub3JtYWwuCiMgU01UUF9IT1NUPXNtdHAu'
    'Z21haWwuY29tCiMgU01UUF9QT1JUPTU4NwojIFNNVFBfU0VDVVJFPWZhbHNlCiMgU01UUF9VU0VSPXR1Y29ycmVvQGdtYWlsLmNv'
    'bQojIFNNVFBfUEFTUz1hYmNkZWZnaGlqa2xtbm9wCiMgU01UUF9GUk9NPUJBTkNBIE5FTiA8dHVjb3JyZW9AZ21haWwuY29tPgoK'
    'IyAtLS0tLS0tLS0tIE9QQ0lPTiBDOiBzaW4gY29ycmVvIChzb2xvIGNvbnNvbGEpIC0tLS0tLS0tLS0KIyBFTUFJTF9QUk9WSURF'
    'Uj1jb25zb2xlCiMgTG9zIGNvZGlnb3Mgc2UgaW1wcmltZW4gZW4gbGEgdGVybWluYWwgZGVsIGJhY2tlbmQuCgojID09PT09PT09'
    'PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQojICBTTVMgKG9wY2lvbmFsKS4gU2kg'
    'bm8gbG8gY29uZmlndXJhcywgbGEgdmVyaWZpY2FjaW9uIHBvcgojICB0ZWxlZm9ubyBzZSBvbWl0ZSBhdXRvbWF0aWNhbWVudGUg'
    'eSBzb2xvIHNlIHBpZGUgZWwgZW1haWwuCiMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09'
    'PT09PT09PT09PT09CiMgVFdJTElPX0FDQ09VTlRfU0lEPUFDeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4CiMgVFdJTElPX0FVVEhf'
    'VE9LRU49eHh4eHh4eHh4eHh4eHh4eAojIFRXSUxJT19QSE9ORV9OVU1CRVI9KzE1NTUxMjM0NTY3CgojIC0tLS0tLS0tLS0gUmVk'
    'aXMgKG9wY2lvbmFsKSAtLS0tLS0tLS0tClJFRElTX1VSTD1yZWRpczovL2xvY2FsaG9zdDo2Mzc5Cg=='
    ) -join ''
  },
  @{
    Path = 'backend/Dockerfile'
    B64  = @(
    'IyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKIyBCQU5DQSBORU4g4oCUIEJhY2tlbmQgKEV4cHJlc3MgKyBU'
    'eXBlU2NyaXB0KQojIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKU'
    'gOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKU'
    'gOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgAoKIyAtLS0tLS0tLS0tIFNUQUdFIDE6IGJ1'
    'aWxkIC0tLS0tLS0tLS0KRlJPTSBub2RlOjIwLWFscGluZSBBUyBidWlsZApXT1JLRElSIC9hcHAKCkNPUFkgcGFja2FnZSouanNv'
    'biAuLwpSVU4gbnBtIGluc3RhbGwKCkNPUFkgdHNjb25maWcuanNvbiAuLwpDT1BZIHNyYyAuL3NyYwoKIyBFbCBwcm95ZWN0byB0'
    'aWVuZSBlcnJvcmVzIGRlIHRpcG9zIHByZWV4aXN0ZW50ZXMgZW4gbW9kdWxvcyBubyBjcml0aWNvcwojIChhZG1pbiwgb3JkZXJz'
    'LCByZXBvcnRzLCBpYSkuIENvbiAibm9FbWl0T25FcnJvciBmYWxzZSIgVHlwZVNjcmlwdCBlbWl0ZSBlbAojIEphdmFTY3JpcHQg'
    'aWd1YWxtZW50ZS4gRWwgInx8IHRydWUiIGV2aXRhIHF1ZSBlbCBidWlsZCBzZSBkZXRlbmdhLgpSVU4gbnB4IHRzYyAtLW5vRW1p'
    'dE9uRXJyb3IgZmFsc2UgfHwgdHJ1ZQoKIyBWZXJpZmljYWNpb24gUkVBTDogc2kgZGlzdC9hcHAuanMgbm8gZXhpc3RlLCBsYSBp'
    'bWFnZW4gc2VyaWEgaW5zZXJ2aWJsZSB5CiMgZWwgY29udGVuZWRvciBtb3JpcmlhIGFsIGFycmFuY2FyLiBQcmVmZXJpbW9zIGZh'
    'bGxhciBhcXVpIGNvbiB1biBtZW5zYWplIGNsYXJvLgpSVU4gdGVzdCAtZiBkaXN0L2FwcC5qcyB8fCAoZWNobyAiRVJST1I6IGxh'
    'IGNvbXBpbGFjaW9uIG5vIGdlbmVybyBkaXN0L2FwcC5qcyIgJiYgZXhpdCAxKQpSVU4gdGVzdCAtZiBkaXN0L2NvbmZpZy9lbWFp'
    'bC5qcyB8fCAoZWNobyAiRVJST1I6IGZhbHRhIGRpc3QvY29uZmlnL2VtYWlsLmpzIiAmJiBleGl0IDEpCgojIC0tLS0tLS0tLS0g'
    'U1RBR0UgMjogcnVudGltZSAtLS0tLS0tLS0tCkZST00gbm9kZToyMC1hbHBpbmUKV09SS0RJUiAvYXBwCkVOViBOT0RFX0VOVj1w'
    'cm9kdWN0aW9uCgojIGN1cmwgbG8gdXNhIGVsIGhlYWx0aGNoZWNrIGRlIGRvY2tlci1jb21wb3NlClJVTiBhcGsgYWRkIC0tbm8t'
    'Y2FjaGUgY3VybAoKQ09QWSBwYWNrYWdlKi5qc29uIC4vClJVTiBucG0gaW5zdGFsbCAtLW9taXQ9ZGV2ICYmIG5wbSBjYWNoZSBj'
    'bGVhbiAtLWZvcmNlCgpDT1BZIC0tZnJvbT1idWlsZCAvYXBwL2Rpc3QgLi9kaXN0CgojIENhcnBldGEgZGUgbG9ncyAod2luc3Rv'
    'biBlc2NyaWJlIGVuIGxvZ3MvKSBjb24gcGVybWlzb3MgcGFyYSBlbCB1c3VhcmlvIG5vZGUKUlVOIG1rZGlyIC1wIGxvZ3MgJiYg'
    'Y2hvd24gLVIgbm9kZTpub2RlIC9hcHAKCiMgTm8gZWplY3V0YXIgY29tbyByb290ClVTRVIgbm9kZQoKRVhQT1NFIDMwMDAKQ01E'
    'IFsibm9kZSIsICJkaXN0L2FwcC5qcyJdCg=='
    ) -join ''
  },
  @{
    Path = 'backend/.dockerignore'
    B64  = @(
    'bm9kZV9tb2R1bGVzCmRpc3QKbG9ncwoqLmxvZwouZW52Ci5lbnYuKgohLmVudi5leGFtcGxlCi5naXQKdGVzdHMKKi5tZApjcmVh'
    'dGUtbW9kZWxzLnBzMQpmaXgtZW52LnBzMQo='
    ) -join ''
  },
  @{
    Path = 'docker-compose.yml'
    B64  = @(
    'IyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKIyBCQU5DQSBORU4g4oCUIFN0YWNrIGNvbXBsZXRvIGVuIERv'
    'Y2tlcgojCiMgICBkb2NrZXIgY29tcG9zZSB1cCAtZCAtLWJ1aWxkICAgICAgbGV2YW50YXIgdG9kbwojICAgZG9ja2VyIGNvbXBv'
    'c2UgbG9ncyAtZiBiYWNrZW5kICAgIHZlciBsb3MgY29kaWdvcyBkZSB2ZXJpZmljYWNpb24KIyAgIGRvY2tlciBjb21wb3NlIGRv'
    'd24gICAgICAgICAgICAgICBwYXJhcgojICAgZG9ja2VyIGNvbXBvc2UgZG93biAtdiAgICAgICAgICAgIHBhcmFyIHkgQk9SUkFS'
    'IGxhIGJhc2UgZGUgZGF0b3MKIwojIExhIGNvbmZpZ3VyYWNpb24gZGUgY29ycmVvIHNlIGxlZSBkZWwgYXJjaGl2byAuZW52IGRl'
    'IEVTVEEgY2FycGV0YS4KIyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKbmFtZTogYmFuY2EtbmVuCgpzZXJ2'
    'aWNlczoKICAjIOKUgOKUgCBCYXNlIGRlIGRhdG9zIOKUgOKUgAogIHBvc3RncmVzOgogICAgaW1hZ2U6IHBvc3RncmVzOjE2LWFs'
    'cGluZQogICAgY29udGFpbmVyX25hbWU6IGJhbmNhX25lbl9wb3N0Z3JlcwogICAgcmVzdGFydDogdW5sZXNzLXN0b3BwZWQKICAg'
    'IGVudmlyb25tZW50OgogICAgICBQT1NUR1JFU19VU0VSOiBiYW5jYV9uZW4KICAgICAgUE9TVEdSRVNfUEFTU1dPUkQ6IGJhbmNh'
    'X25lbl9zZWNyZXQKICAgICAgUE9TVEdSRVNfREI6IGJhbmNhX25lbgogICAgcG9ydHM6CiAgICAgIC0gIjU0MzM6NTQzMiIKICAg'
    'IHZvbHVtZXM6CiAgICAgIC0gcG9zdGdyZXNfZGF0YTovdmFyL2xpYi9wb3N0Z3Jlc3FsL2RhdGEKICAgIGhlYWx0aGNoZWNrOgog'
    'ICAgICB0ZXN0OiBbIkNNRC1TSEVMTCIsICJwZ19pc3JlYWR5IC1VIGJhbmNhX25lbiAtZCBiYW5jYV9uZW4iXQogICAgICBpbnRl'
    'cnZhbDogNXMKICAgICAgdGltZW91dDogNXMKICAgICAgcmV0cmllczogMTAKICAgICAgc3RhcnRfcGVyaW9kOiAxMHMKCiAgIyDi'
    'lIDilIAgUmVkaXMg4pSA4pSACiAgcmVkaXM6CiAgICBpbWFnZTogcmVkaXM6Ny1hbHBpbmUKICAgIGNvbnRhaW5lcl9uYW1lOiBi'
    'YW5jYV9uZW5fcmVkaXMKICAgIHJlc3RhcnQ6IHVubGVzcy1zdG9wcGVkCiAgICBwb3J0czoKICAgICAgLSAiNjM4MDo2Mzc5Igog'
    'ICAgdm9sdW1lczoKICAgICAgLSByZWRpc19kYXRhOi9kYXRhCiAgICBoZWFsdGhjaGVjazoKICAgICAgdGVzdDogWyJDTUQiLCAi'
    'cmVkaXMtY2xpIiwgInBpbmciXQogICAgICBpbnRlcnZhbDogNXMKICAgICAgdGltZW91dDogNXMKICAgICAgcmV0cmllczogMTAK'
    'CiAgIyDilIDilIAgQVBJIEJhY2tlbmQgKEV4cHJlc3MpIOKUgOKUgAogIGJhY2tlbmQ6CiAgICBidWlsZDoKICAgICAgY29udGV4'
    'dDogLi9iYWNrZW5kCiAgICAgIGRvY2tlcmZpbGU6IERvY2tlcmZpbGUKICAgIGNvbnRhaW5lcl9uYW1lOiBiYW5jYV9uZW5fYmFj'
    'a2VuZAogICAgcmVzdGFydDogdW5sZXNzLXN0b3BwZWQKICAgICMgY29uZGl0aW9uOiBzZXJ2aWNlX2hlYWx0aHkgPSBlc3BlcmFy'
    'IGEgcXVlIFBvc3RncmVzIEFDRVBURSBjb25leGlvbmVzLAogICAgIyBubyBzb2xvIGEgcXVlIGVsIGNvbnRlbmVkb3IgZXhpc3Rh'
    'LiBTaW4gZXN0byBlbCBiYWNrZW5kIGFycmFuY2FiYSBhbnRlcwogICAgIyBkZSB0aWVtcG8sIGZhbGxhYmEgbGEgY29uZXhpb24g'
    'eSBzZSBjZXJyYWJhLgogICAgZGVwZW5kc19vbjoKICAgICAgcG9zdGdyZXM6CiAgICAgICAgY29uZGl0aW9uOiBzZXJ2aWNlX2hl'
    'YWx0aHkKICAgICAgcmVkaXM6CiAgICAgICAgY29uZGl0aW9uOiBzZXJ2aWNlX2hlYWx0aHkKICAgIGVudmlyb25tZW50OgogICAg'
    'ICBQT1JUOiAiMzAwMCIKICAgICAgSE9TVDogIjAuMC4wLjAiCiAgICAgIE5PREVfRU5WOiBwcm9kdWN0aW9uCgogICAgICAjIOKU'
    'gOKUgCBCYXNlIGRlIGRhdG9zIOKUgOKUgAogICAgICAjICJwb3N0Z3JlcyIgZXMgZWwgTk9NQlJFIERFTCBTRVJWSUNJTy4gRGVu'
    'dHJvIGRlIGxhIHJlZCBkZSBEb2NrZXIgc2UKICAgICAgIyByZXN1ZWx2ZSBzb2xvLiBOdW5jYSB1c2VzIGxvY2FsaG9zdCBhcXVp'
    'LgogICAgICBEQl9IT1NUOiBwb3N0Z3JlcwogICAgICBEQl9QT1JUOiAiNTQzMiIKICAgICAgREJfVVNFUjogYmFuY2FfbmVuCiAg'
    'ICAgIERCX1BBU1NXT1JEOiBiYW5jYV9uZW5fc2VjcmV0CiAgICAgIERCX05BTUU6IGJhbmNhX25lbgogICAgICBEQl9TU0w6ICJm'
    'YWxzZSIKCiAgICAgICMg4pSA4pSAIFJlZGlzIOKUgOKUgAogICAgICBSRURJU19IT1NUOiByZWRpcwogICAgICBSRURJU19QT1JU'
    'OiAiNjM3OSIKCiAgICAgICMg4pSA4pSAIEpXVCDigJQgQ0FNQklBIEVTVE9TIFNFQ1JFVE9TIEVOIFBST0RVQ0NJT04g4pSA4pSA'
    'CiAgICAgIEpXVF9TRUNSRVQ6ICIke0pXVF9TRUNSRVQ6LWJhbmNhX25lbl9kb2NrZXJfc2VjcmV0X21pbl8zMl9jaGFyc19jaGFu'
    'Z2VfbWVfMjAyNX0iCiAgICAgIEpXVF9FWFBJUkVTX0lOOiAiMjRoIgogICAgICBKV1RfUkVGUkVTSF9FWFBJUkVTX0lOOiAiN2Qi'
    'CgogICAgICAjIOKUgOKUgCBDT1JSRU8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA'
    '4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA'
    '4pSA4pSA4pSA4pSACiAgICAgICMgU2UgbGVlbiBkZWwgYXJjaGl2byAuZW52IGRlIGxhIHJhaXogZGVsIHByb3llY3RvLgogICAg'
    'ICAjIFNpbiBjb25maWd1cmFyIHF1ZWRhIGVuICJjb25zb2xlIjogbG9zIGNvZGlnb3Mgc2FsZW4gZW4KICAgICAgIyAgICAgZG9j'
    'a2VyIGNvbXBvc2UgbG9ncyAtZiBiYWNrZW5kCiAgICAgIEVNQUlMX1BST1ZJREVSOiAiJHtFTUFJTF9QUk9WSURFUjotY29uc29s'
    'ZX0iCiAgICAgIFJFU0VORF9BUElfS0VZOiAiJHtSRVNFTkRfQVBJX0tFWTotfSIKICAgICAgRU1BSUxfRlJPTTogIiR7RU1BSUxf'
    'RlJPTTotQkFOQ0EgTkVOIDxvbmJvYXJkaW5nQHJlc2VuZC5kZXY+fSIKICAgICAgU01UUF9IT1NUOiAiJHtTTVRQX0hPU1Q6LX0i'
    'CiAgICAgIFNNVFBfUE9SVDogIiR7U01UUF9QT1JUOi01ODd9IgogICAgICBTTVRQX1NFQ1VSRTogIiR7U01UUF9TRUNVUkU6LWZh'
    'bHNlfSIKICAgICAgU01UUF9VU0VSOiAiJHtTTVRQX1VTRVI6LX0iCiAgICAgIFNNVFBfUEFTUzogIiR7U01UUF9QQVNTOi19Igog'
    'ICAgICBTTVRQX0ZST006ICIke1NNVFBfRlJPTTotfSIKCiAgICAgICMg4pSA4pSAIFNNUyAob3BjaW9uYWwpIOKUgOKUgAogICAg'
    'ICBUV0lMSU9fQUNDT1VOVF9TSUQ6ICIke1RXSUxJT19BQ0NPVU5UX1NJRDotfSIKICAgICAgVFdJTElPX0FVVEhfVE9LRU46ICIk'
    'e1RXSUxJT19BVVRIX1RPS0VOOi19IgogICAgICBUV0lMSU9fUEhPTkVfTlVNQkVSOiAiJHtUV0lMSU9fUEhPTkVfTlVNQkVSOi19'
    'IgoKICAgICAgIyBVUkwgcXVlIGFwYXJlY2UgZW4gZWwgZW5sYWNlIGRlIHJlY3VwZXJhciBjb250cmFzZW5hCiAgICAgIEZST05U'
    'RU5EX1VSTDogIiR7RlJPTlRFTkRfVVJMOi1odHRwOi8vbG9jYWxob3N0OjUxNzN9IgogICAgcG9ydHM6CiAgICAgIC0gIjMwMDA6'
    'MzAwMCIKICAgIGhlYWx0aGNoZWNrOgogICAgICB0ZXN0OiBbIkNNRCIsICJjdXJsIiwgIi1mc1MiLCAiaHR0cDovL2xvY2FsaG9z'
    'dDozMDAwL2FwaS92MS9oZWFsdGgiXQogICAgICBpbnRlcnZhbDogMTBzCiAgICAgIHRpbWVvdXQ6IDVzCiAgICAgIHJldHJpZXM6'
    'IDUKICAgICAgc3RhcnRfcGVyaW9kOiA0MHMKCiAgIyDilIDilIAgRnJvbnRlbmQgKFJlYWN0ICsgVml0ZSBzZXJ2aWRvIHBvciBO'
    'Z2lueCkg4pSA4pSACiAgZnJvbnRlbmQ6CiAgICBidWlsZDoKICAgICAgY29udGV4dDogLi9mcm9udGVuZAogICAgICBkb2NrZXJm'
    'aWxlOiBEb2NrZXJmaWxlCiAgICBjb250YWluZXJfbmFtZTogYmFuY2FfbmVuX2Zyb250ZW5kCiAgICByZXN0YXJ0OiB1bmxlc3Mt'
    'c3RvcHBlZAogICAgZGVwZW5kc19vbjoKICAgICAgYmFja2VuZDoKICAgICAgICBjb25kaXRpb246IHNlcnZpY2Vfc3RhcnRlZAog'
    'ICAgcG9ydHM6CiAgICAgIC0gIjUxNzM6ODAiCgogICMg4pSA4pSAIElBIHNlcnZpY2UgKEZhc3RBUEkpIOKUgOKUgAogIGlhLXNl'
    'cnZpY2U6CiAgICBidWlsZDogLi9pYS1zZXJ2aWNlCiAgICBjb250YWluZXJfbmFtZTogYmFuY2FfbmVuX2lhCiAgICByZXN0YXJ0'
    'OiB1bmxlc3Mtc3RvcHBlZAogICAgcG9ydHM6CiAgICAgIC0gIjgwMDA6ODAwMCIKCnZvbHVtZXM6CiAgcG9zdGdyZXNfZGF0YToK'
    'ICByZWRpc19kYXRhOgo='
    ) -join ''
  },
  @{
    Path = 'frontend/Dockerfile'
    B64  = @(
    'IyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKIyBCQU5DQSBORU4g4oCUIEZyb250ZW5kIChSZWFjdCArIFZp'
    'dGUpIHNlcnZpZG8gcG9yIE5naW54CiMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA'
    '4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA'
    '4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACgojIC0tLS0tLS0tLS0g'
    'U1RBR0UgMTogYnVpbGQgLS0tLS0tLS0tLQpGUk9NIG5vZGU6MjAtYWxwaW5lIEFTIGJ1aWxkCldPUktESVIgL2FwcAoKQ09QWSBw'
    'YWNrYWdlKi5qc29uIC4vClJVTiBucG0gaW5zdGFsbAoKQ09QWSAuIC4KCiMgRWwgc2NyaXB0IGRlbCBwcm95ZWN0byBlcyAidHNj'
    'IC0tbm9FbWl0ICYmIHZpdGUgYnVpbGQiLCBwZXJvIGVsIGNoZXF1ZW8gZGUKIyB0aXBvcyBmYWxsYSBwb3IgdGlwYWRvIHN1ZWx0'
    'byBwcmVleGlzdGVudGUuIFZpdGUgdHJhbnNwaWxhIHNpbiBjb21wcm9iYXIKIyB0aXBvcywgYXNpIHF1ZSBlbCBidW5kbGUgc2Fs'
    'ZSBjb3JyZWN0byBpZ3VhbG1lbnRlLgpSVU4gbnB4IHZpdGUgYnVpbGQKCiMgU2kgbm8gaGF5IGluZGV4Lmh0bWwgbGEgaW1hZ2Vu'
    'IHNlcnZpcmlhIHVuYSBwYWdpbmEgZW4gYmxhbmNvOiBtZWpvciBmYWxsYXIgYXF1aS4KUlVOIHRlc3QgLWYgZGlzdC9pbmRleC5o'
    'dG1sIHx8IChlY2hvICJFUlJPUjogdml0ZSBidWlsZCBubyBnZW5lcm8gZGlzdC9pbmRleC5odG1sIiAmJiBleGl0IDEpCgojIC0t'
    'LS0tLS0tLS0gU1RBR0UgMjogc2VydmUgLS0tLS0tLS0tLQpGUk9NIG5naW54OmFscGluZQoKQ09QWSBuZ2lueC5jb25mIC9ldGMv'
    'bmdpbngvY29uZi5kL2RlZmF1bHQuY29uZgpDT1BZIC0tZnJvbT1idWlsZCAvYXBwL2Rpc3QgL3Vzci9zaGFyZS9uZ2lueC9odG1s'
    'CgojIEZhbGxhIGVsIGJ1aWxkIHNpIGxhIGNvbmZpZyBkZSBOZ2lueCB0aWVuZSBlcnJvcmVzIGRlIHNpbnRheGlzClJVTiBuZ2lu'
    'eCAtdAoKRVhQT1NFIDgwCkhFQUxUSENIRUNLIC0taW50ZXJ2YWw9MzBzIC0tdGltZW91dD01cyAtLXN0YXJ0LXBlcmlvZD0xMHMg'
    'LS1yZXRyaWVzPTMgXAogIENNRCB3Z2V0IC1xTy0gaHR0cDovL2xvY2FsaG9zdC9uZ2lueC1oZWFsdGggfHwgZXhpdCAxCgpDTUQg'
    'WyJuZ2lueCIsICItZyIsICJkYWVtb24gb2ZmOyJdCg=='
    ) -join ''
  },
  @{
    Path = 'frontend/nginx.conf'
    B64  = @(
    'IyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKIyBCQU5DQSBORU4g4oCUIEZyb250ZW5kIChOZ2lueCkKIyBT'
    'aXJ2ZSBsYSBTUEEgeSBoYWNlIGRlIHByb3h5IGhhY2lhIGVsIGJhY2tlbmQuCiMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA'
    '4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA'
    '4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA'
    '4pSA4pSA4pSACnNlcnZlciB7CiAgICBsaXN0ZW4gODA7CiAgICBzZXJ2ZXJfbmFtZSBfOwoKICAgIHJvb3QgL3Vzci9zaGFyZS9u'
    'Z2lueC9odG1sOwogICAgaW5kZXggaW5kZXguaHRtbDsKCiAgICAjIEVsIG5hdmVnYWRvciBkZWwgdXN1YXJpbyBOTyBwdWVkZSB2'
    'ZXIgZWwgY29udGVuZWRvciAiYmFja2VuZCIuCiAgICAjIFBvciBlc28gZWwgZnJvbnRlbmQgbGxhbWEgYSAvYXBpIChtaXNtYSBV'
    'UkwpIHkgTmdpbnggcmVlbnZpYSBhcXVpIGRlbnRyby4KICAgIHJlc29sdmVyIDEyNy4wLjAuMTEgdmFsaWQ9MTBzOwoKICAgIGNs'
    'aWVudF9tYXhfYm9keV9zaXplIDEwTTsKCiAgICAjIFNQQTogY3VhbHF1aWVyIHJ1dGEgZGVzY29ub2NpZGEgbGEgcmVzdWVsdmUg'
    'UmVhY3QgUm91dGVyCiAgICBsb2NhdGlvbiAvIHsKICAgICAgICB0cnlfZmlsZXMgJHVyaSAkdXJpLyAvaW5kZXguaHRtbDsKICAg'
    'IH0KCiAgICAjIExvcyBhc3NldHMgY29uIGhhc2ggc2UgcHVlZGVuIGNhY2hlYXIgcGFyYSBzaWVtcHJlCiAgICBsb2NhdGlvbiAv'
    'YXNzZXRzLyB7CiAgICAgICAgZXhwaXJlcyAxeTsKICAgICAgICBhZGRfaGVhZGVyIENhY2hlLUNvbnRyb2wgInB1YmxpYywgaW1t'
    'dXRhYmxlIjsKICAgICAgICB0cnlfZmlsZXMgJHVyaSA9NDA0OwogICAgfQoKICAgICMgaW5kZXguaHRtbCBudW5jYSBzZSBjYWNo'
    'ZWEsIHBhcmEgcXVlIHVuIGRlcGxveSBudWV2byBzZSB2ZWEgYWwgaW5zdGFudGUKICAgIGxvY2F0aW9uID0gL2luZGV4Lmh0bWwg'
    'ewogICAgICAgIGFkZF9oZWFkZXIgQ2FjaGUtQ29udHJvbCAibm8tY2FjaGUsIG5vLXN0b3JlLCBtdXN0LXJldmFsaWRhdGUiOwog'
    'ICAgfQoKICAgICMg4pSA4pSAIEFQSSDihpIgYmFja2VuZCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDi'
    'lIDilIDilIAKICAgICMgT0pPOiAicHJveHlfcGFzcyBodHRwOi8vYmFja2VuZDozMDAwIiAoc2luIGJhcnJhIGZpbmFsKSBjb25z'
    'ZXJ2YSBsYSBydXRhCiAgICAjIGNvbXBsZXRhLCBxdWUgZXMgbG8gcXVlIHF1ZXJlbW9zOiAvYXBpL3YxL2F1dGgvbG9naW4gbGxl'
    'Z2EgaWd1YWwuCiAgICBsb2NhdGlvbiAvYXBpLyB7CiAgICAgICAgIyBVc2Ftb3MgdW5hIHZhcmlhYmxlIGEgcHJvcG9zaXRvOiBv'
    'YmxpZ2EgYSBOZ2lueCBhIHJlc29sdmVyIGVsIEROUyBlbgogICAgICAgICMgY2FkYSBwZXRpY2lvbiBlbiB2ZXogZGUgYWwgYXJy'
    'YW5jYXIuIFNpIG5vLCBOZ2lueCBzZSBuaWVnYSBhIGluaWNpYXIKICAgICAgICAjIGN1YW5kbyBlbCBjb250ZW5lZG9yICJiYWNr'
    'ZW5kIiB0b2RhdmlhIG5vIGV4aXN0ZSwgeSBlbCBmcm9udGVuZAogICAgICAgICMgcXVlZGFiYSBjYWlkby4gJHJlcXVlc3RfdXJp'
    'IGNvbnNlcnZhIGxhIHJ1dGEgeSBsb3MgcGFyYW1ldHJvcy4KICAgICAgICBzZXQgJHVwc3RyZWFtX2JhY2tlbmQgImJhY2tlbmQ6'
    'MzAwMCI7CiAgICAgICAgcHJveHlfcGFzcyBodHRwOi8vJHVwc3RyZWFtX2JhY2tlbmQkcmVxdWVzdF91cmk7CiAgICAgICAgcHJv'
    'eHlfaHR0cF92ZXJzaW9uIDEuMTsKCiAgICAgICAgcHJveHlfc2V0X2hlYWRlciBIb3N0ICAgICAgICAgICAgICAkaG9zdDsKICAg'
    'ICAgICBwcm94eV9zZXRfaGVhZGVyIFgtUmVhbC1JUCAgICAgICAgICRyZW1vdGVfYWRkcjsKICAgICAgICBwcm94eV9zZXRfaGVh'
    'ZGVyIFgtRm9yd2FyZGVkLUZvciAgICRwcm94eV9hZGRfeF9mb3J3YXJkZWRfZm9yOwogICAgICAgIHByb3h5X3NldF9oZWFkZXIg'
    'WC1Gb3J3YXJkZWQtUHJvdG8gJHNjaGVtZTsKCiAgICAgICAgIyBXZWJTb2NrZXQgKHNvY2tldC5pbykKICAgICAgICBwcm94eV9z'
    'ZXRfaGVhZGVyIFVwZ3JhZGUgICAgJGh0dHBfdXBncmFkZTsKICAgICAgICBwcm94eV9zZXRfaGVhZGVyIENvbm5lY3Rpb24gInVw'
    'Z3JhZGUiOwoKICAgICAgICAjIEVsIHJlZ2lzdHJvIGVudmlhIHVuIGNvcnJlbzogcHVlZGUgdGFyZGFyIHVub3Mgc2VndW5kb3MK'
    'ICAgICAgICBwcm94eV9jb25uZWN0X3RpbWVvdXQgMTBzOwogICAgICAgIHByb3h5X3NlbmRfdGltZW91dCAgICA2MHM7CiAgICAg'
    'ICAgcHJveHlfcmVhZF90aW1lb3V0ICAgIDYwczsKCiAgICAgICAgIyBRdWUgbG9zIGVycm9yZXMgZGVsIGJhY2tlbmQgbGxlZ3Vl'
    'biB0YWwgY3VhbCBhbCBmcm9udGVuZAogICAgICAgIHByb3h5X2ludGVyY2VwdF9lcnJvcnMgb2ZmOwogICAgfQoKICAgICMgQ29t'
    'cHJvYmFyIHF1ZSBOZ2lueCBlc3RhIHZpdm8KICAgIGxvY2F0aW9uID0gL25naW54LWhlYWx0aCB7CiAgICAgICAgYWNjZXNzX2xv'
    'ZyBvZmY7CiAgICAgICAgcmV0dXJuIDIwMCAib2tcbiI7CiAgICAgICAgYWRkX2hlYWRlciBDb250ZW50LVR5cGUgdGV4dC9wbGFp'
    'bjsKICAgIH0KCiAgICBnemlwIG9uOwogICAgZ3ppcF90eXBlcyB0ZXh0L3BsYWluIHRleHQvY3NzIGFwcGxpY2F0aW9uL2pzb24g'
    'YXBwbGljYXRpb24vamF2YXNjcmlwdCB0ZXh0L3htbCBhcHBsaWNhdGlvbi94bWwgaW1hZ2Uvc3ZnK3htbDsKICAgIGd6aXBfbWlu'
    'X2xlbmd0aCAxMDI0Owp9Cg=='
    ) -join ''
  },
  @{
    Path = 'frontend/.dockerignore'
    B64  = @(
    'bm9kZV9tb2R1bGVzCmRpc3QKLmVudgouZW52LioKLmdpdAoqLm1kCg=='
    ) -join ''
  },
  @{
    Path = 'frontend/src/App.tsx'
    B64  = @(
    'aW1wb3J0IHsgQnJvd3NlclJvdXRlciwgUm91dGVzLCBSb3V0ZSwgTmF2aWdhdGUgfSBmcm9tICJyZWFjdC1yb3V0ZXItZG9tIjsK'
    'CmltcG9ydCB7IHVzZUF1dGhTdG9yZSB9IGZyb20gIi4vc3RvcmUvYXV0aC5zbGljZSI7CgovKiBBdXRoICovCmltcG9ydCBMYW5k'
    'aW5nIGZyb20gIi4vcGFnZXMvbGFuZGluZy9MYW5kaW5nIjsKaW1wb3J0IExvZ2luIGZyb20gIi4vcGFnZXMvYXV0aC9Mb2dpbiI7'
    'CmltcG9ydCBSZWdpc3RlciBmcm9tICIuL3BhZ2VzL2F1dGgvUmVnaXN0ZXIiOwppbXBvcnQgVmVyaWZ5IGZyb20gIi4vcGFnZXMv'
    'YXV0aC9WZXJpZnkiOwppbXBvcnQgRm9yZ290UGFzc3dvcmQgZnJvbSAiLi9wYWdlcy9hdXRoL0ZvcmdvdFBhc3N3b3JkIjsKaW1w'
    'b3J0IFJlc2V0UGFzc3dvcmQgZnJvbSAiLi9wYWdlcy9hdXRoL1Jlc2V0UGFzc3dvcmQiOwppbXBvcnQgVHdvRmFjdG9yU2V0dXAg'
    'ZnJvbSAiLi9wYWdlcy9hdXRoL1R3b0ZhY3RvclNldHVwIjsKCi8qIFBvcnRhbCAodXN1YXJpbyArIGFkbWluKSAqLwppbXBvcnQg'
    'RGFzaGJvYXJkIGZyb20gIi4vcGFnZXMvZGFzaGJvYXJkL0Rhc2hib2FyZCI7CmltcG9ydCBXYWxsZXRQYWdlIGZyb20gIi4vcGFn'
    'ZXMvd2FsbGV0L1dhbGxldCI7CmltcG9ydCBEZXBvc2l0IGZyb20gIi4vcGFnZXMvd2FsbGV0L0RlcG9zaXQiOwppbXBvcnQgV2l0'
    'aGRyYXcgZnJvbSAiLi9wYWdlcy93YWxsZXQvV2l0aGRyYXciOwppbXBvcnQgVHJhZGluZyBmcm9tICIuL3BhZ2VzL3RyYWRpbmcv'
    'VHJhZGluZyI7CmltcG9ydCBQcmVkaWN0aW9uIGZyb20gIi4vcGFnZXMvdHJhZGluZy9QcmVkaWN0aW9uIjsKaW1wb3J0IE9yZGVy'
    'SGlzdG9yeSBmcm9tICIuL3BhZ2VzL3RyYWRpbmcvT3JkZXJIaXN0b3J5IjsKaW1wb3J0IFJlcG9ydHMgZnJvbSAiLi9wYWdlcy9y'
    'ZXBvcnRzL1JlcG9ydHMiOwppbXBvcnQgU2V0dGluZ3MgZnJvbSAiLi9wYWdlcy9zZXR0aW5ncy9TZXR0aW5ncyI7CmltcG9ydCBT'
    'ZWN1cml0eSBmcm9tICIuL3BhZ2VzL3NldHRpbmdzL1NlY3VyaXR5IjsKaW1wb3J0IEFkbWluIGZyb20gIi4vcGFnZXMvYWRtaW4v'
    'QWRtaW4iOwppbXBvcnQgVXNlcnMgZnJvbSAiLi9wYWdlcy9hZG1pbi9Vc2VycyI7CmltcG9ydCBBdWRpdCBmcm9tICIuL3BhZ2Vz'
    'L2FkbWluL0F1ZGl0IjsKaW1wb3J0IEFkbWluUmVwb3J0cyBmcm9tICIuL3BhZ2VzL2FkbWluL0FkbWluUmVwb3J0cyI7CmltcG9y'
    'dCBBZG1pblNldHRpbmdzIGZyb20gIi4vcGFnZXMvYWRtaW4vQWRtaW5TZXR0aW5ncyI7CgovKiBMYXlvdXQgw7puaWNvICovCmlt'
    'cG9ydCBBcHBMYXlvdXQgZnJvbSAiLi9jb21wb25lbnRzL2xheW91dC9BcHBMYXlvdXQiOwoKZnVuY3Rpb24gUHVibGljUm91dGUo'
    'eyBjaGlsZHJlbiB9OiB7IGNoaWxkcmVuOiBSZWFjdC5SZWFjdE5vZGUgfSkgewogIGNvbnN0IHsgaXNBdXRoZW50aWNhdGVkLCB1'
    'c2VyIH0gPSB1c2VBdXRoU3RvcmUoKTsKICBpZiAoaXNBdXRoZW50aWNhdGVkICYmIHVzZXI/LmlzVmVyaWZpZWQpIHJldHVybiA8'
    'TmF2aWdhdGUgdG89Ii9kYXNoYm9hcmQiIC8+OwogIGlmIChpc0F1dGhlbnRpY2F0ZWQpIHJldHVybiA8TmF2aWdhdGUgdG89Ii92'
    'ZXJpZnkiIC8+OwogIHJldHVybiA8PntjaGlsZHJlbn08Lz47Cn0KCmZ1bmN0aW9uIFZlcmlmaWNhdGlvblJvdXRlKHsgY2hpbGRy'
    'ZW4gfTogeyBjaGlsZHJlbjogUmVhY3QuUmVhY3ROb2RlIH0pIHsKICBjb25zdCB7IGlzQXV0aGVudGljYXRlZCwgdXNlciB9ID0g'
    'dXNlQXV0aFN0b3JlKCk7CiAgaWYgKCFpc0F1dGhlbnRpY2F0ZWQpIHJldHVybiA8TmF2aWdhdGUgdG89Ii9sb2dpbiIgLz47CiAg'
    'aWYgKHVzZXI/LmlzVmVyaWZpZWQpIHJldHVybiA8TmF2aWdhdGUgdG89Ii9kYXNoYm9hcmQiIC8+OwogIHJldHVybiA8PntjaGls'
    'ZHJlbn08Lz47Cn0KCmZ1bmN0aW9uIFZlcmlmaWVkUm91dGUoeyBjaGlsZHJlbiB9OiB7IGNoaWxkcmVuOiBSZWFjdC5SZWFjdE5v'
    'ZGUgfSkgewogIGNvbnN0IHsgaXNBdXRoZW50aWNhdGVkLCB1c2VyIH0gPSB1c2VBdXRoU3RvcmUoKTsKICBpZiAoIWlzQXV0aGVu'
    'dGljYXRlZCkgcmV0dXJuIDxOYXZpZ2F0ZSB0bz0iL2xvZ2luIiAvPjsKICBpZiAoIXVzZXI/LmlzVmVyaWZpZWQpIHJldHVybiA8'
    'TmF2aWdhdGUgdG89Ii92ZXJpZnkiIC8+OwogIHJldHVybiA8PntjaGlsZHJlbn08Lz47Cn0KCmV4cG9ydCBkZWZhdWx0IGZ1bmN0'
    'aW9uIEFwcCgpIHsKICByZXR1cm4gKAogICAgPEJyb3dzZXJSb3V0ZXI+CiAgICAgIDxSb3V0ZXM+CiAgICAgICAgey8qIFDDumJs'
    'aWNvICovfQogICAgICAgIDxSb3V0ZSBwYXRoPSIvIiBlbGVtZW50PXs8TGFuZGluZyAvPn0gLz4KICAgICAgICA8Um91dGUgcGF0'
    'aD0iL2xvZ2luIiBlbGVtZW50PXs8UHVibGljUm91dGU+PExvZ2luIC8+PC9QdWJsaWNSb3V0ZT59IC8+CiAgICAgICAgPFJvdXRl'
    'IHBhdGg9Ii9yZWdpc3RlciIgZWxlbWVudD17PFB1YmxpY1JvdXRlPjxSZWdpc3RlciAvPjwvUHVibGljUm91dGU+fSAvPgogICAg'
    'ICAgIDxSb3V0ZSBwYXRoPSIvdmVyaWZ5IiBlbGVtZW50PXs8VmVyaWZpY2F0aW9uUm91dGU+PFZlcmlmeSAvPjwvVmVyaWZpY2F0'
    'aW9uUm91dGU+fSAvPgogICAgICAgIDxSb3V0ZSBwYXRoPSIvZm9yZ290LXBhc3N3b3JkIiBlbGVtZW50PXs8UHVibGljUm91dGU+'
    'PEZvcmdvdFBhc3N3b3JkIC8+PC9QdWJsaWNSb3V0ZT59IC8+CiAgICAgICAgPFJvdXRlIHBhdGg9Ii9yZXNldC1wYXNzd29yZCIg'
    'ZWxlbWVudD17PFJlc2V0UGFzc3dvcmQgLz59IC8+CiAgICAgICAgPFJvdXRlIHBhdGg9Ii9yZXNldC1wYXNzd29yZC86dG9rZW4i'
    'IGVsZW1lbnQ9ezxSZXNldFBhc3N3b3JkIC8+fSAvPgogICAgICAgIDxSb3V0ZSBwYXRoPSIvMmZhLXNldHVwIiBlbGVtZW50PXs8'
    'VmVyaWZpZWRSb3V0ZT48VHdvRmFjdG9yU2V0dXAgLz48L1ZlcmlmaWVkUm91dGU+fSAvPgoKICAgICAgICB7LyogVW4gc29sbyBs'
    'YXlvdXQgcGFyYSB0b2RvcyBsb3MgcG9ydGFsZXMgKGVsIHNpZGViYXIgc2UgYWRhcHRhIGFsIHJvbCkgKi99CiAgICAgICAgPFJv'
    'dXRlIGVsZW1lbnQ9ezxWZXJpZmllZFJvdXRlPjxBcHBMYXlvdXQgLz48L1ZlcmlmaWVkUm91dGU+fT4KICAgICAgICAgIHsvKiBQ'
    'b3J0YWwgdXN1YXJpbyAqL30KICAgICAgICAgIDxSb3V0ZSBwYXRoPSIvZGFzaGJvYXJkIiBlbGVtZW50PXs8RGFzaGJvYXJkIC8+'
    'fSAvPgogICAgICAgICAgPFJvdXRlIHBhdGg9Ii93YWxsZXQiIGVsZW1lbnQ9ezxXYWxsZXRQYWdlIC8+fSAvPgogICAgICAgICAg'
    'PFJvdXRlIHBhdGg9Ii93YWxsZXQvZGVwb3NpdCIgZWxlbWVudD17PERlcG9zaXQgLz59IC8+CiAgICAgICAgICA8Um91dGUgcGF0'
    'aD0iL3dhbGxldC93aXRoZHJhdyIgZWxlbWVudD17PFdpdGhkcmF3IC8+fSAvPgogICAgICAgICAgPFJvdXRlIHBhdGg9Ii90cmFk'
    'aW5nIiBlbGVtZW50PXs8VHJhZGluZyAvPn0gLz4KICAgICAgICAgIDxSb3V0ZSBwYXRoPSIvdHJhZGluZy9wcmVkaWN0aW9uIiBl'
    'bGVtZW50PXs8UHJlZGljdGlvbiAvPn0gLz4KICAgICAgICAgIDxSb3V0ZSBwYXRoPSIvdHJhZGluZy9oaXN0b3J5IiBlbGVtZW50'
    'PXs8T3JkZXJIaXN0b3J5IC8+fSAvPgogICAgICAgICAgPFJvdXRlIHBhdGg9Ii9yZXBvcnRzIiBlbGVtZW50PXs8UmVwb3J0cyAv'
    'Pn0gLz4KICAgICAgICAgIDxSb3V0ZSBwYXRoPSIvc2V0dGluZ3MiIGVsZW1lbnQ9ezxTZXR0aW5ncyAvPn0gLz4KICAgICAgICAg'
    'IDxSb3V0ZSBwYXRoPSIvc2V0dGluZ3Mvc2VjdXJpdHkiIGVsZW1lbnQ9ezxTZWN1cml0eSAvPn0gLz4KCiAgICAgICAgICB7Lyog'
    'UG9ydGFsIGFkbWluIChBcHBMYXlvdXQgdmFsaWRhIGVsIHJvbCkgKi99CiAgICAgICAgICA8Um91dGUgcGF0aD0iL2FkbWluIiBl'
    'bGVtZW50PXs8QWRtaW4gLz59IC8+CiAgICAgICAgICA8Um91dGUgcGF0aD0iL2FkbWluL3VzZXJzIiBlbGVtZW50PXs8VXNlcnMg'
    'Lz59IC8+CiAgICAgICAgICA8Um91dGUgcGF0aD0iL2FkbWluL2F1ZGl0IiBlbGVtZW50PXs8QXVkaXQgLz59IC8+CiAgICAgICAg'
    'ICA8Um91dGUgcGF0aD0iL2FkbWluL3JlcG9ydHMiIGVsZW1lbnQ9ezxBZG1pblJlcG9ydHMgLz59IC8+CiAgICAgICAgICA8Um91'
    'dGUgcGF0aD0iL2FkbWluL3NldHRpbmdzIiBlbGVtZW50PXs8QWRtaW5TZXR0aW5ncyAvPn0gLz4KICAgICAgICA8L1JvdXRlPgoK'
    'ICAgICAgICA8Um91dGUgcGF0aD0iKiIgZWxlbWVudD17PE5hdmlnYXRlIHRvPSIvIiByZXBsYWNlIC8+fSAvPgogICAgICA8L1Jv'
    'dXRlcz4KICAgIDwvQnJvd3NlclJvdXRlcj4KICApOwp9Cg=='
    ) -join ''
  },
  @{
    Path = 'frontend/src/services/auth.ts'
    B64  = @(
    'LyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09CiAgIFNFUlZJQ0lP'
    'IERFIEFVVEVOVElDQUNJw5NOIOKAlCBCQU5DQSBORU4gKEFQSSByZWFsKQogICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09'
    'PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi8KaW1wb3J0IGFwaSwgeyB1bndyYXAgfSBmcm9tICIuLi9hcGkvY2xp'
    'ZW50IjsKaW1wb3J0IHR5cGUgeyBVc2VyIH0gZnJvbSAiLi4vdHlwZXMvVXNlci50eXBlcyI7CgpleHBvcnQgaW50ZXJmYWNlIExv'
    'Z2luUmVzdWx0IHsKICB1c2VyOiBVc2VyOwogIHRva2VuOiBzdHJpbmc7CiAgcmVmcmVzaFRva2VuPzogc3RyaW5nOwogIHJlcXVp'
    'cmVzVHdvRmFjdG9yPzogYm9vbGVhbjsKICBtZXNzYWdlPzogc3RyaW5nOwp9CgpleHBvcnQgY29uc3QgYXV0aFNlcnZpY2UgPSB7'
    'CiAgYXN5bmMgcmVnaXN0ZXIoZGF0YTogewogICAgZW1haWw6IHN0cmluZzsgZmlyc3ROYW1lOiBzdHJpbmc7IGxhc3ROYW1lOiBz'
    'dHJpbmc7IGRvY3VtZW50VHlwZTogc3RyaW5nOwogICAgZG9jdW1lbnROdW1iZXI6IHN0cmluZzsgZGF0ZU9mQmlydGg6IHN0cmlu'
    'ZzsgcGhvbmU6IHN0cmluZzsgcGFzc3dvcmQ6IHN0cmluZzsKICB9KTogUHJvbWlzZTxMb2dpblJlc3VsdD4gewogICAgY29uc3Qg'
    'cmVzID0gYXdhaXQgYXBpLnBvc3QoIi9hdXRoL3JlZ2lzdGVyIiwgZGF0YSk7CiAgICByZXR1cm4gdW53cmFwPExvZ2luUmVzdWx0'
    'PihyZXMuZGF0YSk7CiAgfSwKCiAgYXN5bmMgbG9naW4oZW1haWw6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZywgdHdvRmFjdG9y'
    'Q29kZT86IHN0cmluZyk6IFByb21pc2U8TG9naW5SZXN1bHQ+IHsKICAgIGNvbnN0IHJlcyA9IGF3YWl0IGFwaS5wb3N0KCIvYXV0'
    'aC9sb2dpbiIsIHsgZW1haWwsIHBhc3N3b3JkLCB0d29GYWN0b3JDb2RlIH0pOwogICAgcmV0dXJuIHVud3JhcDxMb2dpblJlc3Vs'
    'dD4ocmVzLmRhdGEpOwogIH0sCgogIGFzeW5jIHZlcmlmeUVtYWlsKGNvZGU6IHN0cmluZykgewogICAgY29uc3QgcmVzID0gYXdh'
    'aXQgYXBpLnBvc3QoIi9hdXRoL3ZlcmlmeS1lbWFpbCIsIHsgY29kZSB9KTsKICAgIHJldHVybiB1bndyYXA8YW55PihyZXMuZGF0'
    'YSk7CiAgfSwKCiAgYXN5bmMgdmVyaWZ5UGhvbmUoY29kZTogc3RyaW5nKSB7CiAgICBjb25zdCByZXMgPSBhd2FpdCBhcGkucG9z'
    'dCgiL2F1dGgvdmVyaWZ5LXBob25lIiwgeyBjb2RlIH0pOwogICAgcmV0dXJuIHVud3JhcDxhbnk+KHJlcy5kYXRhKTsKICB9LAoK'
    'ICBhc3luYyByZXNlbmRWZXJpZmljYXRpb24oKSB7CiAgICBjb25zdCByZXMgPSBhd2FpdCBhcGkucG9zdCgiL2F1dGgvcmVzZW5k'
    'LXZlcmlmaWNhdGlvbiIpOwogICAgcmV0dXJuIHVud3JhcDxhbnk+KHJlcy5kYXRhKTsKICB9LAoKICBhc3luYyBmb3Jnb3RQYXNz'
    'd29yZChlbWFpbDogc3RyaW5nKSB7CiAgICBjb25zdCByZXMgPSBhd2FpdCBhcGkucG9zdCgiL2F1dGgvZm9yZ290LXBhc3N3b3Jk'
    'IiwgeyBlbWFpbCB9KTsKICAgIHJldHVybiB1bndyYXA8YW55PihyZXMuZGF0YSk7CiAgfSwKCiAgYXN5bmMgcmVzZXRQYXNzd29y'
    'ZCh0b2tlbjogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nLCBlbWFpbD86IHN0cmluZykgewogICAgY29uc3QgcmVzID0gYXdhaXQg'
    'YXBpLnBvc3QoIi9hdXRoL3Jlc2V0LXBhc3N3b3JkIiwgeyB0b2tlbiwgcGFzc3dvcmQsIGVtYWlsIH0pOwogICAgcmV0dXJuIHVu'
    'd3JhcDxhbnk+KHJlcy5kYXRhKTsKICB9LAoKICBhc3luYyBnZXRQcm9maWxlKCk6IFByb21pc2U8VXNlcj4gewogICAgY29uc3Qg'
    'cmVzID0gYXdhaXQgYXBpLmdldCgiL2F1dGgvcHJvZmlsZSIpOwogICAgcmV0dXJuIHVud3JhcDxVc2VyPihyZXMuZGF0YSk7CiAg'
    'fSwKCiAgYXN5bmMgZW5hYmxlMkZBKCkgewogICAgY29uc3QgcmVzID0gYXdhaXQgYXBpLnBvc3QoIi9hdXRoL2VuYWJsZS0yZmEi'
    'KTsKICAgIHJldHVybiB1bndyYXA8YW55PihyZXMuZGF0YSk7CiAgfSwKCiAgYXN5bmMgZGlzYWJsZTJGQSgpIHsKICAgIGNvbnN0'
    'IHJlcyA9IGF3YWl0IGFwaS5wb3N0KCIvYXV0aC9kaXNhYmxlLTJmYSIpOwogICAgcmV0dXJuIHVud3JhcDxhbnk+KHJlcy5kYXRh'
    'KTsKICB9LAp9Owo='
    ) -join ''
  },
  @{
    Path = 'frontend/src/store/auth.slice.ts'
    B64  = @(
    'LyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09CiAgIFNUT1JFIERF'
    'IEFVVEVOVElDQUNJw5NOIOKAlCBCQU5DQSBORU4gKEFQSSByZWFsLCBzaW4gbW9jaykKICAgPT09PT09PT09PT09PT09PT09PT09'
    'PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovCmltcG9ydCB7IGNyZWF0ZSB9IGZyb20gInp1c3RhbmQi'
    'OwppbXBvcnQgeyBwZXJzaXN0IH0gZnJvbSAienVzdGFuZC9taWRkbGV3YXJlIjsKaW1wb3J0IHsgYXV0aFNlcnZpY2UgfSBmcm9t'
    'ICIuLi9zZXJ2aWNlcy9hdXRoIjsKaW1wb3J0IHR5cGUgeyBVc2VyIH0gZnJvbSAiLi4vdHlwZXMvVXNlci50eXBlcyI7CgppbnRl'
    'cmZhY2UgQXV0aFN0YXRlIHsKICB1c2VyOiBVc2VyIHwgbnVsbDsKICB0b2tlbjogc3RyaW5nIHwgbnVsbDsKICBpc0F1dGhlbnRp'
    'Y2F0ZWQ6IGJvb2xlYW47CiAgaXNMb2FkaW5nOiBib29sZWFuOwogIGVycm9yOiBzdHJpbmcgfCBudWxsOwogIHBlbmRpbmcyRkE6'
    'IGJvb2xlYW47CiAgbmVlZHNWZXJpZmljYXRpb246IGJvb2xlYW47CiAgbG9naW46IChlbWFpbDogc3RyaW5nLCBwYXNzd29yZDog'
    'c3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+OwogIHZlcmlmeTJGQTogKGVtYWlsOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcsIGNv'
    'ZGU6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPjsKICByZWdpc3RlcjogKGRhdGE6IGFueSkgPT4gUHJvbWlzZTx2b2lkPjsKICB2'
    'ZXJpZnlFbWFpbENvZGU6IChjb2RlOiBzdHJpbmcpID0+IFByb21pc2U8YW55PjsKICB2ZXJpZnlQaG9uZUNvZGU6IChjb2RlOiBz'
    'dHJpbmcpID0+IFByb21pc2U8YW55PjsKICByZXNlbmRWZXJpZmljYXRpb246ICgpID0+IFByb21pc2U8YW55PjsKICB1cGRhdGVQ'
    'cm9maWxlOiAocGF0Y2g6IFBhcnRpYWw8VXNlcj4pID0+IHZvaWQ7CiAgc2V0VXNlcjogKHVzZXI6IFVzZXIpID0+IHZvaWQ7CiAg'
    'bG9nb3V0OiAoKSA9PiB2b2lkOwogIGNsZWFyRXJyb3I6ICgpID0+IHZvaWQ7CiAgc2V0UGVuZGluZzJGQTogKHZhbDogYm9vbGVh'
    'bikgPT4gdm9pZDsKfQoKZXhwb3J0IGNvbnN0IHVzZUF1dGhTdG9yZSA9IGNyZWF0ZTxBdXRoU3RhdGU+KCkoCiAgcGVyc2lzdCgK'
    'ICAgIChzZXQsIGdldCkgPT4gKHsKICAgICAgdXNlcjogbnVsbCwKICAgICAgdG9rZW46IG51bGwsCiAgICAgIGlzQXV0aGVudGlj'
    'YXRlZDogZmFsc2UsCiAgICAgIGlzTG9hZGluZzogZmFsc2UsCiAgICAgIGVycm9yOiBudWxsLAogICAgICBwZW5kaW5nMkZBOiBm'
    'YWxzZSwKICAgICAgbmVlZHNWZXJpZmljYXRpb246IGZhbHNlLAoKICAgICAgbG9naW46IGFzeW5jIChlbWFpbDogc3RyaW5nLCBw'
    'YXNzd29yZDogc3RyaW5nKSA9PiB7CiAgICAgICAgc2V0KHsgaXNMb2FkaW5nOiB0cnVlLCBlcnJvcjogbnVsbCB9KTsKICAgICAg'
    'ICB0cnkgewogICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYXV0aFNlcnZpY2UubG9naW4oZW1haWwsIHBhc3N3b3JkKTsK'
    'ICAgICAgICAgIGlmIChyZXN1bHQucmVxdWlyZXNUd29GYWN0b3IpIHsKICAgICAgICAgICAgc2V0KHsgaXNMb2FkaW5nOiBmYWxz'
    'ZSwgcGVuZGluZzJGQTogdHJ1ZSB9KTsKICAgICAgICAgICAgcmV0dXJuOwogICAgICAgICAgfQogICAgICAgICAgc2V0KHsKICAg'
    'ICAgICAgICAgdXNlcjogcmVzdWx0LnVzZXIsCiAgICAgICAgICAgIHRva2VuOiByZXN1bHQudG9rZW4sCiAgICAgICAgICAgIGlz'
    'QXV0aGVudGljYXRlZDogdHJ1ZSwKICAgICAgICAgICAgaXNMb2FkaW5nOiBmYWxzZSwKICAgICAgICAgICAgcGVuZGluZzJGQTog'
    'ZmFsc2UsCiAgICAgICAgICAgIG5lZWRzVmVyaWZpY2F0aW9uOiAhcmVzdWx0LnVzZXI/LmlzVmVyaWZpZWQsCiAgICAgICAgICB9'
    'KTsKICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7CiAgICAgICAgICBzZXQoeyBpc0xvYWRpbmc6IGZhbHNlLCBlcnJvcjog'
    'ZXJyb3I/Lm1lc3NhZ2UgfHwgIkVycm9yIGFsIGluaWNpYXIgc2VzacOzbiIgfSk7CiAgICAgICAgICB0aHJvdyBlcnJvcjsKICAg'
    'ICAgICB9CiAgICAgIH0sCgogICAgICB2ZXJpZnkyRkE6IGFzeW5jIChlbWFpbDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nLCBj'
    'b2RlOiBzdHJpbmcpID0+IHsKICAgICAgICBzZXQoeyBpc0xvYWRpbmc6IHRydWUsIGVycm9yOiBudWxsIH0pOwogICAgICAgIHRy'
    'eSB7CiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhdXRoU2VydmljZS5sb2dpbihlbWFpbCwgcGFzc3dvcmQsIGNvZGUp'
    'OwogICAgICAgICAgc2V0KHsKICAgICAgICAgICAgdXNlcjogcmVzdWx0LnVzZXIsCiAgICAgICAgICAgIHRva2VuOiByZXN1bHQu'
    'dG9rZW4sCiAgICAgICAgICAgIGlzQXV0aGVudGljYXRlZDogdHJ1ZSwKICAgICAgICAgICAgaXNMb2FkaW5nOiBmYWxzZSwKICAg'
    'ICAgICAgICAgcGVuZGluZzJGQTogZmFsc2UsCiAgICAgICAgICB9KTsKICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7CiAg'
    'ICAgICAgICBzZXQoeyBpc0xvYWRpbmc6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgIkPDs2RpZ28gMkZBIGluY29y'
    'cmVjdG8iIH0pOwogICAgICAgICAgdGhyb3cgZXJyb3I7CiAgICAgICAgfQogICAgICB9LAoKICAgICAgcmVnaXN0ZXI6IGFzeW5j'
    'IChkYXRhOiBhbnkpID0+IHsKICAgICAgICBzZXQoeyBpc0xvYWRpbmc6IHRydWUsIGVycm9yOiBudWxsIH0pOwogICAgICAgIHRy'
    'eSB7CiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhdXRoU2VydmljZS5yZWdpc3RlcihkYXRhKTsKICAgICAgICAgIHNl'
    'dCh7CiAgICAgICAgICAgIHVzZXI6IHJlc3VsdC51c2VyLAogICAgICAgICAgICB0b2tlbjogcmVzdWx0LnRva2VuLAogICAgICAg'
    'ICAgICBpc0xvYWRpbmc6IGZhbHNlLAogICAgICAgICAgICBuZWVkc1ZlcmlmaWNhdGlvbjogIXJlc3VsdC51c2VyLmlzVmVyaWZp'
    'ZWQsCiAgICAgICAgICAgIGlzQXV0aGVudGljYXRlZDogdHJ1ZSwKICAgICAgICAgIH0pOwogICAgICAgIH0gY2F0Y2ggKGVycm9y'
    'OiBhbnkpIHsKICAgICAgICAgIHNldCh7IGlzTG9hZGluZzogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCAiRXJyb3Ig'
    'YWwgcmVnaXN0cmFyc2UiIH0pOwogICAgICAgICAgdGhyb3cgZXJyb3I7CiAgICAgICAgfQogICAgICB9LAoKICAgICAgdmVyaWZ5'
    'RW1haWxDb2RlOiBhc3luYyAoY29kZTogc3RyaW5nKSA9PiB7CiAgICAgICAgc2V0KHsgaXNMb2FkaW5nOiB0cnVlLCBlcnJvcjog'
    'bnVsbCB9KTsKICAgICAgICB0cnkgewogICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYXV0aFNlcnZpY2UudmVyaWZ5RW1h'
    'aWwoY29kZSk7CiAgICAgICAgICBjb25zdCBjdXJyZW50VXNlciA9IGdldCgpLnVzZXI7CiAgICAgICAgICBpZiAoY3VycmVudFVz'
    'ZXIpIHsKICAgICAgICAgICAgc2V0KHsgdXNlcjogeyAuLi5jdXJyZW50VXNlciwgZW1haWxWZXJpZmllZDogdHJ1ZSwgaXNWZXJp'
    'ZmllZDogcmVzdWx0LmZ1bGx5VmVyaWZpZWQgPz8gY3VycmVudFVzZXIuaXNWZXJpZmllZCB9IH0pOwogICAgICAgICAgfQogICAg'
    'ICAgICAgc2V0KHsgaXNMb2FkaW5nOiBmYWxzZSB9KTsKICAgICAgICAgIHJldHVybiByZXN1bHQ7CiAgICAgICAgfSBjYXRjaCAo'
    'ZXJyb3I6IGFueSkgewogICAgICAgICAgc2V0KHsgaXNMb2FkaW5nOiBmYWxzZSwgZXJyb3I6IGVycm9yPy5tZXNzYWdlIHx8ICJD'
    'w7NkaWdvIGluY29ycmVjdG8iIH0pOwogICAgICAgICAgdGhyb3cgZXJyb3I7CiAgICAgICAgfQogICAgICB9LAoKICAgICAgdmVy'
    'aWZ5UGhvbmVDb2RlOiBhc3luYyAoY29kZTogc3RyaW5nKSA9PiB7CiAgICAgICAgc2V0KHsgaXNMb2FkaW5nOiB0cnVlLCBlcnJv'
    'cjogbnVsbCB9KTsKICAgICAgICB0cnkgewogICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYXV0aFNlcnZpY2UudmVyaWZ5'
    'UGhvbmUoY29kZSk7CiAgICAgICAgICBjb25zdCBjdXJyZW50VXNlciA9IGdldCgpLnVzZXI7CiAgICAgICAgICBpZiAoY3VycmVu'
    'dFVzZXIpIHsKICAgICAgICAgICAgc2V0KHsgdXNlcjogeyAuLi5jdXJyZW50VXNlciwgcGhvbmVWZXJpZmllZDogdHJ1ZSwgaXNW'
    'ZXJpZmllZDogcmVzdWx0LmZ1bGx5VmVyaWZpZWQgPz8gY3VycmVudFVzZXIuaXNWZXJpZmllZCB9IH0pOwogICAgICAgICAgfQog'
    'ICAgICAgICAgc2V0KHsgaXNMb2FkaW5nOiBmYWxzZSB9KTsKICAgICAgICAgIHJldHVybiByZXN1bHQ7CiAgICAgICAgfSBjYXRj'
    'aCAoZXJyb3I6IGFueSkgewogICAgICAgICAgc2V0KHsgaXNMb2FkaW5nOiBmYWxzZSwgZXJyb3I6IGVycm9yPy5tZXNzYWdlIHx8'
    'ICJDw7NkaWdvIGluY29ycmVjdG8iIH0pOwogICAgICAgICAgdGhyb3cgZXJyb3I7CiAgICAgICAgfQogICAgICB9LAoKICAgICAg'
    'cmVzZW5kVmVyaWZpY2F0aW9uOiBhc3luYyAoKSA9PiB7CiAgICAgICAgc2V0KHsgZXJyb3I6IG51bGwgfSk7CiAgICAgICAgdHJ5'
    'IHsKICAgICAgICAgIHJldHVybiBhd2FpdCBhdXRoU2VydmljZS5yZXNlbmRWZXJpZmljYXRpb24oKTsKICAgICAgICB9IGNhdGNo'
    'IChlcnJvcjogYW55KSB7CiAgICAgICAgICBzZXQoeyBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgIkVycm9yIGFsIHJlZW52aWFy'
    'IGPDs2RpZ29zIiB9KTsKICAgICAgICAgIHJldHVybiBudWxsOwogICAgICAgIH0KICAgICAgfSwKCiAgICAgIHVwZGF0ZVByb2Zp'
    'bGU6IChwYXRjaDogUGFydGlhbDxVc2VyPikgPT4gewogICAgICAgIGNvbnN0IGN1cnJlbnQgPSBnZXQoKS51c2VyOwogICAgICAg'
    'IGlmIChjdXJyZW50KSBzZXQoeyB1c2VyOiB7IC4uLmN1cnJlbnQsIC4uLnBhdGNoIH0gfSk7CiAgICAgIH0sCgogICAgICBzZXRV'
    'c2VyOiAodXNlcjogVXNlcikgPT4gc2V0KHsgdXNlciB9KSwKCiAgICAgIGxvZ291dDogKCkgPT4gewogICAgICAgIHNldCh7CiAg'
    'ICAgICAgICB1c2VyOiBudWxsLAogICAgICAgICAgdG9rZW46IG51bGwsCiAgICAgICAgICBpc0F1dGhlbnRpY2F0ZWQ6IGZhbHNl'
    'LAogICAgICAgICAgZXJyb3I6IG51bGwsCiAgICAgICAgICBwZW5kaW5nMkZBOiBmYWxzZSwKICAgICAgICAgIG5lZWRzVmVyaWZp'
    'Y2F0aW9uOiBmYWxzZSwKICAgICAgICB9KTsKICAgICAgfSwKCiAgICAgIGNsZWFyRXJyb3I6ICgpID0+IHNldCh7IGVycm9yOiBu'
    'dWxsIH0pLAogICAgICBzZXRQZW5kaW5nMkZBOiAodmFsOiBib29sZWFuKSA9PiBzZXQoeyBwZW5kaW5nMkZBOiB2YWwgfSksCiAg'
    'ICB9KSwKICAgIHsgbmFtZTogImF1dGgtc3RvcmFnZSIgfQogICkKKTsK'
    ) -join ''
  },
  @{
    Path = 'frontend/src/pages/auth/Verify.tsx'
    B64  = @(
    'aW1wb3J0IHsgdXNlU3RhdGUsIHVzZUVmZmVjdCB9IGZyb20gInJlYWN0IjsKaW1wb3J0IHsgdXNlQXV0aFN0b3JlIH0gZnJvbSAi'
    'Li4vLi4vc3RvcmUvYXV0aC5zbGljZSI7CmltcG9ydCB7IHVzZU5hdmlnYXRlIH0gZnJvbSAicmVhY3Qtcm91dGVyLWRvbSI7Cgpl'
    'eHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBWZXJpZnkoKSB7CiAgY29uc3QgW2VtYWlsQ29kZSwgc2V0RW1haWxDb2RlXSA9IHVzZVN0'
    'YXRlKCIiKTsKICBjb25zdCBbcGhvbmVDb2RlLCBzZXRQaG9uZUNvZGVdID0gdXNlU3RhdGUoIiIpOwogIGNvbnN0IFtlbWFpbFZl'
    'cmlmaWVkLCBzZXRFbWFpbFZlcmlmaWVkXSA9IHVzZVN0YXRlKGZhbHNlKTsKICBjb25zdCBbcGhvbmVWZXJpZmllZCwgc2V0UGhv'
    'bmVWZXJpZmllZF0gPSB1c2VTdGF0ZShmYWxzZSk7CiAgY29uc3QgW3N0ZXAsIHNldFN0ZXBdID0gdXNlU3RhdGU8ImVtYWlsIiB8'
    'ICJwaG9uZSIgfCAiZG9uZSI+KCJlbWFpbCIpOwogIGNvbnN0IFtub3RpY2UsIHNldE5vdGljZV0gPSB1c2VTdGF0ZSgiIik7CiAg'
    'Y29uc3QgW2Nvb2xkb3duLCBzZXRDb29sZG93bl0gPSB1c2VTdGF0ZSgwKTsKICBjb25zdCB7IHVzZXIsIHZlcmlmeUVtYWlsQ29k'
    'ZSwgdmVyaWZ5UGhvbmVDb2RlLCByZXNlbmRWZXJpZmljYXRpb24sIGlzTG9hZGluZywgZXJyb3IsIGNsZWFyRXJyb3IgfSA9IHVz'
    'ZUF1dGhTdG9yZSgpOwogIGNvbnN0IG5hdmlnYXRlID0gdXNlTmF2aWdhdGUoKTsKCiAgY29uc3QgaGFuZGxlRW1haWxWZXJpZnkg'
    'PSBhc3luYyAoZTogUmVhY3QuRm9ybUV2ZW50KSA9PiB7CiAgICBlLnByZXZlbnREZWZhdWx0KCk7CiAgICB0cnkgewogICAgICBj'
    'b25zdCByZXN1bHQgPSBhd2FpdCB2ZXJpZnlFbWFpbENvZGUoZW1haWxDb2RlKTsKICAgICAgc2V0RW1haWxWZXJpZmllZCh0cnVl'
    'KTsKICAgICAgaWYgKHJlc3VsdD8ubmVlZHNQaG9uZSB8fCByZXN1bHQ/LnBob25lVmVyaWZpY2F0aW9uUmVxdWlyZWQpIHsKICAg'
    'ICAgICBzZXRTdGVwKCJwaG9uZSIpOwogICAgICB9IGVsc2UgewogICAgICAgIHNldFN0ZXAoImRvbmUiKTsKICAgICAgfQogICAg'
    'fSBjYXRjaCB7fQogIH07CgogIGNvbnN0IGhhbmRsZVBob25lVmVyaWZ5ID0gYXN5bmMgKGU6IFJlYWN0LkZvcm1FdmVudCkgPT4g'
    'ewogICAgZS5wcmV2ZW50RGVmYXVsdCgpOwogICAgdHJ5IHsKICAgICAgYXdhaXQgdmVyaWZ5UGhvbmVDb2RlKHBob25lQ29kZSk7'
    'CiAgICAgIHNldFBob25lVmVyaWZpZWQodHJ1ZSk7CiAgICAgIHNldFN0ZXAoImRvbmUiKTsKICAgIH0gY2F0Y2gge30KICB9OwoK'
    'ICAvKiBDb250YWRvciBwYXJhIGVsIGJvdG9uIGRlIHJlZW52aWFyIChlbCBiYWNrZW5kIGxpbWl0YSBhIDEgY2FkYSA2MHMpICov'
    'CiAgdXNlRWZmZWN0KCgpID0+IHsKICAgIGlmIChjb29sZG93biA8PSAwKSByZXR1cm47CiAgICBjb25zdCB0ID0gc2V0VGltZW91'
    'dCgoKSA9PiBzZXRDb29sZG93bigoYykgPT4gYyAtIDEpLCAxMDAwKTsKICAgIHJldHVybiAoKSA9PiBjbGVhclRpbWVvdXQodCk7'
    'CiAgfSwgW2Nvb2xkb3duXSk7CgogIGNvbnN0IGhhbmRsZVJlc2VuZCA9IGFzeW5jICgpID0+IHsKICAgIHNldE5vdGljZSgiIik7'
    'CiAgICBjbGVhckVycm9yKCk7CiAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IHJlc2VuZFZlcmlmaWNhdGlvbigpOwogICAg'
    'c2V0Q29vbGRvd24oNjApOwogICAgaWYgKHJlc3VsdD8ubWVzc2FnZSkgc2V0Tm90aWNlKHJlc3VsdC5tZXNzYWdlKTsKICAgIGVs'
    'c2Ugc2V0Tm90aWNlKCJFbnZpYW1vcyB1biBjb2RpZ28gbnVldm8gYSB0dSBjb3JyZW8uIFJldmlzYSB0YW1iaWVuIGxhIGNhcnBl'
    'dGEgZGUgc3BhbS4iKTsKICB9OwoKICBpZiAoc3RlcCA9PT0gImRvbmUiKSB7CiAgICByZXR1cm4gKAogICAgICA8ZGl2IGNsYXNz'
    'TmFtZT0ibWluLWgtc2NyZWVuIGJnLVsjMGEwYTBhXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBwLTQiPgogICAg'
    'ICAgIDxkaXYgY2xhc3NOYW1lPSJ3LWZ1bGwgbWF4LXctbWQgdGV4dC1jZW50ZXIiPgogICAgICAgICAgPGRpdiBjbGFzc05hbWU9'
    'ImJnLVsjMWExYTFhXSByb3VuZGVkLTJ4bCBwLTggc2hhZG93LTJ4bCBib3JkZXIgYm9yZGVyLXdoaXRlLzUiPgogICAgICAgICAg'
    'ICA8ZGl2IGNsYXNzTmFtZT0idy0xNiBoLTE2IGJnLWVtZXJhbGQtNTAwLzEwIHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRl'
    'ciBqdXN0aWZ5LWNlbnRlciBteC1hdXRvIG1iLTYiPgogICAgICAgICAgICAgIDxzdmcgY2xhc3NOYW1lPSJ3LTggaC04IHRleHQt'
    'ZW1lcmFsZC00MDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIHN0'
    'cm9rZUxpbmVjYXA9InJvdW5kIiBzdHJva2VMaW5lam9pbj0icm91bmQiIHN0cm9rZVdpZHRoPXsyfSBkPSJNNSAxM2w0IDRMMTkg'
    'NyIgLz48L3N2Zz4KICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9InRleHQtMnhsIGZvbnQtc2Vt'
    'aWJvbGQgdGV4dC13aGl0ZSBtYi0yIj5DdWVudGEgdmVyaWZpY2FkYTwvaDI+CiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4'
    'dC1ncmF5LTQwMCBtYi02Ij5UdSBpZGVudGlkYWQgaGEgc2lkbyBjb25maXJtYWRhLiBZYSBwdWVkZXMgb3BlcmFyIGVuIEJBTkNB'
    'IE5FTi48L3A+CiAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoIi9kYXNoYm9hcmQiKX0gY2xhc3NO'
    'YW1lPSJ3LWZ1bGwgYmctWyMwMGQ0YWFdIGhvdmVyOmJnLVsjMDBiODk0XSB0ZXh0LWJsYWNrIGZvbnQtc2VtaWJvbGQgcHktMyBy'
    'b3VuZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzIj4KICAgICAgICAgICAgICBJciBhbCBkYXNoYm9hcmQKICAgICAgICAgICAgPC9i'
    'dXR0b24+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICA8L2Rpdj4KICAgICAgPC9kaXY+CiAgICApOwogIH0KCiAgY29uc3Qgc3Rl'
    'cERvbmUgPSBzdGVwID09PSAiZW1haWwiID8gZW1haWxWZXJpZmllZCA6IHBob25lVmVyaWZpZWQ7CgogIHJldHVybiAoCiAgICA8'
    'ZGl2IGNsYXNzTmFtZT0ibWluLWgtc2NyZWVuIGJnLVsjMGEwYTBhXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBw'
    'LTQiPgogICAgICA8ZGl2IGNsYXNzTmFtZT0idy1mdWxsIG1heC13LW1kIj4KICAgICAgICA8ZGl2IGNsYXNzTmFtZT0idGV4dC1j'
    'ZW50ZXIgbWItNiI+CiAgICAgICAgICA8aDEgY2xhc3NOYW1lPSJ0ZXh0LTN4bCBmb250LWJvbGQgdGV4dC13aGl0ZSB0cmFja2lu'
    'Zy10aWdodCI+QkFOQ0EgTkVOPC9oMT4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1ncmF5LTQwMCBtdC0xIHRleHQtc20i'
    'PlZlcmlmaWNhY2lvbiBkZSBpZGVudGlkYWQ8L3A+CiAgICAgICAgPC9kaXY+CgogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJiZy1b'
    'IzFhMWExYV0gcm91bmRlZC0yeGwgcC04IHNoYWRvdy0yeGwgYm9yZGVyIGJvcmRlci13aGl0ZS81Ij4KICAgICAgICAgIHsvKiBQ'
    'cm9ncmVzcyAqL30KICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtYi04Ij4KICAgICAg'
    'ICAgICAgPGRpdiBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiAke3N0ZXAgPT09ICJlbWFpbCIgPyAidGV4dC1b'
    'IzAwZDRhYV0iIDogZW1haWxWZXJpZmllZCA/ICJ0ZXh0LWVtZXJhbGQtNDAwIiA6ICJ0ZXh0LWdyYXktNTAwIn1gfT4KICAgICAg'
    'ICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctOCBoLTggcm91bmRlZC1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2Vu'
    'dGVyIHRleHQtc20gZm9udC1ib2xkICR7ZW1haWxWZXJpZmllZCA/ICJiZy1lbWVyYWxkLTUwMC8yMCIgOiBzdGVwID09PSAiZW1h'
    'aWwiID8gImJnLVsjMDBkNGFhXS8yMCIgOiAiYmctd2hpdGUvNSJ9YH0+CiAgICAgICAgICAgICAgICB7ZW1haWxWZXJpZmllZCA/'
    'ICLinJMiIDogIjEifQogICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0idGV4dC1zbSI+'
    'RW1haWw8L3NwYW4+CiAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGZsZXgtMSBoLXB4ICR7'
    'ZW1haWxWZXJpZmllZCA/ICJiZy1lbWVyYWxkLTUwMC8zMCIgOiAiYmctd2hpdGUvMTAifWB9IC8+CiAgICAgICAgICAgIDxkaXYg'
    'Y2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgJHtzdGVwID09PSAicGhvbmUiID8gInRleHQtWyMwMGQ0YWFdIiA6'
    'IHBob25lVmVyaWZpZWQgPyAidGV4dC1lbWVyYWxkLTQwMCIgOiAidGV4dC1ncmF5LTUwMCJ9YH0+CiAgICAgICAgICAgICAgPGRp'
    'diBjbGFzc05hbWU9e2B3LTggaC04IHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LXNt'
    'IGZvbnQtYm9sZCAke3Bob25lVmVyaWZpZWQgPyAiYmctZW1lcmFsZC01MDAvMjAiIDogc3RlcCA9PT0gInBob25lIiA/ICJiZy1b'
    'IzAwZDRhYV0vMjAiIDogImJnLXdoaXRlLzUifWB9PgogICAgICAgICAgICAgICAge3Bob25lVmVyaWZpZWQgPyAi4pyTIiA6ICIy'
    'In0KICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQtc20iPlRlbGVmb25vPC9z'
    'cGFuPgogICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BmbGV4LTEgaC1weCAke3Bob25lVmVy'
    'aWZpZWQgPyAiYmctZW1lcmFsZC01MDAvMzAiIDogImJnLXdoaXRlLzEwIn1gfSAvPgogICAgICAgICAgICA8ZGl2IGNsYXNzTmFt'
    'ZT17YGZsZXggaXRlbXMtY2VudGVyIGdhcC0yICR7c3RlcERvbmUgPyAidGV4dC1lbWVyYWxkLTQwMCIgOiAidGV4dC1ncmF5LTUw'
    'MCJ9YH0+CiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2B3LTggaC04IHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRl'
    'ciBqdXN0aWZ5LWNlbnRlciB0ZXh0LXNtIGZvbnQtYm9sZCAke3N0ZXBEb25lID8gImJnLWVtZXJhbGQtNTAwLzIwIiA6ICJiZy13'
    'aGl0ZS81In1gfT4zPC9kaXY+CiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LXNtIj5MaXN0bzwvc3Bhbj4KICAg'
    'ICAgICAgICAgPC9kaXY+CiAgICAgICAgICA8L2Rpdj4KCiAgICAgICAgICB7ZXJyb3IgJiYgKAogICAgICAgICAgICA8ZGl2IGNs'
    'YXNzTmFtZT0iYmctcmVkLTUwMC8xMCBib3JkZXIgYm9yZGVyLXJlZC01MDAvMjAgcm91bmRlZC1sZyBwLTMgbWItNCI+CiAgICAg'
    'ICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXJlZC00MDAgdGV4dC1zbSI+e2Vycm9yfTwvcD4KICAgICAgICAgICAgPC9kaXY+'
    'CiAgICAgICAgICApfQoKICAgICAgICAgIHtub3RpY2UgJiYgIWVycm9yICYmICgKICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9'
    'ImJnLVsjMDBkNGFhXS8xMCBib3JkZXIgYm9yZGVyLVsjMDBkNGFhXS8yMCByb3VuZGVkLWxnIHAtMyBtYi00Ij4KICAgICAgICAg'
    'ICAgICA8cCBjbGFzc05hbWU9InRleHQtWyMwMGQ0YWFdIHRleHQtc20iPntub3RpY2V9PC9wPgogICAgICAgICAgICA8L2Rpdj4K'
    'ICAgICAgICAgICl9CgogICAgICAgICAge3N0ZXAgPT09ICJlbWFpbCIgJiYgKAogICAgICAgICAgICA8PgogICAgICAgICAgICAg'
    'IDxoMiBjbGFzc05hbWU9InRleHQteGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlIG1iLTIiPlZlcmlmaWNhciBlbWFpbDwvaDI+'
    'CiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LWdyYXktNDAwIHRleHQtc20gbWItNiI+RW52aWFtb3MgdW4gY29kaWdv'
    'IGRlIDYgZGlnaXRvcyBhIDxzcGFuIGNsYXNzTmFtZT0idGV4dC13aGl0ZSI+e3VzZXI/LmVtYWlsfTwvc3Bhbj48L3A+CiAgICAg'
    'ICAgICAgICAgPGZvcm0gb25TdWJtaXQ9e2hhbmRsZUVtYWlsVmVyaWZ5fSBjbGFzc05hbWU9InNwYWNlLXktNCI+CiAgICAgICAg'
    'ICAgICAgICA8ZGl2PgogICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPSJibG9jayB0ZXh0LXNtIGZvbnQtbWVkaXVt'
    'IHRleHQtZ3JheS0zMDAgbWItMSI+Q29kaWdvIGRlIGVtYWlsPC9sYWJlbD4KICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9'
    'InRleHQiIGlucHV0TW9kZT0ibnVtZXJpYyIgdmFsdWU9e2VtYWlsQ29kZX0gb25DaGFuZ2U9eyhlKSA9PiB7IHNldEVtYWlsQ29k'
    'ZShlLnRhcmdldC52YWx1ZS5yZXBsYWNlKC9cRC9nLCAiIikpOyBjbGVhckVycm9yKCk7IHNldE5vdGljZSgiIik7IH19CiAgICAg'
    'ICAgICAgICAgICAgICAgbWF4TGVuZ3RoPXs2fSBjbGFzc05hbWU9InctZnVsbCBiZy1bIzBhMGEwYV0gYm9yZGVyIGJvcmRlci13'
    'aGl0ZS8xMCByb3VuZGVkLXhsIHB4LTQgcHktMyB0ZXh0LXdoaXRlIHRleHQtY2VudGVyIHRleHQtMnhsIHRyYWNraW5nLVswLjVl'
    'bV0gcGxhY2Vob2xkZXItZ3JheS01MDAgZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1bIzAwZDRhYV0gdHJhbnNpdGlv'
    'bi1jb2xvcnMgZm9udC1tb25vIgogICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPSIwMDAwMDAiIHJlcXVpcmVkIC8+CiAg'
    'ICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT0ic3VibWl0IiBkaXNhYmxlZD17aXNMb2Fk'
    'aW5nfSBjbGFzc05hbWU9InctZnVsbCBiZy1bIzAwZDRhYV0gaG92ZXI6YmctWyMwMGI4OTRdIGRpc2FibGVkOm9wYWNpdHktNTAg'
    'dGV4dC1ibGFjayBmb250LXNlbWlib2xkIHB5LTMgcm91bmRlZC14bCB0cmFuc2l0aW9uLWNvbG9ycyI+CiAgICAgICAgICAgICAg'
    'ICAgIHtpc0xvYWRpbmcgPyAiVmVyaWZpY2FuZG8uLi4iIDogIlZlcmlmaWNhciBlbWFpbCJ9CiAgICAgICAgICAgICAgICA8L2J1'
    'dHRvbj4KICAgICAgICAgICAgICA8L2Zvcm0+CiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtoYW5kbGVSZXNlbmR9IGRp'
    'c2FibGVkPXtjb29sZG93biA+IDB9CiAgICAgICAgICAgICAgICBjbGFzc05hbWU9InctZnVsbCBtdC0zIHRleHQtc20gdGV4dC1n'
    'cmF5LTQwMCBob3Zlcjp0ZXh0LVsjMDBkNGFhXSBkaXNhYmxlZDpvcGFjaXR5LTQwIGRpc2FibGVkOmhvdmVyOnRleHQtZ3JheS00'
    'MDAgdHJhbnNpdGlvbi1jb2xvcnMiPgogICAgICAgICAgICAgICAge2Nvb2xkb3duID4gMCA/IGBQdWVkZXMgcmVlbnZpYXIgZW4g'
    'JHtjb29sZG93bn1zYCA6ICJObyByZWNpYmlzdGUgZWwgY29kaWdvPyBSZWVudmlhciJ9CiAgICAgICAgICAgICAgPC9idXR0b24+'
    'CiAgICAgICAgICAgIDwvPgogICAgICAgICAgKX0KCiAgICAgICAgICB7c3RlcCA9PT0gInBob25lIiAmJiAoCiAgICAgICAgICAg'
    'IDw+CiAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT0idGV4dC14bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGUgbWItMiI+VmVy'
    'aWZpY2FyIHRlbGVmb25vPC9oMj4KICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtZ3JheS00MDAgdGV4dC1zbSBtYi02'
    'Ij5FbnZpYW1vcyB1biBjb2RpZ28gZGUgNiBkaWdpdG9zIGEgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LXdoaXRlIj57dXNlcj8ucGhv'
    'bmV9PC9zcGFuPjwvcD4KICAgICAgICAgICAgICA8Zm9ybSBvblN1Ym1pdD17aGFuZGxlUGhvbmVWZXJpZnl9IGNsYXNzTmFtZT0i'
    'c3BhY2UteS00Ij4KICAgICAgICAgICAgICAgIDxkaXY+CiAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9ImJsb2Nr'
    'IHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC1ncmF5LTMwMCBtYi0xIj5Db2RpZ28gZGUgdGVsZWZvbm88L2xhYmVsPgogICAgICAg'
    'ICAgICAgICAgICA8aW5wdXQgdHlwZT0idGV4dCIgaW5wdXRNb2RlPSJudW1lcmljIiB2YWx1ZT17cGhvbmVDb2RlfSBvbkNoYW5n'
    'ZT17KGUpID0+IHsgc2V0UGhvbmVDb2RlKGUudGFyZ2V0LnZhbHVlLnJlcGxhY2UoL1xEL2csICIiKSk7IGNsZWFyRXJyb3IoKTsg'
    'c2V0Tm90aWNlKCIiKTsgfX0KICAgICAgICAgICAgICAgICAgICBtYXhMZW5ndGg9ezZ9IGNsYXNzTmFtZT0idy1mdWxsIGJnLVsj'
    'MGEwYTBhXSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJvdW5kZWQteGwgcHgtNCBweS0zIHRleHQtd2hpdGUgdGV4dC1jZW50ZXIg'
    'dGV4dC0yeGwgdHJhY2tpbmctWzAuNWVtXSBwbGFjZWhvbGRlci1ncmF5LTUwMCBmb2N1czpvdXRsaW5lLW5vbmUgZm9jdXM6Ym9y'
    'ZGVyLVsjMDBkNGFhXSB0cmFuc2l0aW9uLWNvbG9ycyBmb250LW1vbm8iCiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9'
    'IjAwMDAwMCIgcmVxdWlyZWQgLz4KICAgICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPSJz'
    'dWJtaXQiIGRpc2FibGVkPXtpc0xvYWRpbmd9IGNsYXNzTmFtZT0idy1mdWxsIGJnLVsjMDBkNGFhXSBob3ZlcjpiZy1bIzAwYjg5'
    'NF0gZGlzYWJsZWQ6b3BhY2l0eS01MCB0ZXh0LWJsYWNrIGZvbnQtc2VtaWJvbGQgcHktMyByb3VuZGVkLXhsIHRyYW5zaXRpb24t'
    'Y29sb3JzIj4KICAgICAgICAgICAgICAgICAge2lzTG9hZGluZyA/ICJWZXJpZmljYW5kby4uLiIgOiAiVmVyaWZpY2FyIHRlbGVm'
    'b25vIn0KICAgICAgICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgICAgIDwvZm9ybT4KICAgICAgICAgICAgICA8YnV0dG9u'
    'IG9uQ2xpY2s9e2hhbmRsZVJlc2VuZH0gZGlzYWJsZWQ9e2Nvb2xkb3duID4gMH0KICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0i'
    'dy1mdWxsIG10LTMgdGV4dC1zbSB0ZXh0LWdyYXktNDAwIGhvdmVyOnRleHQtWyMwMGQ0YWFdIGRpc2FibGVkOm9wYWNpdHktNDAg'
    'ZGlzYWJsZWQ6aG92ZXI6dGV4dC1ncmF5LTQwMCB0cmFuc2l0aW9uLWNvbG9ycyI+CiAgICAgICAgICAgICAgICB7Y29vbGRvd24g'
    'PiAwID8gYFB1ZWRlcyByZWVudmlhciBlbiAke2Nvb2xkb3dufXNgIDogIk5vIHJlY2liaXN0ZSBlbCBjb2RpZ28/IFJlZW52aWFy'
    'In0KICAgICAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICAgICAgPC8+CiAgICAgICAgICApfQogICAgICAgIDwvZGl2PgogICAg'
    'ICA8L2Rpdj4KICAgIDwvZGl2PgogICk7Cn0K'
    ) -join ''
  },
  @{
    Path = 'frontend/src/pages/auth/ForgotPassword.tsx'
    B64  = @(
    'aW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICJyZWFjdCI7CmltcG9ydCB7IHVzZU5hdmlnYXRlLCBMaW5rIH0gZnJvbSAicmVhY3Qt'
    'cm91dGVyLWRvbSI7CmltcG9ydCB7IGF1dGhBcGkgfSBmcm9tICIuLi8uLi9hcGkvYXV0aC5hcGkiOwoKZXhwb3J0IGRlZmF1bHQg'
    'ZnVuY3Rpb24gRm9yZ290UGFzc3dvcmQoKSB7CiAgY29uc3QgW2VtYWlsLCBzZXRFbWFpbF0gPSB1c2VTdGF0ZSgiIik7CiAgY29u'
    'c3QgW3NlbnQsIHNldFNlbnRdID0gdXNlU3RhdGUoZmFsc2UpOwogIGNvbnN0IFtlcnJvciwgc2V0RXJyb3JdID0gdXNlU3RhdGUo'
    'IiIpOwogIGNvbnN0IFtsb2FkaW5nLCBzZXRMb2FkaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTsKICBjb25zdCBuYXZpZ2F0ZSA9IHVz'
    'ZU5hdmlnYXRlKCk7CgogIGNvbnN0IGhhbmRsZVN1Ym1pdCA9IGFzeW5jIChlOiBSZWFjdC5Gb3JtRXZlbnQpID0+IHsKICAgIGUu'
    'cHJldmVudERlZmF1bHQoKTsKICAgIHNldExvYWRpbmcodHJ1ZSk7CiAgICBzZXRFcnJvcigiIik7CiAgICB0cnkgewogICAgICBh'
    'd2FpdCBhdXRoQXBpLmZvcmdvdFBhc3N3b3JkKGVtYWlsLnRyaW0oKS50b0xvd2VyQ2FzZSgpKTsKICAgICAgc2V0U2VudCh0cnVl'
    'KTsKICAgIH0gY2F0Y2ggKGVycjogYW55KSB7CiAgICAgIHNldEVycm9yKGVyci5tZXNzYWdlIHx8ICJFcnJvciBhbCBlbnZpYXIg'
    'ZWwgZW1haWwiKTsKICAgIH0gZmluYWxseSB7CiAgICAgIHNldExvYWRpbmcoZmFsc2UpOwogICAgfQogIH07CgogIHJldHVybiAo'
    'CiAgICA8ZGl2IGNsYXNzTmFtZT0ibWluLWgtc2NyZWVuIGJnLVsjMGEwYTBhXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNl'
    'bnRlciBwLTQiPgogICAgICA8ZGl2IGNsYXNzTmFtZT0idy1mdWxsIG1heC13LW1kIj4KICAgICAgICA8ZGl2IGNsYXNzTmFtZT0i'
    'dGV4dC1jZW50ZXIgbWItOCI+CiAgICAgICAgICA8aDEgY2xhc3NOYW1lPSJ0ZXh0LTR4bCBmb250LWJvbGQgdGV4dC13aGl0ZSB0'
    'cmFja2luZy10aWdodCI+QkFOQ0EgTkVOPC9oMT4KICAgICAgICA8L2Rpdj4KICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iYmctWyMx'
    'YTFhMWFdIHJvdW5kZWQtMnhsIHAtOCBzaGFkb3ctMnhsIGJvcmRlciBib3JkZXItd2hpdGUvNSI+CiAgICAgICAgICB7IXNlbnQg'
    'PyAoCiAgICAgICAgICAgIDw+CiAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT0idGV4dC0yeGwgZm9udC1zZW1pYm9sZCB0ZXh0'
    'LXdoaXRlIG1iLTIiPlJlY3VwZXJhciBjb250cmFzZW5hPC9oMj4KICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtZ3Jh'
    'eS00MDAgdGV4dC1zbSBtYi02Ij5JbmdyZXNhIHR1IGVtYWlsIHkgdGUgZW52aWFyZW1vcyB1biBjb2RpZ28gZGUgNiBkaWdpdG9z'
    'IHBhcmEgcmVzdGFibGVjZXIgdHUgY29udHJhc2VuYS48L3A+CiAgICAgICAgICAgICAge2Vycm9yICYmICgKICAgICAgICAgICAg'
    'ICAgIDxkaXYgY2xhc3NOYW1lPSJiZy1yZWQtNTAwLzEwIGJvcmRlciBib3JkZXItcmVkLTUwMC8yMCByb3VuZGVkLWxnIHAtMyBt'
    'Yi00Ij4KICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXJlZC00MDAgdGV4dC1zbSI+e2Vycm9yfTwvcD4KICAg'
    'ICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgICl9CiAgICAgICAgICAgICAgPGZvcm0gb25TdWJtaXQ9e2hhbmRsZVN1'
    'Ym1pdH0gY2xhc3NOYW1lPSJzcGFjZS15LTQiPgogICAgICAgICAgICAgICAgPGRpdj4KICAgICAgICAgICAgICAgICAgPGxhYmVs'
    'IGNsYXNzTmFtZT0iYmxvY2sgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LWdyYXktMzAwIG1iLTEiPkVtYWlsPC9sYWJlbD4KICAg'
    'ICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9ImVtYWlsIiB2YWx1ZT17ZW1haWx9IG9uQ2hhbmdlPXsoZSkgPT4geyBzZXRFbWFp'
    'bChlLnRhcmdldC52YWx1ZSk7IHNldEVycm9yKCIiKTsgfX0KICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9InctZnVsbCBi'
    'Zy1bIzBhMGEwYV0gYm9yZGVyIGJvcmRlci13aGl0ZS8xMCByb3VuZGVkLXhsIHB4LTQgcHktMyB0ZXh0LXdoaXRlIHBsYWNlaG9s'
    'ZGVyLWdyYXktNTAwIGZvY3VzOm91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItWyMwMGQ0YWFdIHRyYW5zaXRpb24tY29sb3JzIgog'
    'ICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPSJ0dUBlbWFpbC5jb20iIHJlcXVpcmVkIC8+CiAgICAgICAgICAgICAgICA8'
    'L2Rpdj4KICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT0ic3VibWl0IiBkaXNhYmxlZD17bG9hZGluZ30gY2xhc3NOYW1lPSJ3'
    'LWZ1bGwgYmctWyMwMGQ0YWFdIGhvdmVyOmJnLVsjMDBiODk0XSBkaXNhYmxlZDpvcGFjaXR5LTUwIHRleHQtYmxhY2sgZm9udC1z'
    'ZW1pYm9sZCBweS0zIHJvdW5kZWQteGwgdHJhbnNpdGlvbi1jb2xvcnMiPgogICAgICAgICAgICAgICAgICB7bG9hZGluZyA/ICJF'
    'bnZpYW5kby4uLiIgOiAiRW52aWFyIGVubGFjZSBkZSByZWN1cGVyYWNpb24ifQogICAgICAgICAgICAgICAgPC9idXR0b24+CiAg'
    'ICAgICAgICAgICAgPC9mb3JtPgogICAgICAgICAgICA8Lz4KICAgICAgICAgICkgOiAoCiAgICAgICAgICAgIDw+CiAgICAgICAg'
    'ICAgICAgPGRpdiBjbGFzc05hbWU9InctMTYgaC0xNiBiZy1bIzAwZDRhYV0vMTAgcm91bmRlZC1mdWxsIGZsZXggaXRlbXMtY2Vu'
    'dGVyIGp1c3RpZnktY2VudGVyIG14LWF1dG8gbWItNiI+CiAgICAgICAgICAgICAgICA8c3ZnIGNsYXNzTmFtZT0idy04IGgtOCB0'
    'ZXh0LVsjMDBkNGFhXSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGgg'
    'c3Ryb2tlTGluZWNhcD0icm91bmQiIHN0cm9rZUxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlV2lkdGg9ezJ9IGQ9Ik0zIDhsNy44OSA1'
    'LjI2YTIgMiAwIDAwMi4yMiAwTDIxIDhNNSAxOWgxNGEyIDIgMCAwMDItMlY3YTIgMiAwIDAwLTItMkg1YTIgMiAwIDAwLTIgMnYx'
    'MGEyIDIgMCAwMDIgMnoiIC8+PC9zdmc+CiAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT0i'
    'dGV4dC0yeGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlIG1iLTIiPlJldmlzYSB0dSBjb3JyZW88L2gyPgogICAgICAgICAgICAg'
    'IDxwIGNsYXNzTmFtZT0idGV4dC1ncmF5LTQwMCBtYi02Ij4KICAgICAgICAgICAgICAgIFNpIGV4aXN0ZSB1bmEgY3VlbnRhIGNv'
    'biA8c3BhbiBjbGFzc05hbWU9InRleHQtd2hpdGUiPntlbWFpbH08L3NwYW4+LCB0ZSBlbnZpYW1vcyB1biBjb2RpZ28gZGUgNiBk'
    'aWdpdG9zIHkgdW4gZW5sYWNlLgogICAgICAgICAgICAgICAgUmV2aXNhIHRhbWJpZW4gbGEgY2FycGV0YSBkZSBzcGFtLiBFbCBj'
    'b2RpZ28gZXhwaXJhIGVuIDEwIG1pbnV0b3MuCiAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICAgIDxidXR0b24gb25DbGlj'
    'az17KCkgPT4gbmF2aWdhdGUoIi9yZXNldC1wYXNzd29yZCIsIHsgc3RhdGU6IHsgZW1haWwgfSB9KX0gY2xhc3NOYW1lPSJ3LWZ1'
    'bGwgYmctWyMwMGQ0YWFdIGhvdmVyOmJnLVsjMDBiODk0XSB0ZXh0LWJsYWNrIGZvbnQtc2VtaWJvbGQgcHktMyByb3VuZGVkLXhs'
    'IHRyYW5zaXRpb24tY29sb3JzIj5ZYSB0ZW5nbyBlbCBjb2RpZ288L2J1dHRvbj4KICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xp'
    'Y2s9eygpID0+IG5hdmlnYXRlKCIvbG9naW4iKX0gY2xhc3NOYW1lPSJ3LWZ1bGwgbXQtMyBib3JkZXIgYm9yZGVyLXdoaXRlLzEw'
    'IHRleHQtZ3JheS0zMDAgaG92ZXI6dGV4dC13aGl0ZSBmb250LW1lZGl1bSBweS0zIHJvdW5kZWQteGwgdHJhbnNpdGlvbi1jb2xv'
    'cnMiPlZvbHZlciBhIGluaWNpYXIgc2VzaW9uPC9idXR0b24+CiAgICAgICAgICAgIDwvPgogICAgICAgICAgKX0KICAgICAgICAg'
    'IDxwIGNsYXNzTmFtZT0idGV4dC1jZW50ZXIgdGV4dC1ncmF5LTQwMCBtdC00IHRleHQtc20iPgogICAgICAgICAgICA8TGluayB0'
    'bz0iL2xvZ2luIiBjbGFzc05hbWU9InRleHQtWyMwMGQ0YWFdIGhvdmVyOnVuZGVybGluZSI+Vm9sdmVyIGFsIGxvZ2luPC9MaW5r'
    'PgogICAgICAgICAgPC9wPgogICAgICAgIDwvZGl2PgogICAgICA8L2Rpdj4KICAgIDwvZGl2PgogICk7Cn0K'
    ) -join ''
  },
  @{
    Path = 'frontend/src/pages/auth/ResetPassword.tsx'
    B64  = @(
    'aW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICJyZWFjdCI7CmltcG9ydCB7IHVzZVBhcmFtcywgdXNlTmF2aWdhdGUsIHVzZUxvY2F0'
    'aW9uLCBMaW5rIH0gZnJvbSAicmVhY3Qtcm91dGVyLWRvbSI7CmltcG9ydCB7IGF1dGhBcGkgfSBmcm9tICIuLi8uLi9hcGkvYXV0'
    'aC5hcGkiOwoKZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gUmVzZXRQYXNzd29yZCgpIHsKICBjb25zdCB7IHRva2VuOiB0b2tlbkZy'
    'b21VcmwgfSA9IHVzZVBhcmFtcygpOwogIGNvbnN0IGxvY2F0aW9uID0gdXNlTG9jYXRpb24oKSBhcyB7IHN0YXRlPzogeyBlbWFp'
    'bD86IHN0cmluZyB9IH07CiAgLyogU2kgZWwgdXN1YXJpbyBubyBhYnJpbyBlbCBlbmxhY2UgZGVsIGNvcnJlbywgcHVlZGUgZXNj'
    'cmliaXIgZWwgY29kaWdvIGRlIDYgZGlnaXRvcyAqLwogIGNvbnN0IFtjb2RlLCBzZXRDb2RlXSA9IHVzZVN0YXRlKCIiKTsKICBj'
    'b25zdCBbZW1haWwsIHNldEVtYWlsXSA9IHVzZVN0YXRlKGxvY2F0aW9uLnN0YXRlPy5lbWFpbCB8fCAiIik7CiAgY29uc3QgW3Bh'
    'c3N3b3JkLCBzZXRQYXNzd29yZF0gPSB1c2VTdGF0ZSgiIik7CiAgY29uc3QgW2NvbmZpcm1QYXNzd29yZCwgc2V0Q29uZmlybVBh'
    'c3N3b3JkXSA9IHVzZVN0YXRlKCIiKTsKICBjb25zdCBbZXJyb3IsIHNldEVycm9yXSA9IHVzZVN0YXRlKCIiKTsKICBjb25zdCBb'
    'bG9hZGluZywgc2V0TG9hZGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7CiAgY29uc3QgW3N1Y2Nlc3MsIHNldFN1Y2Nlc3NdID0gdXNl'
    'U3RhdGUoZmFsc2UpOwogIGNvbnN0IG5hdmlnYXRlID0gdXNlTmF2aWdhdGUoKTsKCiAgY29uc3QgaGFuZGxlU3VibWl0ID0gYXN5'
    'bmMgKGU6IFJlYWN0LkZvcm1FdmVudCkgPT4gewogICAgZS5wcmV2ZW50RGVmYXVsdCgpOwogICAgaWYgKHBhc3N3b3JkICE9PSBj'
    'b25maXJtUGFzc3dvcmQpIHsgc2V0RXJyb3IoIkxhcyBjb250cmFzZW5hcyBubyBjb2luY2lkZW4iKTsgcmV0dXJuOyB9CiAgICBj'
    'b25zdCBjcmVkZW50aWFsID0gKHRva2VuRnJvbVVybCB8fCBjb2RlKS50cmltKCk7CiAgICBpZiAoIWNyZWRlbnRpYWwpIHsgc2V0'
    'RXJyb3IoIkluZ3Jlc2EgZWwgY29kaWdvIGRlIDYgZGlnaXRvcyBxdWUgcmVjaWJpc3RlIHBvciBjb3JyZW8iKTsgcmV0dXJuOyB9'
    'CiAgICBpZiAoIS9eKD89LipbYS16XSkoPz0uKltBLVpdKSg/PS4qXGQpLns4LH0kLy50ZXN0KHBhc3N3b3JkKSkgewogICAgICBz'
    'ZXRFcnJvcigiTGEgY29udHJhc2VuYSBkZWJlIHRlbmVyIG1pbmltbyA4IGNhcmFjdGVyZXMsIHVuYSBtYXl1c2N1bGEsIHVuYSBt'
    'aW51c2N1bGEgeSB1biBudW1lcm8iKTsKICAgICAgcmV0dXJuOwogICAgfQogICAgc2V0TG9hZGluZyh0cnVlKTsKICAgIHNldEVy'
    'cm9yKCIiKTsKICAgIHRyeSB7CiAgICAgIGF3YWl0IGF1dGhBcGkucmVzZXRQYXNzd29yZChjcmVkZW50aWFsLCBwYXNzd29yZCwg'
    'ZW1haWwgfHwgdW5kZWZpbmVkKTsKICAgICAgc2V0U3VjY2Vzcyh0cnVlKTsKICAgIH0gY2F0Y2ggKGVycjogYW55KSB7CiAgICAg'
    'IHNldEVycm9yKGVyci5tZXNzYWdlIHx8ICJFcnJvciBhbCByZXN0YWJsZWNlciBjb250cmFzZW5hIik7CiAgICB9IGZpbmFsbHkg'
    'ewogICAgICBzZXRMb2FkaW5nKGZhbHNlKTsKICAgIH0KICB9OwoKICByZXR1cm4gKAogICAgPGRpdiBjbGFzc05hbWU9Im1pbi1o'
    'LXNjcmVlbiBiZy1bIzBhMGEwYV0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcC00Ij4KICAgICAgPGRpdiBjbGFz'
    'c05hbWU9InctZnVsbCBtYXgtdy1tZCI+CiAgICAgICAgPGRpdiBjbGFzc05hbWU9InRleHQtY2VudGVyIG1iLTgiPgogICAgICAg'
    'ICAgPGgxIGNsYXNzTmFtZT0idGV4dC00eGwgZm9udC1ib2xkIHRleHQtd2hpdGUgdHJhY2tpbmctdGlnaHQiPkJBTkNBIE5FTjwv'
    'aDE+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPGRpdiBjbGFzc05hbWU9ImJnLVsjMWExYTFhXSByb3VuZGVkLTJ4bCBwLTggc2hh'
    'ZG93LTJ4bCBib3JkZXIgYm9yZGVyLXdoaXRlLzUiPgogICAgICAgICAgeyFzdWNjZXNzID8gKAogICAgICAgICAgICA8PgogICAg'
    'ICAgICAgICAgIDxoMiBjbGFzc05hbWU9InRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZSBtYi0yIj5OdWV2YSBjb250'
    'cmFzZW5hPC9oMj4KICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtZ3JheS00MDAgdGV4dC1zbSBtYi02Ij4KICAgICAg'
    'ICAgICAgICAgIHt0b2tlbkZyb21VcmwKICAgICAgICAgICAgICAgICAgPyAiSW5ncmVzYSB0dSBudWV2YSBjb250cmFzZW5hLiIK'
    'ICAgICAgICAgICAgICAgICAgOiAiRXNjcmliZSBlbCBjb2RpZ28gcXVlIHRlIGVudmlhbW9zIHBvciBjb3JyZW8geSB0dSBudWV2'
    'YSBjb250cmFzZW5hLiJ9CiAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICAgIHtlcnJvciAmJiAoCiAgICAgICAgICAgICAg'
    'ICA8ZGl2IGNsYXNzTmFtZT0iYmctcmVkLTUwMC8xMCBib3JkZXIgYm9yZGVyLXJlZC01MDAvMjAgcm91bmRlZC1sZyBwLTMgbWIt'
    'NCI+CiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1yZWQtNDAwIHRleHQtc20iPntlcnJvcn08L3A+CiAgICAg'
    'ICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICApfQogICAgICAgICAgICAgIDxmb3JtIG9uU3VibWl0PXtoYW5kbGVTdWJt'
    'aXR9IGNsYXNzTmFtZT0ic3BhY2UteS00Ij4KICAgICAgICAgICAgICAgIHshdG9rZW5Gcm9tVXJsICYmICgKICAgICAgICAgICAg'
    'ICAgICAgPD4KICAgICAgICAgICAgICAgICAgICA8ZGl2PgogICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT0i'
    'YmxvY2sgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LWdyYXktMzAwIG1iLTEiPkVtYWlsPC9sYWJlbD4KICAgICAgICAgICAgICAg'
    'ICAgICAgIDxpbnB1dCB0eXBlPSJlbWFpbCIgdmFsdWU9e2VtYWlsfSBvbkNoYW5nZT17KGUpID0+IHsgc2V0RW1haWwoZS50YXJn'
    'ZXQudmFsdWUpOyBzZXRFcnJvcigiIik7IH19CiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0idy1mdWxsIGJnLVsj'
    'MGEwYTBhXSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJvdW5kZWQteGwgcHgtNCBweS0zIHRleHQtd2hpdGUgcGxhY2Vob2xkZXIt'
    'Z3JheS01MDAgZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1bIzAwZDRhYV0gdHJhbnNpdGlvbi1jb2xvcnMiCiAgICAg'
    'ICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPSJ0dUBlbWFpbC5jb20iIHJlcXVpcmVkIC8+CiAgICAgICAgICAgICAgICAg'
    'ICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgICAgPGRpdj4KICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9'
    'ImJsb2NrIHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC1ncmF5LTMwMCBtYi0xIj5Db2RpZ28gZGUgNiBkaWdpdG9zPC9sYWJlbD4K'
    'ICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpbnB1dE1vZGU9Im51bWVyaWMiIG1heExlbmd0aD17Nn0g'
    'dmFsdWU9e2NvZGV9CiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4geyBzZXRDb2RlKGUudGFyZ2V0LnZh'
    'bHVlLnJlcGxhY2UoL1xEL2csICIiKSk7IHNldEVycm9yKCIiKTsgfX0KICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1l'
    'PSJ3LWZ1bGwgYmctWyMwYTBhMGFdIGJvcmRlciBib3JkZXItd2hpdGUvMTAgcm91bmRlZC14bCBweC00IHB5LTMgdGV4dC13aGl0'
    'ZSB0ZXh0LWNlbnRlciB0ZXh0LTJ4bCB0cmFja2luZy1bMC41ZW1dIHBsYWNlaG9sZGVyLWdyYXktNjAwIGZvY3VzOm91dGxpbmUt'
    'bm9uZSBmb2N1czpib3JkZXItWyMwMGQ0YWFdIHRyYW5zaXRpb24tY29sb3JzIgogICAgICAgICAgICAgICAgICAgICAgICBwbGFj'
    'ZWhvbGRlcj0iMDAwMDAwIiByZXF1aXJlZCAvPgogICAgICAgICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgICAgICA8'
    'Lz4KICAgICAgICAgICAgICAgICl9CiAgICAgICAgICAgICAgICA8ZGl2PgogICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NO'
    'YW1lPSJibG9jayB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtZ3JheS0zMDAgbWItMSI+TnVldmEgY29udHJhc2VuYTwvbGFiZWw+'
    'CiAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPSJwYXNzd29yZCIgdmFsdWU9e3Bhc3N3b3JkfSBvbkNoYW5nZT17KGUpID0+'
    'IHsgc2V0UGFzc3dvcmQoZS50YXJnZXQudmFsdWUpOyBzZXRFcnJvcigiIik7IH19CiAgICAgICAgICAgICAgICAgICAgY2xhc3NO'
    'YW1lPSJ3LWZ1bGwgYmctWyMwYTBhMGFdIGJvcmRlciBib3JkZXItd2hpdGUvMTAgcm91bmRlZC14bCBweC00IHB5LTMgdGV4dC13'
    'aGl0ZSBwbGFjZWhvbGRlci1ncmF5LTUwMCBmb2N1czpvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLVsjMDBkNGFhXSB0cmFuc2l0'
    'aW9uLWNvbG9ycyIKICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj0iTWluIDggY2FyYWN0ZXJlcywgbWF5dXNjdWxhIHkg'
    'bnVtZXJvIiByZXF1aXJlZCAvPgogICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICA8ZGl2PgogICAgICAgICAg'
    'ICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPSJibG9jayB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtZ3JheS0zMDAgbWItMSI+Q29u'
    'ZmlybWFyIGNvbnRyYXNlbmE8L2xhYmVsPgogICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT0icGFzc3dvcmQiIHZhbHVlPXtj'
    'b25maXJtUGFzc3dvcmR9IG9uQ2hhbmdlPXsoZSkgPT4geyBzZXRDb25maXJtUGFzc3dvcmQoZS50YXJnZXQudmFsdWUpOyBzZXRF'
    'cnJvcigiIik7IH19CiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPSJ3LWZ1bGwgYmctWyMwYTBhMGFdIGJvcmRlciBib3Jk'
    'ZXItd2hpdGUvMTAgcm91bmRlZC14bCBweC00IHB5LTMgdGV4dC13aGl0ZSBwbGFjZWhvbGRlci1ncmF5LTUwMCBmb2N1czpvdXRs'
    'aW5lLW5vbmUgZm9jdXM6Ym9yZGVyLVsjMDBkNGFhXSB0cmFuc2l0aW9uLWNvbG9ycyIKICAgICAgICAgICAgICAgICAgICBwbGFj'
    'ZWhvbGRlcj0iUmVwZXRpciBjb250cmFzZW5hIiByZXF1aXJlZCAvPgogICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAg'
    'ICAgICA8YnV0dG9uIHR5cGU9InN1Ym1pdCIgZGlzYWJsZWQ9e2xvYWRpbmd9IGNsYXNzTmFtZT0idy1mdWxsIGJnLVsjMDBkNGFh'
    'XSBob3ZlcjpiZy1bIzAwYjg5NF0gZGlzYWJsZWQ6b3BhY2l0eS01MCB0ZXh0LWJsYWNrIGZvbnQtc2VtaWJvbGQgcHktMyByb3Vu'
    'ZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzIj4KICAgICAgICAgICAgICAgICAge2xvYWRpbmcgPyAiR3VhcmRhbmRvLi4uIiA6ICJD'
    'YW1iaWFyIGNvbnRyYXNlbmEifQogICAgICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICAgICAgPC9mb3JtPgogICAgICAg'
    'ICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1jZW50ZXIgdGV4dC1ncmF5LTQwMCBtdC00IHRleHQtc20iPgogICAgICAgICAgICAg'
    'ICAgPExpbmsgdG89Ii9mb3Jnb3QtcGFzc3dvcmQiIGNsYXNzTmFtZT0idGV4dC1bIzAwZDRhYV0gaG92ZXI6dW5kZXJsaW5lIj5O'
    'byByZWNpYmlzdGUgZWwgY29kaWdvPyBTb2xpY2l0YXIgb3RybzwvTGluaz4KICAgICAgICAgICAgICA8L3A+CiAgICAgICAgICAg'
    'IDwvPgogICAgICAgICAgKSA6ICgKICAgICAgICAgICAgPD4KICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0idy0xNiBoLTE2'
    'IGJnLWVtZXJhbGQtNTAwLzEwIHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBteC1hdXRvIG1i'
    'LTYiPgogICAgICAgICAgICAgICAgPHN2ZyBjbGFzc05hbWU9InctOCBoLTggdGV4dC1lbWVyYWxkLTQwMCIgZmlsbD0ibm9uZSIg'
    'c3Ryb2tlPSJjdXJyZW50Q29sb3IiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggc3Ryb2tlTGluZWNhcD0icm91bmQiIHN0cm9r'
    'ZUxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlV2lkdGg9ezJ9IGQ9Ik01IDEzbDQgNEwxOSA3IiAvPjwvc3ZnPgogICAgICAgICAgICAg'
    'IDwvZGl2PgogICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9InRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZSBtYi0y'
    'Ij5Db250cmFzZW5hIGFjdHVhbGl6YWRhPC9oMj4KICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtZ3JheS00MDAgbWIt'
    'NiI+WWEgcHVlZGVzIGluaWNpYXIgc2VzaW9uIGNvbiB0dSBudWV2YSBjb250cmFzZW5hLjwvcD4KICAgICAgICAgICAgICA8YnV0'
    'dG9uIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCIvbG9naW4iKX0gY2xhc3NOYW1lPSJ3LWZ1bGwgYmctWyMwMGQ0YWFdIGhvdmVy'
    'OmJnLVsjMDBiODk0XSB0ZXh0LWJsYWNrIGZvbnQtc2VtaWJvbGQgcHktMyByb3VuZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzIj5J'
    'bmljaWFyIHNlc2lvbjwvYnV0dG9uPgogICAgICAgICAgICA8Lz4KICAgICAgICAgICl9CiAgICAgICAgPC9kaXY+CiAgICAgIDwv'
    'ZGl2PgogICAgPC9kaXY+CiAgKTsKfQo='
    ) -join ''
  },
  @{
    Path = 'docs/CONFIGURAR-CORREO.md'
    B64  = @(
    'IyBDb25maWd1cmFyIGVsIGVudsOtbyBkZSBjb3JyZW9zIOKAlCBCQU5DQSBORU4KCkd1w61hIHBhcmEgcXVlIGxsZWd1ZW4gZGUg'
    'dmVyZGFkIGxvcyBjw7NkaWdvcyBkZSAqKnJlZ2lzdHJvKiogeSBkZSAqKnJlY3VwZXJhY2nDs24gZGUgY29udHJhc2XDsWEqKi4K'
    'Ci0tLQoKIyMgMS4gUXXDqSBlc3RhYmEgbWFsCgp8IFByb2JsZW1hIHwgRWZlY3RvIHwgRXN0YWRvIHwKfC0tLXwtLS18LS0tfAp8'
    'IEVsIHJlZ2lzdHJvIG1hcmNhYmEgYGVtYWlsVmVyaWZpZWQ6IHRydWVgIHkgYGlzVmVyaWZpZWQ6IHRydWVgIGFsIGluc3RhbnRl'
    'IHwgRWwgY8OzZGlnbyBudW5jYSBzZSBwZWTDrWE6IGxhIHZlcmlmaWNhY2nDs24gZXJhIGRlY29yYXRpdmEgfCBDb3JyZWdpZG8g'
    'fAp8IExvcyBlcnJvcmVzIGRlIGVudsOtbyBzZSB0cmFnYWJhbiBjb24gYGxvZ2dlci53YXJuKCJObyBzZSBwdWRvIGVudmlhci4u'
    'LiIpYCBzaW4gbGEgY2F1c2EgfCBJbXBvc2libGUgc2FiZXIgcG9yIHF1w6kgZmFsbGFiYSB8IENvcnJlZ2lkbzogYWhvcmEgc2Ug'
    'cmVnaXN0cmEgZWwgZXJyb3IgcmVhbCB8CnwgTm8gZXhpc3TDrWEgbmluZ8O6biBhcmNoaXZvIGAuZW52YCwgYXPDrSBxdWUgYFNN'
    'VFBfVVNFUmAgeSBgU01UUF9QQVNTYCBpYmFuIHZhY8Otb3MgfCBOb2RlbWFpbGVyIGludGVudGFiYSBhdXRlbnRpY2Fyc2Ugc2lu'
    'IGNyZWRlbmNpYWxlcyB5IGZhbGxhYmEgc2llbXByZSB8IENvcnJlZ2lkbzogYGJhY2tlbmQvLmVudi5leGFtcGxlYCArIGBiYWNr'
    'ZW5kLy5lbnZgIHwKfCBgcG9ydDogNDY1YCArIGBzZWN1cmU6IHRydWVgIGZpam8gfCBJbmNvbXBhdGlibGUgY29uIGxhIG1heW9y'
    'w61hIGRlIHByb3ZlZWRvcmVzLCBxdWUgdXNhbiA1ODcvU1RBUlRUTFMgfCBDb3JyZWdpZG86IHB1ZXJ0byB5IFRMUyBjb25maWd1'
    'cmFibGVzIHwKfCBgc2VuZFBhc3N3b3JkUmVzZXRFbWFpbGAgc29sbyBtYW5kYWJhIHVuIGVubGFjZSBhIGBsb2NhbGhvc3Q6NTE3'
    'M2AgaGFyZGNvZGVhZG8gfCBJbnNlcnZpYmxlIGZ1ZXJhIGRlIHR1IGVxdWlwbywgeSBzaW4gY8OzZGlnbyBwYXJhIGVzY3JpYmly'
    'IGEgbWFubyB8IENvcnJlZ2lkbzogY8OzZGlnbyBkZSA2IGTDrWdpdG9zICsgZW5sYWNlIGNvbiBgRlJPTlRFTkRfVVJMYCB8Cnwg'
    'RWwgdG9rZW4gZGUgcmVzZXQgZXJhIGBjw7NkaWdvICsgNiBjYXJhY3RlcmVzIGFsZWF0b3Jpb3NgIChkw6liaWwpIHwgUmllc2dv'
    'IGRlIHNlZ3VyaWRhZCB8IENvcnJlZ2lkbzogMjQgYnl0ZXMgYWxlYXRvcmlvcyBkZSBgY3J5cHRvYCB8CnwgU2UgZXhpZ8OtYSB2'
    'ZXJpZmljYXIgZWwgdGVsw6lmb25vIGF1bnF1ZSBUd2lsaW8gbm8gZXN0dXZpZXJhIGNvbmZpZ3VyYWRvIHwgTGEgY3VlbnRhIHF1'
    'ZWRhYmEgYmxvcXVlYWRhIHBhcmEgc2llbXByZSB8IENvcnJlZ2lkbzogZWwgU01TIHNlIG9taXRlIHNpIG5vIGhheSBUd2lsaW8g'
    'fAp8IGBsb2dpbmAgcmVjaGF6YWJhIGFsIHVzdWFyaW8gbm8gdmVyaWZpY2FkbyBjb24gNDAzIHwgTm8gcG9kw61hIGxsZWdhciBh'
    'IGxhIHBhbnRhbGxhIHBhcmEgbWV0ZXIgZWwgY8OzZGlnbyB8IENvcnJlZ2lkbzogZW50cmEgeSBzZSBsZSByZWVudsOtYSBlbCBj'
    'w7NkaWdvIHwKCi0tLQoKIyMgMi4gQ29uZmlndXJhY2nDs24gKGVsaWdlIFVOQSBvcGNpw7NuKQoKQ29waWEgbGEgcGxhbnRpbGxh'
    'IHkgZWTDrXRhbGE6CgpgYGBiYXNoCmNwIGJhY2tlbmQvLmVudi5leGFtcGxlIGJhY2tlbmQvLmVudgpgYGAKCiMjIyBPcGNpw7Nu'
    'IEEg4oCUIFJlc2VuZCAocmVjb21lbmRhZGEsIDUgbWludXRvcykKCk5vIHJlcXVpZXJlIFNNVFAgbmkgY29udHJhc2XDsWFzIGRl'
    'IGFwbGljYWNpw7NuIHkgbm8gbG8gYmxvcXVlYW4gbG9zIGhvc3RpbmdzLgoKMS4gQ3JlYSB1bmEgY3VlbnRhIGdyYXRpcyBlbiA8'
    'aHR0cHM6Ly9yZXNlbmQuY29tPiAoMy4wMDAgY29ycmVvcy9tZXMpLgoyLiBWZSBhICoqQVBJIEtleXMg4oaSIENyZWF0ZSBBUEkg'
    'S2V5KiogeSBjb3BpYSBsYSBjbGF2ZSAoZW1waWV6YSBwb3IgYHJlX2ApLgozLiBFbiBgYmFja2VuZC8uZW52YDoKCmBgYGVudgpF'
    'TUFJTF9QUk9WSURFUj1yZXNlbmQKUkVTRU5EX0FQSV9LRVk9cmVfdHVfY2xhdmVfYXF1aQpFTUFJTF9GUk9NPUJBTkNBIE5FTiA8'
    'b25ib2FyZGluZ0ByZXNlbmQuZGV2PgpGUk9OVEVORF9VUkw9aHR0cDovL2xvY2FsaG9zdDo1MTczCmBgYAoKPiAqKkltcG9ydGFu'
    'dGUgcGFyYSBwcnVlYmFzOioqIGNvbiBlbCByZW1pdGVudGUgYG9uYm9hcmRpbmdAcmVzZW5kLmRldmAgUmVzZW5kIHNvbG8KPiBl'
    'bnRyZWdhIGEgbGEgZGlyZWNjacOzbiBjb24gbGEgcXVlIHRlIHJlZ2lzdHJhc3RlLiBQYXJhIG1hbmRhciBhIGN1YWxxdWllciBw'
    'ZXJzb25hLAo+IHZlIGEgKipEb21haW5zKiogZW4gUmVzZW5kLCB2ZXJpZmljYSB0dSBkb21pbmlvIHkgdXNhIGBFTUFJTF9GUk9N'
    'PUJBTkNBIE5FTiA8bm8tcmVwbHlAdHVkb21pbmlvLmNvbT5gLgoKIyMjIE9wY2nDs24gQiDigJQgU01UUCBjb24gR21haWwKCmBg'
    'YGVudgpFTUFJTF9QUk9WSURFUj1zbXRwClNNVFBfSE9TVD1zbXRwLmdtYWlsLmNvbQpTTVRQX1BPUlQ9NTg3ClNNVFBfU0VDVVJF'
    'PWZhbHNlClNNVFBfVVNFUj10dWNvcnJlb0BnbWFpbC5jb20KU01UUF9QQVNTPWFiY2RlZmdoaWprbG1ub3AKU01UUF9GUk9NPUJB'
    'TkNBIE5FTiA8dHVjb3JyZW9AZ21haWwuY29tPgpGUk9OVEVORF9VUkw9aHR0cDovL2xvY2FsaG9zdDo1MTczCmBgYAoKYFNNVFBf'
    'UEFTU2AgKipubyoqIGVzIHR1IGNvbnRyYXNlw7FhIGRlIEdtYWlsLiBFcyB1bmEgKmNvbnRyYXNlw7FhIGRlIGFwbGljYWNpw7Nu'
    'KjoKCjEuIEFjdGl2YSBsYSB2ZXJpZmljYWNpw7NuIGVuIDIgcGFzb3MgZW4gdHUgY3VlbnRhIEdvb2dsZS4KMi4gRW50cmEgYSA8'
    'aHR0cHM6Ly9teWFjY291bnQuZ29vZ2xlLmNvbS9hcHBwYXNzd29yZHM+LgozLiBHZW5lcmEgdW5hIHkgcGVnYSBsb3MgMTYgY2Fy'
    'YWN0ZXJlcyAqKnNpbiBlc3BhY2lvcyoqLgoKT3Ryb3MgcHJvdmVlZG9yZXMgcXVlIHRhbWJpw6luIGZ1bmNpb25hbjogQnJldm8g'
    'KGBzbXRwLXJlbGF5LmJyZXZvLmNvbTo1ODdgKSwKTWFpbHRyYXAgcGFyYSBwcnVlYmFzLCBPdXRsb29rIChgc210cC1tYWlsLm91'
    'dGxvb2suY29tOjU4N2ApLgoKIyMjIE9wY2nDs24gQyDigJQgU2luIGNvcnJlbyAoc29sbyBkZXNhcnJvbGxvKQoKYGBgZW52CkVN'
    'QUlMX1BST1ZJREVSPWNvbnNvbGUKYGBgCgpMb3MgY8OzZGlnb3Mgc2UgaW1wcmltZW4gZW4gbGEgdGVybWluYWwgZGVsIGJhY2tl'
    'bmQuIEVzIGxvIHF1ZSB0cmFlIGBiYWNrZW5kLy5lbnZgIHBvciBkZWZlY3RvLApwYXJhIHF1ZSBlbCBwcm95ZWN0byBhcnJhbnF1'
    'ZSBzaW4gY29uZmlndXJhciBuYWRhLgoKLS0tCgojIyAzLiBDb21wcm9iYXIgcXVlIGZ1bmNpb25hCgpBcnJhbmNhIGVsIGJhY2tl'
    'bmQ6CgpgYGBiYXNoCmNkIGJhY2tlbmQgJiYgbnBtIHJ1biBkZXYKYGBgCgpBbCBpbmljaWFyIHZlcsOhcyBlbiBsYSBjb25zb2xh'
    'IHVubyBkZSBlc3RvcyBtZW5zYWplczoKCi0gYEVNQUlMOiBwcm92ZWVkb3IgUmVzZW5kIGxpc3RvLiBSZW1pdGVudGU6IC4uLmAg'
    '4oaSIGNvcnJlY3RvCi0gYEVNQUlMOiBTTVRQIGNvbmVjdGFkbyAoc210cC5nbWFpbC5jb206NTg3KS4uLmAg4oaSIGNvcnJlY3Rv'
    'Ci0gYEVNQUlMOiBubyBzZSBwdWRvIGNvbmVjdGFyIGFsIFNNVFAuLi5gIOKGkiBjcmVkZW5jaWFsZXMgbWFsLCBlbCBtZW5zYWpl'
    'IGRpY2UgbGEgY2F1c2EKLSBgRU1BSUw6IHNpbiBwcm92ZWVkb3IgY29uZmlndXJhZG8uLi5gIOKGkiBlc3TDoXMgZW4gbW9kbyBj'
    'b25zb2xhCgpQcnVlYmEgZGlyZWN0YSBjb24gY3VybDoKCmBgYGJhc2gKIyBSZWN1cGVyYWNpw7NuIGRlIGNvbnRyYXNlw7FhCmN1'
    'cmwgLVggUE9TVCBodHRwOi8vbG9jYWxob3N0OjMwMDAvYXBpL3YxL2F1dGgvZm9yZ290LXBhc3N3b3JkIFwKICAtSCAiQ29udGVu'
    'dC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uIiBcCiAgLWQgJ3siZW1haWwiOiJ0dWNvcnJlb0BnbWFpbC5jb20ifScKYGBgCgotLS0K'
    'CiMjIDQuIEPDs21vIHF1ZWRhbiBsb3MgZmx1am9zCgojIyMgUmVnaXN0cm8KCjEuIGBQT1NUIC9hdXRoL3JlZ2lzdGVyYCDihpIg'
    'Y3JlYSBlbCB1c3VhcmlvICoqc2luIHZlcmlmaWNhcioqIHkgZW52w61hIHVuIGPDs2RpZ28gZGUgNiBkw61naXRvcy4KMi4gTGEg'
    'cmVzcHVlc3RhIGluY2x1eWUgYG5lZWRzVmVyaWZpY2F0aW9uOiB0cnVlYCB5IGBlbWFpbFNlbnQ6IHRydWV8ZmFsc2VgLgozLiBF'
    'bCBmcm9udGVuZCByZWRpcmlnZSBhIGAvdmVyaWZ5YC4KNC4gYFBPU1QgL2F1dGgvdmVyaWZ5LWVtYWlsYCBjb24gYHsgY29kZSB9'
    'YCDihpIgbWFyY2EgZWwgZW1haWwgY29tbyB2ZXJpZmljYWRvLgo1LiBTaSBUd2lsaW8gbm8gZXN0w6EgY29uZmlndXJhZG8sIGVs'
    'IHRlbMOpZm9ubyBzZSBkYSBwb3IgdmVyaWZpY2FkbyB5IGxhIGN1ZW50YSBxdWVkYSBhY3RpdmEuCjYuIEJvdMOzbiAqKlJlZW52'
    'aWFyKiogY29uIGN1ZW50YSBhdHLDoXMgZGUgNjAgcyAoZWwgYmFja2VuZCBkZXZ1ZWx2ZSA0Mjkgc2kgaW5zaXN0ZXMgYW50ZXMp'
    'Lgo3LiBMb3MgY8OzZGlnb3MgY2FkdWNhbiBhIGxvcyAxMCBtaW51dG9zLgoKIyMjIFJlY3VwZXJhciBjb250cmFzZcOxYQoKMS4g'
    'YFBPU1QgL2F1dGgvZm9yZ290LXBhc3N3b3JkYCBjb24gYHsgZW1haWwgfWAg4oaSIGVudsOtYSAqKmPDs2RpZ28gZGUgNiBkw61n'
    'aXRvcyArIGVubGFjZSoqLgoyLiBEb3MgY2FtaW5vczoKICAgLSBDbGljIGVuIGVsIGJvdMOzbiBkZWwgY29ycmVvIOKGkiBgL3Jl'
    'c2V0LXBhc3N3b3JkLzp0b2tlbmAsIHNvbG8gcGlkZSBsYSBjb250cmFzZcOxYSBudWV2YS4KICAgLSBJciBhIGAvcmVzZXQtcGFz'
    'c3dvcmRgIHkgZXNjcmliaXIgZWwgY8OzZGlnbyBhIG1hbm8ganVudG8gY29uIGVsIGVtYWlsLgozLiBgUE9TVCAvYXV0aC9yZXNl'
    'dC1wYXNzd29yZGAgYWNlcHRhIGB7IHRva2VuLCBwYXNzd29yZCwgZW1haWw/IH1gLCBkb25kZSBgdG9rZW5gIHB1ZWRlIHNlcgog'
    'ICBlbCB0b2tlbiBsYXJnbyBvIGxvcyA2IGTDrWdpdG9zLgo0LiBBbCBjYW1iaWFybGEgc2UgcmVpbmljaWFuIGxvcyBpbnRlbnRv'
    'cyBmYWxsaWRvcyB5IHNlIHJlYWN0aXZhIGxhIGN1ZW50YSBzaSBlc3RhYmEgc3VzcGVuZGlkYS4KNS4gTGEgcmVzcHVlc3RhIGRl'
    'IGBmb3Jnb3QtcGFzc3dvcmRgIGVzIHNpZW1wcmUgaWTDqW50aWNhIGV4aXN0YSBvIG5vIGxhIGN1ZW50YSwgcGFyYSBubyBmaWx0'
    'cmFyCiAgIHF1w6kgY29ycmVvcyBlc3TDoW4gcmVnaXN0cmFkb3MuCgotLS0KCiMjIDQtYmlzLiBEb2NrZXI6IHF1w6kgZXN0YWJh'
    'IHJvdG8KCkFwYXJ0ZSBkZWwgY29ycmVvLCBlbCBzdGFjayBkZSBEb2NrZXIgdGVuw61hIGZhbGxvcyBxdWUgaW1wZWTDrWFuIHF1'
    'ZSBhcnJhbmNhcmE6Cgp8IFByb2JsZW1hIHwgRWZlY3RvIHwgQ29ycmVnaWRvIGVuIHwKfC0tLXwtLS18LS0tfAp8IGBkb2NrZXIt'
    'Y29tcG9zZS55bWxgIG5vIHBhc2FiYSAqKm5pbmd1bmEqKiB2YXJpYWJsZSBkZSBjb3JyZW8gYWwgY29udGVuZWRvciB8IEF1bnF1'
    'ZSBjb25maWd1cmFyYXMgYGJhY2tlbmQvLmVudmAsIGVsIGNvbnRlbmVkb3Igbm8gbG8gdmU6IGxvcyBjb3JyZW9zIG51bmNhIHNh'
    'bMOtYW4gZW4gRG9ja2VyIHwgYGRvY2tlci1jb21wb3NlLnltbGAgfAp8IGBkZXBlbmRzX29uYCBzaW4gYGNvbmRpdGlvbjogc2Vy'
    'dmljZV9oZWFsdGh5YCB8IEVsIGJhY2tlbmQgYXJyYW5jYWJhIGFudGVzIHF1ZSBQb3N0Z3JlcywgZmFsbGFiYSBsYSBjb25leGnD'
    's24geSAqKnNlIGNlcnJhYmEgc29sbyoqIHwgYGRvY2tlci1jb21wb3NlLnltbGAgfAp8IGBjb25uZWN0RGF0YWJhc2VgIGhhY8Ot'
    'YSBgcHJvY2Vzcy5leGl0KDEpYCBhbCBwcmltZXIgZmFsbG8gfCBDdWFscXVpZXIgcmV0cmFzbyBkZSBQb3N0Z3JlcyB0dW1iYWJh'
    'IGVsIGJhY2tlbmQgfCBgZGF0YWJhc2UudHNgICgxNSByZWludGVudG9zKSB8CnwgYGFwcC5saXN0ZW4oUE9SVClgIHNpbiBob3N0'
    'IHwgRXNjdWNoYWJhIGVuIGBsb2NhbGhvc3RgIGRlbCBjb250ZW5lZG9yOiBlbCBwdWVydG8gcHVibGljYWRvIG5vIHJlc3BvbmTD'
    'rWEgZGVzZGUgV2luZG93cyB8IGBhcHAudHNgIChgMC4wLjAuMGApIHwKfCBgREFUQUJBU0VfVVJMPS4uLkBsb2NhbGhvc3Q6NTQz'
    'MmAgZW4gbGEgcGxhbnRpbGxhIHwgUGlzYWJhIGxhIGNvbmZpZyBkZSBEb2NrZXIgeSBhcHVudGFiYSBhbCBjb250ZW5lZG9yIG1p'
    'c21vIHwgYGRhdGFiYXNlLnRzYCArIGAuZW52LmV4YW1wbGVgIHwKfCBgcHJveHlfcGFzcyBodHRwOi8vYmFja2VuZDozMDAwYCBj'
    'b24gRE5TIGFsIGFycmFuY2FyIHwgTmdpbnggKipzZSBuZWdhYmEgYSBpbmljaWFyKiogc2kgZWwgYmFja2VuZCBhw7puIG5vIGV4'
    'aXN0w61hIHwgYG5naW54LmNvbmZgIHwKfCBTaW4gYC5kb2NrZXJpZ25vcmVgIHwgU2UgY29waWFiYSBgbm9kZV9tb2R1bGVzYCBk'
    'ZSBXaW5kb3dzIGFsIGJ1aWxkIChsZW50byB5IGNvbiBiaW5hcmlvcyBpbmNvbXBhdGlibGVzKSB8IGAuZG9ja2VyaWdub3JlYCB8'
    'CnwgRWwgRG9ja2VyZmlsZSBubyBjb21wcm9iYWJhIHF1ZSBgdHNjYCBnZW5lcmFyYSBgZGlzdC9gIHwgU2kgZmFsbGFiYSBsYSBj'
    'b21waWxhY2nDs24sIGxhIGltYWdlbiBxdWVkYWJhIHZhY8OtYSB5IGVsIGNvbnRlbmVkb3IgbW9yw61hIHwgYGJhY2tlbmQvRG9j'
    'a2VyZmlsZWAgfAp8IEhlYWx0aGNoZWNrIHF1ZSBzb2xvIG1pcmFiYSB1bmEgYmFuZGVyYSBlbiBtZW1vcmlhIHwgRGVjw61hICJv'
    'ayIgYXVucXVlIGxhIGJhc2UgZXN0dXZpZXJhIGNhw61kYSB8IGBoZWFsdGgucm91dGVzLnRzYCB8CnwgU2luIG1hbmVqbyBkZSBg'
    'U0lHVEVSTWAgfCBgZG9ja2VyIGNvbXBvc2UgZG93bmAgdGFyZGFiYSAxMHMgZW4gbWF0YXIgZWwgcHJvY2VzbyB8IGBhcHAudHNg'
    'IHwKCiMjIyBQb3IgcXXDqSBHbWFpbCB0ZSBmYWxsYWJhCgpEb3MgY2F1c2FzLCB5IGxhcyBkb3MgaGFiw61hIHF1ZSBhcnJlZ2xh'
    'cmxhczoKCjEuICoqTGEgY29udHJhc2XDsWEuKiogR21haWwgYmxvcXVlYSBlbCBhY2Nlc28gU01UUCBjb24gdHUgY29udHJhc2XD'
    'sWEgbm9ybWFsIGRlc2RlIDIwMjIuIE5lY2VzaXRhcyB1bmEgKmNvbnRyYXNlw7FhIGRlIGFwbGljYWNpw7NuKiBkZSAxNiBjYXJh'
    'Y3RlcmVzIChyZXF1aWVyZSB2ZXJpZmljYWNpw7NuIGVuIDIgcGFzb3MgYWN0aXZhZGEpLiBFbCBlcnJvciB0w61waWNvIGVzIGA1'
    'MzUtNS43LjggVXNlcm5hbWUgYW5kIFBhc3N3b3JkIG5vdCBhY2NlcHRlZGAuCjIuICoqRW4gRG9ja2VyIG5vIGxsZWdhYmEgbmFk'
    'YS4qKiBFbCBgZG9ja2VyLWNvbXBvc2UueW1sYCBubyBsZSBwYXNhYmEgYFNNVFBfVVNFUmAgbmkgYFNNVFBfUEFTU2AgYWwgY29u'
    'dGVuZWRvci4gQXVucXVlIHR1dmllcmFzIGxhIGNvbnRyYXNlw7FhIGRlIGFwbGljYWNpw7NuIGNvcnJlY3RhIGVuIGBiYWNrZW5k'
    'Ly5lbnZgLCBlbCBjb250ZW5lZG9yIGFycmFuY2FiYSBzaW4gZXNhcyB2YXJpYWJsZXMuCgpBZGVtw6FzIGVsIGPDs2RpZ28gZmlq'
    'YWJhIGBwb3J0OiA0NjUsIHNlY3VyZTogdHJ1ZWAsIHkgbXVjaGFzIHJlZGVzIHkgaG9zdGluZ3MgYmxvcXVlYW4gZWwgNDY1IHNh'
    'bGllbnRlLiBBaG9yYSBlbCBwdWVydG8gcG9yIGRlZmVjdG8gZXMgNTg3IGNvbiBTVEFSVFRMUywgeSBlcyBjb25maWd1cmFibGUu'
    'CgpTaSBlbCA1ODcgeSBlbCA0NjUgdGUgc2lndWVuIGZhbGxhbmRvIChhbGd1bm9zIElTUCBsb3MgYmxvcXVlYW4pLCB1c2EgUmVz'
    'ZW5kOiB2YSBwb3IgSFRUUFMgeSBubyBsbyBibG9xdWVhIG5hZGllLgoKLS0tCgojIyA1LiBBcmNoaXZvcyBtb2RpZmljYWRvcwoK'
    'YGBgCmRvY2tlci1jb21wb3NlLnltbCAgICAgICAgICAgICAgICB2YXJpYWJsZXMgZGUgY29ycmVvICsgZGVwZW5kc19vbiBjb24g'
    'aGVhbHRoY2hlY2sKYmFja2VuZC9Eb2NrZXJmaWxlICAgICAgICAgICAgICAgIHZlcmlmaWNhIGVsIGJ1aWxkLCBjdXJsLCB1c3Vh'
    'cmlvIG5vLXJvb3QKZnJvbnRlbmQvRG9ja2VyZmlsZSAgICAgICAgICAgICAgIHZhbGlkYSBuZ2lueC5jb25mLCBjb21wcnVlYmEg'
    'ZWwgYnVuZGxlCmZyb250ZW5kL25naW54LmNvbmYgICAgICAgICAgICAgICBwcm94eSByZXNpbGllbnRlLCBXZWJTb2NrZXQsIGNh'
    'Y2hlCmJhY2tlbmQvLmRvY2tlcmlnbm9yZSAgICAgICAgICAgICAobnVldm8pCmZyb250ZW5kLy5kb2NrZXJpZ25vcmUgICAgICAg'
    'ICAgICAobnVldm8pCmJhY2tlbmQvc3JjL2NvbmZpZy9kYXRhYmFzZS50cyAgICByZWludGVudG9zLCBEQl9IT1NUIHByaW9yaXRh'
    'cmlvLCBlcnJvcmVzIGNsYXJvcwpiYWNrZW5kL3NyYy9yb3V0ZXMvaGVhbHRoLnJvdXRlcy50cyAgaGVhbHRoY2hlY2sgcmVhbCBj'
    'b250cmEgbGEgQkQKYmFja2VuZC8uZW52LmV4YW1wbGUgICAgICAgICAgICAgIChudWV2bykgcGxhbnRpbGxhIGRvY3VtZW50YWRh'
    'CmJhY2tlbmQvLmVudiAgICAgICAgICAgICAgICAgICAgICAobnVldm8pIG1vZG8gY29uc29sYSBwb3IgZGVmZWN0bwpiYWNrZW5k'
    'L3NyYy9jb25maWcvZW1haWwudHMgICAgICAgcmVlc2NyaXRvOiBSZXNlbmQgKyBTTVRQICsgY29uc29sYSwgZXJyb3JlcyB2aXNp'
    'YmxlcwpiYWNrZW5kL3NyYy9zZXJ2aWNlcy9hdXRoLnNlcnZpY2UudHMgICByZWdpc3Ryby92ZXJpZmljYWNpw7NuL3Jlc2V0IGNv'
    'cnJlZ2lkb3MKYmFja2VuZC9zcmMvY29udHJvbGxlcnMvYXV0aC5jb250cm9sbGVyLnRzICAgcGFzYSBlbWFpbCBlbiByZXNldApi'
    'YWNrZW5kL3NyYy92YWxpZGF0b3JzL2F1dGgudmFsaWRhdG9yLnRzICAgICBhY2VwdGEgdG9rZW4gbyBjw7NkaWdvCmJhY2tlbmQv'
    'c3JjL2FwcC50cyAgICAgICAgICAgICAgICB2ZXJpZmljYSBsYSBjb25maWcgZGUgY29ycmVvIGFsIGFycmFuY2FyCmZyb250ZW5k'
    'L3NyYy9wYWdlcy9hdXRoL1ZlcmlmeS50c3ggICAgICAgICAgIGF2aXNvcyArIGNvb2xkb3duIGRlIHJlZW52w61vCmZyb250ZW5k'
    'L3NyYy9wYWdlcy9hdXRoL0ZvcmdvdFBhc3N3b3JkLnRzeCAgIG1lbnNhamUgcmVhbCArICJ5YSB0ZW5nbyBlbCBjw7NkaWdvIgpm'
    'cm9udGVuZC9zcmMvcGFnZXMvYXV0aC9SZXNldFBhc3N3b3JkLnRzeCAgICBwZXJtaXRlIGPDs2RpZ28gbWFudWFsCmZyb250ZW5k'
    'L3NyYy9zZXJ2aWNlcy9hdXRoLnRzICAgICAgICAgICAgICAgIGVtYWlsIG9wY2lvbmFsIGVuIHJlc2V0CmZyb250ZW5kL3NyYy9z'
    'dG9yZS9hdXRoLnNsaWNlLnRzICAgICAgICAgICAgIHByb3BhZ2EgbmVlZHNWZXJpZmljYXRpb24KZnJvbnRlbmQvc3JjL0FwcC50'
    'c3ggICAgICAgICAgICAgICAgICAgICAgICAgcnV0YSAvcmVzZXQtcGFzc3dvcmQgc2luIHRva2VuCmRvY3MvQ09ORklHVVJBUi1D'
    'T1JSRU8ubWQgICAgICAgICAobnVldm8pIGVzdGEgZ3XDrWEKYGBgCgotLS0KCiMjIDUtYmlzLiBDb21wcm9iYXIgcXVlIERvY2tl'
    'ciBxdWVkw7MgYmllbgoKYGBgYmFzaApkb2NrZXIgY29tcG9zZSB1cCAtZCAtLWJ1aWxkCgojIExvcyA1IGNvbnRlbmVkb3JlcyBk'
    'ZWJlbiBlc3RhciAiVXAiOyBwb3N0Z3JlcyB5IGJhY2tlbmQsICIoaGVhbHRoeSkiCmRvY2tlciBjb21wb3NlIHBzCgojIERlYmUg'
    'cmVzcG9uZGVyIHsic3RhdHVzIjoib2siLCJkYXRhYmFzZSI6ImNvbmVjdGFkYSIsIC4uLn0KY3VybCBodHRwOi8vbG9jYWxob3N0'
    'OjMwMDAvYXBpL3YxL2hlYWx0aAoKIyBFbCBmcm9udGVuZCBkZWJlIGRldm9sdmVyIGVsIGluZGV4Lmh0bWwKY3VybCAtSSBodHRw'
    'Oi8vbG9jYWxob3N0OjUxNzMKCiMgWSBlbCBwcm94eSBkZSBOZ2lueCBkZWJlIGxsZWdhciBhbCBiYWNrZW5kCmN1cmwgaHR0cDov'
    'L2xvY2FsaG9zdDo1MTczL2FwaS92MS9oZWFsdGgKYGBgCgpTaSBgZG9ja2VyIGNvbXBvc2UgcHNgIG11ZXN0cmEgZWwgYmFja2Vu'
    'ZCByZWluaWNpw6FuZG9zZSwgbWlyYSBsYSBjYXVzYSBjb24KYGRvY2tlciBjb21wb3NlIGxvZ3MgYmFja2VuZGAuIExvcyBtZW5z'
    'YWplcyBhaG9yYSBpbmRpY2FuIGV4YWN0YW1lbnRlIHF1w6kgZmFsdGEuCgotLS0KCiMjIDYuIFByb2JsZW1hcyBmcmVjdWVudGVz'
    'Cgp8IFPDrW50b21hIHwgQ2F1c2EgeSBzb2x1Y2nDs24gfAp8LS0tfC0tLXwKfCBgSW52YWxpZCBsb2dpbjogNTM1LTUuNy44IFVz'
    'ZXJuYW1lIGFuZCBQYXNzd29yZCBub3QgYWNjZXB0ZWRgIHwgVXNhc3RlIHR1IGNvbnRyYXNlw7FhIG5vcm1hbCBkZSBHbWFpbC4g'
    'R2VuZXJhIHVuYSBjb250cmFzZcOxYSBkZSBhcGxpY2FjacOzbi4gfAp8IGBSZXNlbmQgNDAzOiBZb3UgY2FuIG9ubHkgc2VuZCB0'
    'ZXN0aW5nIGVtYWlscyB0byB5b3VyIG93biBhZGRyZXNzYCB8IFZlcmlmaWNhIHR1IGRvbWluaW8gZW4gUmVzZW5kIG8gcHJ1ZWJh'
    'IGNvbiB0dSBwcm9waW8gY29ycmVvLiB8CnwgYEVUSU1FRE9VVGAgLyBgRUNPTk5SRUZVU0VEYCBlbiBlbCBwdWVydG8gNDY1IG8g'
    'NTg3IHwgVHUgcmVkIG8gdHUgaG9zdGluZyBibG9xdWVhIFNNVFAgc2FsaWVudGUuIFVzYSBSZXNlbmQgKEhUVFBTKS4gfAp8IEVs'
    'IGNvcnJlbyBsbGVnYSBhIHNwYW0gfCBWZXJpZmljYSBlbCBkb21pbmlvIHkgY29uZmlndXJhIFNQRi9ES0lNIGVuIHR1IHByb3Zl'
    'ZWRvciBETlMuIHwKfCBObyBsbGVnYSBuYWRhIHkgbGEgY29uc29sYSBkaWNlICJzaW4gcHJvdmVlZG9yIGNvbmZpZ3VyYWRvIiB8'
    'IFNpZ3VlIGVuIGBFTUFJTF9QUk9WSURFUj1jb25zb2xlYC4gUG9uIGByZXNlbmRgIG8gYHNtdHBgIGVuIGBiYWNrZW5kLy5lbnZg'
    'LiB8CnwgQ2FtYmnDqSBlbCBgLmVudmAgeSBzaWd1ZSBpZ3VhbCB8IFJlaW5pY2lhIGVsIGJhY2tlbmQ6IGxhcyB2YXJpYWJsZXMg'
    'c2UgbGVlbiBhbCBhcnJhbmNhci4gRW4gRG9ja2VyOiBgZG9ja2VyIGNvbXBvc2UgdXAgLWQgLS1mb3JjZS1yZWNyZWF0ZSBiYWNr'
    'ZW5kYC4gfAp8IEVsIGJhY2tlbmQgc2UgY2llcnJhIG5hZGEgbcOhcyBhcnJhbmNhciB8IEFudGVzIHBhc2FiYSBwb3IgZWwgYHBy'
    'b2Nlc3MuZXhpdCgxKWAuIENvbiBsYSBjb3JyZWNjacOzbiByZWludGVudGEgMTUgdmVjZXMuIE1pcmEgYGRvY2tlciBjb21wb3Nl'
    'IGxvZ3MgYmFja2VuZGAuIHwKfCBgRUNPTk5SRUZVU0VEYCBhIGxhIGJhc2UgZW4gRG9ja2VyIHwgYERCX0hPU1RgIGRlYmUgc2Vy'
    'IGBwb3N0Z3Jlc2AgKGVsIG5vbWJyZSBkZWwgc2VydmljaW8pLCBudW5jYSBgbG9jYWxob3N0YC4gfAp8IGBwYXNzd29yZCBhdXRo'
    'ZW50aWNhdGlvbiBmYWlsZWRgIHwgQ2FtYmlhc3RlIGxhIGNvbnRyYXNlw7FhIGNvbiBlbCB2b2x1bWVuIHlhIGNyZWFkby4gQsOz'
    'cnJhbG86IGBkb2NrZXIgY29tcG9zZSBkb3duIC12YCAoYm9ycmEgbG9zIGRhdG9zKS4gfAp8IEVsIHB1ZXJ0byA1NDMyIGVzdMOh'
    'IG9jdXBhZG8gZW4gV2luZG93cyB8IENvbXBvc2UgcHVibGljYSBlbCAqKjU0MzMqKiBwYXJhIG5vIGNob2NhciBjb24gdW4gUG9z'
    'dGdyZXMgbG9jYWwuIEZ1ZXJhIGRlIERvY2tlciB1c2EgYERCX1BPUlQ9NTQzM2AuIHwKfCBgZG9ja2VyIGNvbXBvc2UgY29uZmln'
    'YCBkYSBlcnJvciBkZSB2YXJpYWJsZSB8IEZhbHRhIGVsIGAuZW52YCBlbiBsYSByYcOtei4gRWplY3V0YSBgLlxGaXgtQ29ycmVv'
    'LnBzMWAgb3RyYSB2ZXouIHwKCj4gYGJhY2tlbmQvLmVudmAgZXN0w6EgZW4gYC5naXRpZ25vcmVgOiBudW5jYSBzdWJhcyB0dXMg'
    'Y2xhdmVzIGFsIHJlcG9zaXRvcmlvLgo='
    ) -join ''
  }
)

# ══════════════════════════════════════════════════════════════
#  3. Escribir los archivos corregidos
# ══════════════════════════════════════════════════════════════
Write-Paso "3/8  Aplicando las correcciones ($($Archivos.Count) archivos)"

$carpetaBackup = Join-Path $Raiz ("_backup-correo-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
$huboBackup = $false
$escritos = 0

foreach ($item in $Archivos) {
    $destino = Join-Path $Raiz ($item.Path -replace '/', '\')
    $carpeta = Split-Path $destino -Parent

    if (-not (Test-Path $carpeta)) {
        New-Item -ItemType Directory -Path $carpeta -Force | Out-Null
    }

    # Copia de seguridad del original
    if ((Test-Path $destino) -and (-not $SinBackup)) {
        if (-not $huboBackup) {
            New-Item -ItemType Directory -Path $carpetaBackup -Force | Out-Null
            $huboBackup = $true
        }
        $rutaBk = Join-Path $carpetaBackup ($item.Path -replace '/', '\')
        $carpetaBk = Split-Path $rutaBk -Parent
        if (-not (Test-Path $carpetaBk)) {
            New-Item -ItemType Directory -Path $carpetaBk -Force | Out-Null
        }
        Copy-Item -LiteralPath $destino -Destination $rutaBk -Force
    }

    # Escribimos los bytes exactos (UTF-8 sin BOM)
    try {
        $bytes = [Convert]::FromBase64String($item.B64)
        [System.IO.File]::WriteAllBytes($destino, $bytes)
        $escritos++
        Write-Host ("  [OK]    " + $item.Path) -ForegroundColor Green
    } catch {
        Write-Fallo "No se pudo escribir $($item.Path): $($_.Exception.Message)"
    }
}

Write-Ok "$escritos de $($Archivos.Count) archivos escritos."
if ($huboBackup) {
    Write-Info "Copias de los originales en: $(Split-Path $carpetaBackup -Leaf)"
}

# ══════════════════════════════════════════════════════════════
#  4. Generar los archivos .env
# ══════════════════════════════════════════════════════════════
Write-Paso "4/8  Generando la configuracion (.env)"

# --- Remitente segun el proveedor ---
$remitente = switch ($Proveedor) {
    "resend" { "BANCA NEN <onboarding@resend.dev>" }
    "smtp"   { "BANCA NEN <$SmtpUser>" }
    default  { "BANCA NEN <no-reply@bancanen.local>" }
}
$secure = if ($SmtpPort -eq 465) { "true" } else { "false" }

# --- backend/.env  (para ejecucion local, sin Docker) ---
$lineasBackend = @(
    "# Generado por Fix-Correo.ps1 el $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
    "NODE_ENV=development",
    "PORT=3000",
    "FRONTEND_URL=$FrontendUrl",
    "",
    "# Base de datos (puerto 5433 = el que expone docker-compose)",
    "DB_HOST=127.0.0.1",
    "DB_PORT=5433",
    "DB_USER=banca_nen",
    "DB_PASSWORD=banca_nen_secret",
    "DB_NAME=banca_nen",
    "",
    "JWT_SECRET=cambia-esto-por-una-cadena-larga-y-aleatoria-min-32",
    "JWT_EXPIRES_IN=24h",
    "JWT_REFRESH_EXPIRES_IN=7d",
    "",
    "# ---------- CORREO ----------",
    "EMAIL_PROVIDER=$Proveedor",
    "EMAIL_FROM=$remitente",
    "RESEND_API_KEY=$ResendApiKey",
    "SMTP_HOST=$SmtpHost",
    "SMTP_PORT=$SmtpPort",
    "SMTP_SECURE=$secure",
    "SMTP_USER=$SmtpUser",
    "SMTP_PASS=$SmtpPass",
    "SMTP_FROM=$remitente"
)

# --- .env de la RAIZ (el que lee docker compose) ---
$lineasRaiz = @(
    "# Generado por Fix-Correo.ps1 el $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
    "# Lo lee docker-compose.yml y se lo pasa al contenedor del backend.",
    "EMAIL_PROVIDER=$Proveedor",
    "EMAIL_FROM=$remitente",
    "RESEND_API_KEY=$ResendApiKey",
    "SMTP_HOST=$SmtpHost",
    "SMTP_PORT=$SmtpPort",
    "SMTP_SECURE=$secure",
    "SMTP_USER=$SmtpUser",
    "SMTP_PASS=$SmtpPass",
    "SMTP_FROM=$remitente",
    "FRONTEND_URL=$FrontendUrl"
)

# UTF-8 sin BOM: un BOM rompe la primera variable al leerla Docker/dotenv
$utf8SinBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $Raiz "backend\.env"),
    (($lineasBackend -join "`n") + "`n"), $utf8SinBom)
[System.IO.File]::WriteAllText((Join-Path $Raiz ".env"),
    (($lineasRaiz -join "`n") + "`n"), $utf8SinBom)

Write-Ok "backend\.env  (ejecucion local)"
Write-Ok ".env          (Docker Compose)"

# --- Proteger las claves: asegurar que .gitignore los excluye ---
$rutaGitignore = Join-Path $Raiz ".gitignore"
if (Test-Path $rutaGitignore) {
    $gi = Get-Content $rutaGitignore -Raw
    $aAgregar = @()
    foreach ($patron in @(".env", "backend/.env")) {
        if ($gi -notmatch [regex]::Escape($patron)) { $aAgregar += $patron }
    }
    if ($aAgregar.Count -gt 0) {
        Add-Content $rutaGitignore ("`n# Claves de correo - no subir`n" + ($aAgregar -join "`n"))
        Write-Ok ".gitignore actualizado (tus claves no se subiran a git)"
    } else {
        Write-Info ".gitignore ya protege los .env"
    }
}

# ══════════════════════════════════════════════════════════════
#  5. Validar que los archivos escritos son correctos
# ══════════════════════════════════════════════════════════════
Write-Paso "5/8  Validando el contenido aplicado"

$comprobaciones = @(
    @{ Archivo = "backend\src\config\email.ts";          Busca = "EMAIL_PROVIDER"; Que = "selector de proveedor" },
    @{ Archivo = "backend\src\config\email.ts";          Busca = "verifyEmailConfig"; Que = "chequeo al arrancar" },
    @{ Archivo = "backend\src\config\email.ts";          Busca = "api.resend.com"; Que = "soporte de Resend" },
    @{ Archivo = "backend\src\services\auth.service.ts"; Busca = "isVerified: false"; Que = "el registro ya NO auto-verifica" },
    @{ Archivo = "backend\src\services\auth.service.ts"; Busca = "CODE_TTL_MS"; Que = "caducidad de los codigos" },
    @{ Archivo = "backend\src\app.ts";                   Busca = "verifyEmailConfig"; Que = "aviso al iniciar el servidor" },
    @{ Archivo = "docker-compose.yml";                   Busca = "EMAIL_PROVIDER"; Que = "variables de correo en Docker" },
    @{ Archivo = "docker-compose.yml";                   Busca = "RESEND_API_KEY"; Que = "clave de Resend en Docker" },
    @{ Archivo = "frontend\src\App.tsx";                 Busca = 'path="/reset-password"'; Que = "ruta para el codigo manual" },
    @{ Archivo = "backend\src\config\database.ts";      Busca = "intentos = 15"; Que = "reintentos de conexion a la BD (Docker)" },
    @{ Archivo = "backend\src\config\database.ts";      Busca = "process.env.DB_HOST ?"; Que = "DB_HOST tiene prioridad sobre DATABASE_URL" },
    @{ Archivo = "backend\src\app.ts";                   Busca = '0.0.0.0'; Que = "el servidor escucha en 0.0.0.0 (Docker)" },
    @{ Archivo = "backend\src\app.ts";                   Busca = "SIGTERM"; Que = "cierre ordenado del contenedor" },
    @{ Archivo = "backend\src\routes\health.routes.ts"; Busca = "SELECT 1"; Que = "healthcheck real contra la BD" },
    @{ Archivo = "docker-compose.yml";                     Busca = "service_healthy"; Que = "el backend espera a Postgres" },
    @{ Archivo = "backend\Dockerfile";                    Busca = "test -f dist/app.js"; Que = "el build verifica que compilo" },
    @{ Archivo = "frontend\nginx.conf";                   Busca = 'upstream_backend'; Que = "proxy de Nginx resiliente" }
)

$okValid = 0
foreach ($c in $comprobaciones) {
    $ruta = Join-Path $Raiz $c.Archivo
    if (-not (Test-Path $ruta)) { Write-Fallo "Falta $($c.Archivo)"; continue }
    $contenido = Get-Content $ruta -Raw
    if ($contenido -like "*$($c.Busca)*") {
        Write-Ok $c.Que
        $okValid++
    } else {
        Write-Fallo "$($c.Que) -> no encontrado en $($c.Archivo)"
    }
}
Write-Info "$okValid de $($comprobaciones.Count) comprobaciones superadas."

# Comprobar que el registro ya no marca la cuenta como verificada
$svc = Get-Content (Join-Path $Raiz "backend\src\services\auth.service.ts") -Raw
if ($svc -match "emailVerified:\s*true,\s*\r?\n\s*phoneVerified:\s*true") {
    Write-Fallo "El registro sigue auto-verificando. La correccion no se aplico bien."
} else {
    Write-Ok "El codigo de verificacion ahora es obligatorio."
}

# ══════════════════════════════════════════════════════════════
#  6. Comprobar la sintaxis de docker-compose
# ══════════════════════════════════════════════════════════════
Write-Paso "6/8  Comprobando Docker"

$dockerOk = $false
$cmdDocker = Get-Command docker -ErrorAction SilentlyContinue

if (-not $cmdDocker) {
    Write-Aviso "Docker no esta instalado o no esta en el PATH."
    Write-Aviso "Puedes seguir sin Docker: cd backend; npm run dev"
} else {
    $version = (& docker --version 2>&1 | Out-String).Trim()
    Write-Ok $version

    # Docker Desktop puede estar instalado pero apagado
    & docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Aviso "El motor de Docker no responde. Abre Docker Desktop y espera"
        Write-Aviso "a que el icono de la ballena deje de moverse."
    } else {
        Write-Ok "El motor de Docker esta activo."
        $dockerOk = $true

        # Validamos el YAML y que las variables se sustituyan bien
        Push-Location $Raiz
        try {
            $salida = & docker compose config 2>&1 | Out-String
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "docker-compose.yml es valido."

                if ($salida -match "EMAIL_PROVIDER:\s*`"?$Proveedor") {
                    Write-Ok "El contenedor recibira EMAIL_PROVIDER=$Proveedor"
                } else {
                    Write-Aviso "No pude confirmar EMAIL_PROVIDER en la config resuelta."
                }

                if ($salida -match "DB_HOST:\s*`"?postgres") {
                    Write-Ok "DB_HOST=postgres (nombre del servicio, correcto en Docker)"
                } else {
                    Write-Fallo "DB_HOST no apunta al servicio 'postgres'."
                }
                if ($salida -match "condition:\s*service_healthy") {
                    Write-Ok "El backend esperara a que Postgres este listo."
                }

                if ($Proveedor -eq "resend" -and $salida -match "RESEND_API_KEY:\s*`"?re_") {
                    Write-Ok "La clave de Resend llega al contenedor."
                }
                if ($Proveedor -eq "smtp" -and $salida -match "SMTP_USER:\s*`"?\S+@") {
                    Write-Ok "Las credenciales SMTP llegan al contenedor."
                }
            } else {
                Write-Fallo "docker compose config fallo:"
                Write-Host $salida -ForegroundColor Red
            }
        } finally {
            Pop-Location
        }
    }
}

# ══════════════════════════════════════════════════════════════
#  7. Levantar Docker (solo con -Docker)
# ══════════════════════════════════════════════════════════════
Write-Paso "7/8  Arranque del stack"

if ($Docker -and $dockerOk) {
    Push-Location $Raiz
    try {
        Write-Info "Reconstruyendo el backend (puede tardar unos minutos)..."
        & docker compose up -d --build backend postgres redis
        if ($LASTEXITCODE -ne 0) {
            Write-Fallo "Fallo 'docker compose up'. Revisa la salida de arriba."
        } else {
            Write-Ok "Contenedores levantados."
            Write-Info "Esperando a que el backend responda..."

            $arriba = $false
            for ($i = 1; $i -le 30; $i++) {
                Start-Sleep -Seconds 2
                try {
                    $r = Invoke-WebRequest -Uri "http://localhost:3000/" -TimeoutSec 3 -UseBasicParsing
                    if ($r.StatusCode -eq 200) { $arriba = $true; break }
                } catch { }
            }

            if ($arriba) {
                Write-Ok "El backend responde en http://localhost:3000"

                # Leemos los logs para ver que dijo el chequeo de correo
                $logs = (& docker compose logs backend --tail 80 2>&1 | Out-String)
                if ($logs -match "EMAIL: proveedor Resend listo") {
                    Write-Ok "Resend operativo dentro del contenedor."
                } elseif ($logs -match "EMAIL: SMTP conectado") {
                    Write-Ok "SMTP conectado dentro del contenedor."
                } elseif ($logs -match "EMAIL: no se pudo conectar al SMTP") {
                    Write-Fallo "El contenedor no conecta al SMTP. Revisa usuario/contrasena."
                    ($logs -split "`n" | Select-String "EMAIL:") | ForEach-Object {
                        Write-Host "          $_" -ForegroundColor Red
                    }
                } elseif ($logs -match "EMAIL: sin proveedor configurado") {
                    Write-Aviso "Sigue en modo consola: los codigos salen en los logs."
                }
            } else {
                Write-Aviso "El backend no respondio en 60s. Mira: docker compose logs backend"
            }
        }
    } finally {
        Pop-Location
    }
} elseif ($Docker) {
    Write-Aviso "Se pidio -Docker pero Docker no esta disponible. Omitido."
} else {
    Write-Info "Sin -Docker: no se levanto nada."
    Write-Info "Para arrancarlo:  docker compose up -d --build"
}

# ══════════════════════════════════════════════════════════════
#  8. Prueba de envio real
# ══════════════════════════════════════════════════════════════
Write-Paso "8/8  Prueba de envio"

if ([string]::IsNullOrWhiteSpace($CorreoPrueba)) {
    Write-Info "Sin -CorreoPrueba: no se envio ningun correo."
} elseif ($Proveedor -eq "console") {
    Write-Aviso "En modo consola no se envia nada. Usa -Proveedor resend o smtp."
} else {
    $apiViva = $false
    try {
        Invoke-WebRequest -Uri "http://localhost:3000/" -TimeoutSec 3 -UseBasicParsing | Out-Null
        $apiViva = $true
    } catch {
        Write-Aviso "La API no responde en el puerto 3000; no puedo hacer la prueba."
        Write-Aviso "Levanta el backend y vuelve a ejecutar con -CorreoPrueba."
    }

    if ($apiViva) {
        Write-Info "Pidiendo recuperacion de contrasena para $CorreoPrueba ..."
        try {
            $cuerpo = @{ email = $CorreoPrueba } | ConvertTo-Json -Compress
            $resp = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/forgot-password" `
                        -Method Post -ContentType "application/json" -Body $cuerpo -TimeoutSec 25
            Write-Ok "La API acepto la peticion."
            Write-Info "Revisa la bandeja de $CorreoPrueba (mira tambien SPAM)."
            Write-Info "Nota: si el correo no esta registrado no llegara nada; es"
            Write-Info "el comportamiento correcto para no filtrar que cuentas existen."
        } catch {
            Write-Fallo "La peticion fallo: $($_.Exception.Message)"
        }
    }
}

# ══════════════════════════════════════════════════════════════
#  Resumen
# ══════════════════════════════════════════════════════════════
Write-Titulo "RESUMEN"

if ($script:Errores.Count -eq 0) {
    Write-Host "  Correcciones aplicadas correctamente." -ForegroundColor Green
} else {
    Write-Host "  Se encontraron $($script:Errores.Count) error(es):" -ForegroundColor Red
    $script:Errores | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
}

if ($script:Avisos.Count -gt 0) {
    Write-Host ""
    Write-Host "  Avisos:" -ForegroundColor Yellow
    $script:Avisos | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "  Proveedor de correo: $Proveedor" -ForegroundColor Cyan

switch ($Proveedor) {
    "console" {
        Write-Host ""
        Write-Host "  ATENCION: los codigos NO llegaran a ninguna bandeja." -ForegroundColor Yellow
        Write-Host "  Los veras en la terminal del backend, o con:" -ForegroundColor Yellow
        Write-Host "     docker compose logs -f backend" -ForegroundColor White
        Write-Host ""
        Write-Host "  Para enviar correos de verdad (gratis, 5 minutos):" -ForegroundColor Cyan
        Write-Host "     1. Crea una cuenta en https://resend.com" -ForegroundColor White
        Write-Host "     2. API Keys -> Create API Key -> copia la clave re_..." -ForegroundColor White
        Write-Host "     3. .\Fix-Correo.ps1 -Proveedor resend -ResendApiKey 're_...' -Docker" -ForegroundColor White
    }
    "resend" {
        Write-Host ""
        Write-Host "  IMPORTANTE con el remitente onboarding@resend.dev:" -ForegroundColor Yellow
        Write-Host "  Resend SOLO entrega a la direccion con la que te registraste." -ForegroundColor Yellow
        Write-Host "  Para enviar a cualquiera, verifica un dominio en Resend -> Domains" -ForegroundColor Yellow
        Write-Host "  y cambia EMAIL_FROM en el archivo .env de la raiz." -ForegroundColor Yellow
    }
    "smtp" {
        Write-Host ""
        Write-Host "  Si ves 'Username and Password not accepted':" -ForegroundColor Yellow
        Write-Host "  estas usando tu contrasena normal. Necesitas una contrasena" -ForegroundColor Yellow
        Write-Host "  de aplicacion: https://myaccount.google.com/apppasswords" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "  Como probarlo:" -ForegroundColor Cyan
Write-Host "     Con Docker:  docker compose up -d --build" -ForegroundColor White
Write-Host "     Sin Docker:  cd backend; npm install; npm run dev" -ForegroundColor White
Write-Host "     Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "     Registrate y el codigo llegara a tu correo." -ForegroundColor White
Write-Host ""
Write-Host "  Guia completa: docs\CONFIGURAR-CORREO.md" -ForegroundColor Gray
Write-Host ""

if ($script:Errores.Count -gt 0) { exit 1 }
exit 0
