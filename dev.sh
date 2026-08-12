#!/usr/bin/env bash
# Levanta el panel web (Vite) y el agente local juntos.
# Uso: ./dev.sh
set -e

cd "$(dirname "$0")"

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

if command -v nvm >/dev/null 2>&1; then
  nvm use
else
  echo "Aviso: nvm no encontrado, usando el Node del sistema ($(node -v))."
fi

[ -d node_modules ] || npm install
[ -d local-agent/node_modules ] || npm install --prefix local-agent

echo "Abriendo http://localhost:5173 (Ctrl+C para detener)"
npm run web:run
