# 🧹 Browser Data Cleaner

Una aplicación de escritorio profesional, multiplataforma (Windows/Linux/macOS) para gestionar, respaldar y limpiar datos de navegadores con control granular y protección de dominios.

## ✨ Características

### 🌐 Soporte Multi-Navegador
- Google Chrome, Microsoft Edge, Mozilla Firefox
- Brave Browser, Opera, Vivaldi
- LibreWolf, Zen Browser, GNOME Web

### 🛡️ Dominios Protegidos
- Lista editable de dominios protegidos
- Importar/exportar listas
- Soporte para wildcards: `*.github.io`
- Búsqueda/filtro rápido
- Preconfigurado con: Google, GitHub, Claude/Anthropic

### 🧹 Limpieza Inteligente
- **Borrar TODO excepto dominios protegidos**
- **Borrar un dominio específico** en todos los navegadores
- Historial, Cookies, Cache, LocalStorage, IndexedDB, etc.

### 💾 Respaldos
- Crear backups timestamped: `BrowserBackup/Chrome/2026-08-18_23-30-15/`
- Seleccionar qué respaldar (Historia, Cookies, Marcadores, etc.)
- Seguro - sin contraseñas en texto plano

### 📋 Registro de Actividad
- Log completo con timestamps
- Sin información sensible

### 🔒 Seguridad
- ✅ Todo local - sin envío de datos
- ✅ Confirmación antes de borrar
- ✅ Protección real de dominios
- ✅ Detección de navegadores abiertos

## 🚀 Instalación

```bash
npm install
npm start
```

## 📖 Cómo Usar

**🛡️ Dominios Protegidos**: Configura qué dominios NO quieres que se limpien
**🌐 Navegadores**: Limpia todos los datos excepto dominios protegidos
**🧹 Borrar Dominio**: Elimina datos de UN sitio en todos los navegadores
**📋 Actividad**: Visualiza el log de operaciones

## 🔐 Protección de Dominios

Los dominios protegidos funcionan como una **allowlist verdadera**:

```
Si proteges: github.com, mail.google.com, claude.ai

Al presionar "Borrar Datos":
✓ Se borra: historial de otros sitios, cookies de otros sitios
✓ Se PROTEGE: todo de github.com, mail.google.com, claude.ai
```

¡Tus sesiones de GitHub y Google seguirán activas!
