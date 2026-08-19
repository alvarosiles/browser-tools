const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let protectedDomains = [];
let browsers = [];
let currentBrowser = null;
let currentProfile = null;

const icons = {
  chrome: '🌐',
  edge: '🔵',
  firefox: '🦊',
  brave: '🦁',
  opera: '🎨',
  vivaldi: '🦅',
  librewolf: '🐺',
  zen: '✨',
  gnomeweb: '🕸️',
};

async function initApp() {
  await loadProtectedDomains();
  await loadBrowsers();
  setupNavigation();
  setupEventListeners();
}

async function loadProtectedDomains() {
  protectedDomains = await window.api.getProtectedDomains();
  renderProtectedTable();
}

function renderProtectedTable() {
  const tbody = $('#protectedTable tbody');
  tbody.innerHTML = '';

  const searchQuery = $('#search').value.toLowerCase();

  protectedDomains
    .filter(item => item.description.toLowerCase().includes(searchQuery) || item.domain.toLowerCase().includes(searchQuery))
    .forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.description}</td>
        <td class="domain-cell">${item.domain}</td>
        <td><button class="btn-remove" data-domain="${item.domain}">Quitar</button></td>
      `;
      tr.querySelector('.btn-remove').addEventListener('click', async () => {
        await removeDomain(item.domain);
      });
      tbody.appendChild(tr);
    });
}

async function removeDomain(domain) {
  await window.api.removeDomain(domain);
  await loadProtectedDomains();
}

async function addDomain() {
  const modal = $('#addDomainModal');
  if (!modal) {
    const form = document.createElement('div');
    form.id = 'addDomainModal';
    form.className = 'modal active';
    form.innerHTML = `
      <div class="modal-content">
        <h3>Agregar dominio protegido</h3>
        <div class="modal-body">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Descripción</label>
            <input id="newDesc" type="text" class="domain-input" placeholder="ej: GitHub" style="width: 100%;" />
          </div>
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Dominio</label>
            <input id="newDomain" type="text" class="domain-input" placeholder="ej: github.com o *.github.io" style="width: 100%;" />
          </div>
        </div>
        <div class="modal-actions">
          <button id="addCancelBtn" class="btn btn-secondary">Cancelar</button>
          <button id="addConfirmBtn" class="btn btn-primary">Agregar</button>
        </div>
      </div>
    `;
    document.body.appendChild(form);

    $('#addCancelBtn').addEventListener('click', () => {
      form.remove();
    });

    $('#addConfirmBtn').addEventListener('click', async () => {
      const desc = $('#newDesc').value;
      const domain = $('#newDomain').value;
      if (!desc || !domain) {
        alert('Por favor completa todos los campos');
        return;
      }
      await window.api.addDomain({ description: desc, domain });
      await loadProtectedDomains();
      form.remove();
    });
  }
}

async function loadBrowsers() {
  browsers = await window.api.detectBrowsers();
  renderBrowsers();
}

function renderBrowsers() {
  const container = $('#browsersContainer');
  container.innerHTML = '';

  browsers.forEach(browser => {
    const card = document.createElement('div');
    card.className = `browser-card ${!browser.installed ? 'not-installed' : ''}`;

    const icon = icons[browser.id] || '🌐';
    const status = browser.installed ? '✓ Instalado' : '✗ No instalado';
    const statusDot = browser.installed ? '<div class="status-dot"></div>' : '<div class="status-dot offline"></div>';

    card.innerHTML = `
      <div class="browser-header">
        <div class="browser-icon">${icon}</div>
        <div class="browser-info">
          <h3>${browser.name}</h3>
          <div class="browser-status">
            ${statusDot}
            <span>${status}</span>
          </div>
        </div>
      </div>
      <div class="browser-actions">
        ${browser.installed ? `
          <button class="btn btn-primary btn-sm" data-action="clear" data-browser="${browser.id}">🧹 Limpiar</button>
          <button class="btn btn-secondary btn-sm" data-action="backup" data-browser="${browser.id}">💾 Backup</button>
        ` : ''}
      </div>
    `;

    if (browser.installed) {
      card.querySelector('[data-action="clear"]').addEventListener('click', () => {
        currentBrowser = browser;
        showClearDataModal(browser);
      });

      card.querySelector('[data-action="backup"]').addEventListener('click', () => {
        currentBrowser = browser;
        $('#backupModal').classList.add('active');
      });
    }

    container.appendChild(card);
  });
}

function showClearDataModal(browser) {
  const modal = $('#confirmModal');
  const title = modal.querySelector('#confirmTitle');
  const body = modal.querySelector('#confirmBody');

  title.textContent = `⚠️ Confirmar limpieza de ${browser.name}`;

  const protectedCount = protectedDomains.length;
  body.innerHTML = `
    <div>
      <p style="margin-bottom: 12px; line-height: 1.6;">
        Se eliminarán todos los datos seleccionados del navegador,
        <strong>excepto los datos pertenecientes a los dominios protegidos</strong>.
      </p>
      <div style="background: rgba(37, 99, 235, 0.1); padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px;">
        <p style="margin: 6px 0;"><strong>Navegador:</strong> ${browser.name}</p>
        <p style="margin: 6px 0;"><strong>Dominios protegidos:</strong> ${protectedCount}</p>
        <p style="margin: 6px 0; margin-top: 12px;"><strong>Tipos de datos a eliminar:</strong></p>
        <ul style="margin: 8px 0 0 20px; padding: 0;">
          <li>Historial de navegación</li>
          <li>Cache</li>
          <li>Cookies (excepto dominios protegidos)</li>
          <li>Local Storage (excepto dominios protegidos)</li>
        </ul>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function setupNavigation() {
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-item').forEach(b => b.classList.remove('active'));
      $$('.content-section').forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      const section = btn.dataset.section;
      $(`#section-${section}`).classList.add('active');

      const titles = {
        browsers: 'Navegadores Instalados',
        protected: '🛡️ Dominios Protegidos',
        'clean-domain': '🧹 Borrar Datos de un Dominio',
        activity: '📋 Registro de Actividad',
      };

      $('#section-title').textContent = titles[section] || 'Browser Cleaner';
    });
  });
}

function setupEventListeners() {
  $('#addDomain').addEventListener('click', addDomain);

  $('#search').addEventListener('input', renderProtectedTable);

  $('#importBtn').addEventListener('click', async () => {
    const file = await window.api.importDomains();
    if (file) {
      await loadProtectedDomains();
    }
  });

  $('#exportBtn').addEventListener('click', async () => {
    await window.api.exportDomains();
  });

  $('#cleanDomainBtn').addEventListener('click', async () => {
    const domain = $('#domainInput').value.trim();
    if (!domain) {
      alert('Por favor ingresa un dominio');
      return;
    }

    const isProtected = await window.api.isProtected(domain);
    if (isProtected) {
      $('#domainWarning').style.display = 'block';
      $('#warningMessage').textContent =
        '🛡️ Este dominio está protegido. Debes quitarlo de la lista antes de poder borrar sus datos.';
      return;
    }

    const confirmed = await window.api.confirmCleanDomain(domain);
    if (confirmed) {
      await window.api.cleanDomain(domain);
      $('#domainInput').value = '';
      $('#domainWarning').style.display = 'none';
    }
  });

  $('#cancelBtn').addEventListener('click', () => {
    $('#confirmModal').classList.remove('active');
  });

  $('#confirmBtn').addEventListener('click', async () => {
    $('#confirmModal').classList.remove('active');

    const dataTypes = ['history', 'cookies', 'cache', 'localStorage'];
    await window.api.clearData(currentBrowser.id, currentBrowser.profiles[0].path, dataTypes);

    loadBrowsers();
  });

  $('#backupCancelBtn').addEventListener('click', () => {
    $('#backupModal').classList.remove('active');
  });

  $('#backupConfirmBtn').addEventListener('click', async () => {
    const selected = Array.from($$('#backupModal input[type="checkbox"]:checked')).map(c => c.value);
    if (selected.length === 0) {
      alert('Selecciona al menos un tipo de dato');
      return;
    }

    await window.api.backup(currentBrowser.id, currentBrowser.profiles[0].path, selected);
    $('#backupModal').classList.remove('active');
    await loadBrowsers();
  });

  $('#clearLogsBtn').addEventListener('click', async () => {
    await window.api.clearLogs();
    loadActivityLog();
  });
}

async function loadActivityLog() {
  const logs = await window.api.getActivityLog();
  const logContainer = $('#activityLog');

  if (logs.length === 0) {
    logContainer.innerHTML = '<p class="empty-state">No hay actividades registradas</p>';
    return;
  }

  logContainer.innerHTML = logs
    .map(
      log => `
    <div class="activity-entry">
      <strong>${log.timestamp}</strong> ${log.message}
    </div>
  `
    )
    .join('');
}

initApp();
