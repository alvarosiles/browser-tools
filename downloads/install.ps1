# Instala el IT Support Tools Local Agent en segundo plano, sin dejar ningun
# "instalador" visible: descarga el binario, lo ejecuta una unica vez, y el
# propio binario se copia a una ubicacion fija, se registra para arrancar con
# Windows (oculto) y sale. A partir de ahi corre solo, sin ventana.
#
# Uso:  irm https://alvarosiles.github.io/browser-tools/downloads/install.ps1 | iex
$ErrorActionPreference = 'Stop'

$exeUrl = 'https://alvarosiles.github.io/browser-tools/downloads/BrowserToolsAgent.exe'
$dest = Join-Path $env:TEMP 'BrowserToolsAgent-setup.exe'

Write-Host 'Descargando IT Support Tools Agent...'
Invoke-WebRequest -Uri $exeUrl -OutFile $dest -UseBasicParsing

Write-Host 'Instalando en segundo plano...'
Start-Process -FilePath $dest -WindowStyle Hidden

Write-Host 'Listo. El agente va a quedar corriendo en segundo plano y arrancar solo con Windows.'
