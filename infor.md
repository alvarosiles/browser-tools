# Tipos de dato — tabla "Borrar Historial de Navegadores" (modo Detallado)

| Columna | Qué borra | Para qué sirve |
|---|---|---|
| **Cookies** | Los archivos/carpetas de cookies del navegador (sesiones, tokens de login, preferencias de sitios) | Cerrar sesiones guardadas en sitios web; útil cuando el equipo va a cambiar de usuario |
| **Caché** | Carpetas `Cache`, `Code Cache`, `GPUCache` (recursos web guardados: imágenes, scripts, etc.) | Liberar espacio en disco y forzar que las páginas carguen contenido fresco |
| **Local Storage** | Carpeta `Local Storage` — datos que las webs guardan localmente vía JS (`localStorage`) | Borrar datos persistentes de apps web (carritos, configuraciones guardadas en el navegador) |
| **Session Storage** | Carpeta `Session Storage` | Similar a Local Storage pero de vida más corta (por pestaña/sesión) |
| **IndexedDB** | Carpeta `IndexedDB` | Borra bases de datos locales que usan apps web complejas (Gmail, Notion, etc.) |
| **Service Workers** | Carpeta `Service Worker` | Elimina los workers en segundo plano que las webs registran (usados para notificaciones push, funcionamiento offline, PWA) |
| **Historial** | Archivo `History` (Chromium) o `places.sqlite` (Firefox) | Borra el historial de navegación (URLs visitadas) |
| **Permisos** | Preferencias de sitio (`Preferences` en Chromium) o `permissions.sqlite` (Firefox) | Resetea permisos otorgados a sitios (cámara, micrófono, ubicación, notificaciones) |
| **Push** | Suscripciones dentro de la base de datos de Service Worker | Cancela suscripciones a notificaciones push de sitios web |
| **WebSQL** | Carpeta `databases` | Borra bases de datos WebSQL (API antigua, hoy en desuso pero aún presente en algunos perfiles) |
| **Web App Manifest** | Carpeta `Web Applications` | Limpia datos relacionados a apps web instaladas/ancladas desde el navegador |
| **Cache Storage** | Carpeta `CacheStorage` (usada por Service Workers para cachear assets) | Borra la caché que usan las PWA para funcionar offline |
| **Autocompletado** | Archivo `Web Data` / `formhistory.sqlite` | Borra datos de autocompletado de formularios (nombres, direcciones, valores de campos) |

> Nota: en `local-agent/commands.js`, "Historial" y "Permisos" se tratan con lógica especial — historial usa un archivo separado por navegador, y permisos en navegadores Chromium se parchea dentro del archivo `Preferences` en vez de borrar un archivo entero (para no perder otras configuraciones).
