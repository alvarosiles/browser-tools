#!/usr/bin/env bash
# Instala el IT Support Tools Local Agent en Linux como servicio systemd
# Este script descarga Node.js si no está disponible, instala dependencias,
# y registra el agente para ejecutarse automáticamente en el boot.

set -euo pipefail

# Configuración
INSTALL_DIR="${HOME}/.local/browser-tools-agent"
NODE_VERSION="22.23.2"
NODE_ARCH="x64"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
NODE_HOME="${INSTALL_DIR}/node"
AGENT_URL="${AGENT_REPO_URL:-https://alvarosiles.github.io/browser-tools/downloads/agent}"
SYSTEMD_UNIT="browser-tools-agent"
SYSTEMD_PATH="${HOME}/.config/systemd/user/${SYSTEMD_UNIT}.service"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# Validar arquitectura soportada
validate_arch() {
  case "$(uname -m)" in
    x86_64) NODE_ARCH="x64" ;;
    aarch64) NODE_ARCH="arm64" ;;
    armv7l) NODE_ARCH="armv7l" ;;
    *) log_error "Arquitectura no soportada: $(uname -m)"; ;;
  esac
  NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
  log_info "Arquitectura detectada: ${NODE_ARCH}"
}

# Descargar Node.js si no existe
ensure_node() {
  if [[ ! -x "${NODE_HOME}/bin/node" ]]; then
    log_info "Descargando Node.js ${NODE_VERSION}..."
    mkdir -p "${INSTALL_DIR}"

    local temp_dir=$(mktemp -d)
    trap "rm -rf ${temp_dir}" EXIT

    if ! curl -fsSL "${NODE_URL}" -o "${temp_dir}/node.tar.xz"; then
      log_error "No se pudo descargar Node.js desde ${NODE_URL}"
    fi

    log_info "Extrayendo Node.js..."
    tar -xJf "${temp_dir}/node.tar.xz" -C "${temp_dir}"

    local extracted_dir=$(ls -d "${temp_dir}"/node-v* | head -1)
    rm -rf "${NODE_HOME}"
    mv "${extracted_dir}" "${NODE_HOME}"

    log_info "Node.js ${NODE_VERSION} instalado en ${NODE_HOME}"
  fi
}

# Crear directorio de la aplicación
setup_app_dir() {
  log_info "Configurando directorio de aplicación..."
  mkdir -p "${INSTALL_DIR}/app"
  cd "${INSTALL_DIR}/app"

  # Descargar package.json y demás archivos necesarios
  log_info "Descargando archivos de la aplicación..."

  for file in package.json package-lock.json server.js commands.js updater.js; do
    log_info "Descargando ${file}..."
    curl -fsSL "${AGENT_URL}/${file}" -o "${INSTALL_DIR}/app/${file}"
  done

  # Instalar dependencias
  log_info "Instalando dependencias (esto puede tardar un minuto)..."
  export PATH="${NODE_HOME}/bin:${PATH}"
  "${NODE_HOME}/bin/npm" install --prefix "${INSTALL_DIR}/app" --production
}

# Crear servicio systemd
create_systemd_service() {
  log_info "Creando servicio systemd..."
  mkdir -p "$(dirname "${SYSTEMD_PATH}")"

  cat > "${SYSTEMD_PATH}" <<EOF
[Unit]
Description=Browser Tools Local Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${NODE_HOME}/bin/node ${INSTALL_DIR}/app/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="PORT=5177"
Environment="CONTROL_PORT=5178"

[Install]
WantedBy=default.target
EOF

  chmod 644 "${SYSTEMD_PATH}"
  log_info "Servicio systemd creado en ${SYSTEMD_PATH}"
}

# Verificar si ya está corriendo
check_already_running() {
  if timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/5178" 2>/dev/null; then
    log_warn "Ya hay una instancia del agente corriendo en el puerto 5178"
    return 0
  fi
  return 1
}

# Main
main() {
  log_info "Iniciando instalación del Browser Tools Agent para Linux..."

  if check_already_running; then
    log_info "El agente ya está instalado y corriendo"
    return 0
  fi

  validate_arch
  ensure_node
  setup_app_dir
  create_systemd_service

  # Habilitar y iniciar servicio
  log_info "Habilitando servicio systemd..."
  systemctl --user daemon-reload
  systemctl --user enable "${SYSTEMD_UNIT}"

  log_info "Iniciando servicio..."
  systemctl --user start "${SYSTEMD_UNIT}"

  # Esperar a que se inicie
  sleep 2

  if systemctl --user is-active --quiet "${SYSTEMD_UNIT}"; then
    log_info "${GREEN}✓${NC} Agente instalado e iniciado correctamente"
    log_info "Estado: $(systemctl --user status ${SYSTEMD_UNIT} --no-pager | grep Active)"
    log_info "Ver logs: journalctl --user -u ${SYSTEMD_UNIT} -f"
  else
    log_error "El servicio no se inició. Revisa los logs: journalctl --user -u ${SYSTEMD_UNIT}"
  fi
}

main "$@"
