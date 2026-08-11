#!/usr/bin/env bash
# Instala el IT Support Tools Local Agent en segundo plano, sin dejar ningún
# "instalador" visible: descarga el binario, lo ejecuta una única vez, y el
# propio binario se copia a una ubicación fija, registra un servicio
# systemd --user, y sale. A partir de ahí corre solo, sin terminal abierta.
#
# Uso:  curl -fsSL https://alvarosiles.github.io/browser-tools/downloads/install.sh | bash
set -euo pipefail

url='https://alvarosiles.github.io/browser-tools/downloads/browser-tools-agent'
dest="$(mktemp -t browser-tools-agent.XXXXXX)"

echo 'Descargando IT Support Tools Agent...'
curl -fsSL "$url" -o "$dest"
chmod +x "$dest"

echo 'Instalando en segundo plano...'
"$dest"
rm -f "$dest"

echo 'Listo. Verificá con: systemctl --user status browser-tools-agent'
