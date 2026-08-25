#!/usr/bin/env bash
# Instala el IT Support Tools Local Agent.
# En Linux: descarga el script de instalación completo y lo ejecuta
# En Windows (Git Bash/WSL): cargará el instalador PowerShell
#
# Uso: curl -fsSL https://alvarosiles.github.io/browser-tools/downloads/install.sh | bash

set -euo pipefail

INSTALL_SCRIPT_URL='https://alvarosiles.github.io/browser-tools/downloads/install-linux.sh'
temp_install="$(mktemp -t browser-tools-install.XXXXXX.sh)"
trap "rm -f ${temp_install}" EXIT

echo 'Descargando instalador...'
if ! curl -fsSL "$INSTALL_SCRIPT_URL" -o "$temp_install"; then
  echo "Error: No se pudo descargar el instalador desde $INSTALL_SCRIPT_URL"
  exit 1
fi

chmod +x "$temp_install"
echo 'Ejecutando instalador...'
"$temp_install"
