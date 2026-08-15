Quiero que diseñes y desarrolles un **HTML único, completo y funcional** para una aplicación de escritorio/web llamada:

**BrowserVault — Browser Data Manager**

La aplicación sirve para **borrar, gestionar y respaldar datos de diferentes navegadores instalados en el equipo**.

Te voy a proporcionar una captura de mi interfaz actual como referencia visual. **NO quiero que la copies.** Quiero que uses la información y funcionalidad de la captura como punto de partida y diseñes una interfaz mucho más sofisticada, profesional, moderna y memorable.

## OBJETIVO

Quiero que el resultado parezca un producto real desarrollado por un equipo profesional de software, no una plantilla genérica de dashboard.

Debe transmitir:

* seguridad
* precisión
* tecnología
* confianza
* control
* privacidad
* calidad premium

La interfaz debe sentirse como una mezcla entre:

* una aplicación de seguridad profesional
* un dashboard moderno tipo Linear/Vercel
* una herramienta de administración avanzada
* una aplicación desktop premium

Pero **sin copiar ninguna marca, diseño o interfaz existente**.

---

# 1. TECNOLOGÍA

Entrega todo en:

**UN SOLO ARCHIVO HTML**

Debe incluir:

* HTML
* CSS
* JavaScript

No quiero archivos separados.

No uses frameworks pesados.

Puedes utilizar iconos mediante SVG inline.

Evita dependencias externas siempre que sea posible.

El archivo debe funcionar simplemente abriéndolo en el navegador.

---

# 2. DIRECCIÓN VISUAL

Quiero abandonar el aspecto de "tabla administrativa tradicional".

Diseña una experiencia mucho más visual.

Tema:

**Dark premium / Cyber security / Desktop utility**

Usa:

* fondo casi negro azulado
* paneles ligeramente elevados
* bordes muy sutiles
* gradientes discretos
* iluminación azul/cian
* pequeños acentos verdes para estados activos
* sombras profundas
* glassmorphism MUY sutil
* microinteracciones

No abuses de:

* glow
* gradientes
* colores
* bordes
* animaciones

Debe verse elegante y sobrio.

La interfaz tiene que parecer cara.

---

# 3. ESTRUCTURA GENERAL

Quiero una aplicación centrada con un layout similar a una aplicación desktop.

## HEADER

Crea un header profesional.

Debe incluir:

Logo/icono de BrowserVault.

Título:

**BrowserVault**

Subtítulo:

**Browser Data Manager**

A la derecha:

* indicador "System Ready"
* versión de la aplicación
* botón de configuración
* avatar/icono de usuario ficticio

Añade una línea visual o pequeño indicador que sugiera que la aplicación está monitoreando el sistema.

---

# 4. HERO / SYSTEM OVERVIEW

Debajo del header no quiero comenzar directamente con la tabla.

Crea primero una pequeña zona de resumen.

Por ejemplo:

### Browser Environment

Mostrar tarjetas compactas:

**10**
Browsers detected

**5**
Active

**2.4 GB**
Available browser data

**Last scan**
Just now

Las tarjetas deben ser elegantes, pequeñas y visualmente integradas.

No quiero enormes cards.

---

# 5. BROWSER MANAGEMENT

Esta es la parte principal.

En lugar de una tabla aburrida, crea un sistema híbrido:

Una lista de navegadores con apariencia de "control center".

Cada navegador debe tener:

* indicador de estado
* icono
* nombre
* motor
* versión ficticia
* última actividad
* pequeño indicador de datos encontrados

Ejemplos:

Google Chrome
Chromium
v140.0
Active

Microsoft Edge
Chromium
v140.0
Active

Mozilla Firefox
Gecko
v142.0
Active

Brave
Chromium
v1.82
Active

Opera
Chromium
v121
Active

GNOME Web
WebKit
Detected

Chromium
Chromium
Detected

Vivaldi
Chromium
Active

LibreWolf
Gecko
Detected

Zen Browser
Gecko
Detected

---

# 6. SISTEMA DE ACCIONES

Aquí quiero que seas creativo.

Cada navegador debe permitir seleccionar diferentes operaciones.

Pero NO quiero simplemente poner cuatro checkboxes sin diseño.

Quiero que existan estas operaciones:

### CLEAN

Borrar datos

### BACKUP

Respaldar perfil

### BOOKMARKS

Respaldar favoritos

### PASSWORDS

Exportar contraseñas

Cada operación debe tener:

* icono
* nombre
* checkbox/toggle
* estado
* botón "Details"

El botón:

**Details**

es MUY IMPORTANTE.

No debe parecer un simple botón HTML.

Debe abrir un panel/modal elegante con las opciones avanzadas de esa operación.

---

# 7. DETAILS PANEL

Cuando el usuario pulse "Details", abre un modal/panel lateral premium.

NO uses un alert().

Quiero un drawer lateral o modal moderno.

Ejemplo:

### Clean browser data

Chrome

Selecciona exactamente qué quieres eliminar.

Mostrar:

[✓] Browsing history
[✓] Cookies
[✓] Cached files
[ ] Download history
[ ] Form data
[ ] Site permissions
[ ] Active sessions
[ ] Local storage

Cada opción puede mostrar una pequeña descripción.

Al final:

**Estimated cleanup**

1.84 GB

Y botones:

Cancel

Apply selection

---

# 8. BACKUP DETAILS

Cuando el usuario pulse Details en Backup, mostrar:

### Browser Profile Backup

Seleccionar:

[✓] Profile settings
[✓] Bookmarks
[✓] Extensions
[✓] Cookies
[ ] History
[ ] Local storage
[ ] Preferences

Mostrar:

Destination

`~/BrowserVault/Backups/Chrome/`

Y:

Estimated size: 486 MB

Botón:

**Create Backup**

---

# 9. PASSWORD EXPORT

Esta parte debe verse especialmente segura.

No quiero una interfaz que parezca peligrosa.

Mostrar:

### Password Export

Un pequeño aviso visual:

"Password data is sensitive and will be encrypted before export."

Opciones:

* Export format
* JSON
* CSV
* Encrypted Vault

Preferido:

**Encrypted Vault**

Mostrar:

Encryption:

AES-256

También incluir:

Require confirmation before export

[✓]

Botón:

Export Securely

---

# 10. GLOBAL ACTION BAR

Crea una barra inferior/fija o una zona de acciones muy elegante.

Debe mostrar:

**3 browsers selected**

y acciones:

Clean Selected

Backup Selected

Clear Selection

Añade un pequeño resumen:

3 operations queued

No hagas botones gigantes.

---

# 11. DOMAIN CLEANUP

La funcionalidad de borrar datos de un dominio debe convertirse en una sección especial.

No quiero que parezca simplemente otro input.

Diseña una tarjeta:

### Domain Cleanup

"Remove browser data associated with a specific website."

Campo:

Search domain...

Ejemplo:

`example.com`

A la derecha:

**Analyze**

Cuando se analiza el dominio, mostrar visualmente:

Chrome
Cookies · 12
Storage · 4.2 MB
History · 32 entries

Firefox
Cookies · 8
Storage · 1.7 MB

etc.

Después mostrar:

**Total removable data**

5.9 MB

Botón:

**Remove Domain Data**

---

# 12. ACTIVITY LOG

Quiero una pequeña sección de actividad reciente.

Por ejemplo:

05:42
Chrome
Backup created
486 MB

05:38
Firefox
Cookies cleaned
124 MB freed

05:21
Brave
Profile scanned
No issues found

Utiliza una timeline pequeña y elegante.

---

# 13. ESTADO DEL SISTEMA

Añade una sección discreta:

System status

Browser detection
● Operational

Backup engine
● Ready

Encryption
● AES-256 enabled

Storage
● 128 GB available

Esto debe parecer un software profesional de seguridad.

---

# 14. INTERACCIONES

Aunque sea un HTML estático, quiero que parezca una aplicación real.

Implementa JavaScript para:

* seleccionar navegadores
* seleccionar acciones
* actualizar contador
* abrir/cerrar Details
* abrir drawers
* abrir modales
* cambiar toggles
* actualizar estadísticas
* mostrar estados
* simular análisis de dominio
* mostrar progreso de backup
* mostrar progreso de limpieza
* mostrar toast notifications
* mostrar confirmaciones
* actualizar activity log

No ejecutes acciones reales sobre el sistema.

Todo debe ser una simulación visual.

---

# 15. MICROINTERACCIONES

Quiero mucho cuidado en los detalles.

Añade:

* hover elegante
* transición de 150–250ms
* focus states
* botones con feedback
* toggles animados
* paneles que aparecen suavemente
* toast notifications
* progreso animado
* estados "Scanning..."
* estados "Ready"
* estados "Completed"

Nada exagerado.

Quiero sensación de software premium.

---

# 16. RESPONSIVE

Debe funcionar perfectamente en:

Desktop
1440px

Laptop
1280px

Tablet
768px

Mobile
390px

En móvil no intentes mantener una tabla imposible.

Transforma inteligentemente el layout.

---

# 17. UX

Quiero que pienses como un diseñador senior de UX.

Evita:

* interfaces saturadas
* botones innecesarios
* texto excesivo
* colores chillones
* cards gigantes
* tablas genéricas
* sombras exageradas
* modales feos
* iconos inconsistentes

Prioriza:

* jerarquía
* claridad
* agrupación
* consistencia
* feedback
* sensación de control

---

# 18. ICONOGRAFÍA

No uses emojis como iconos principales.

Utiliza SVG inline profesionales.

Cada navegador debe tener un icono visual consistente.

Si no puedes usar logos reales, crea símbolos SVG estilizados y minimalistas.

Los iconos deben verse coherentes entre sí.

---

# 19. TIPOGRAFÍA

Usa una tipografía moderna de sistema.

Preferencia:

Inter / system-ui

Jerarquía clara:

Title
Section
Label
Metadata

Mucho cuidado con tamaños y pesos.

---

# 20. DETALLE IMPORTANTE

No quiero que simplemente cumplas literalmente cada punto.

Quiero que **tomes decisiones de diseño propias**.

Si ves una oportunidad para mejorar la UX:

HAZLO.

Si una sección puede representarse mejor visualmente:

CAMBIALA.

Si una tabla puede convertirse en cards o un layout híbrido más interesante:

HAZLO.

Quiero que el resultado tenga personalidad.

---

# 21. CALIDAD VISUAL

Antes de entregar el código, revisa mentalmente:

¿Parece un software profesional?

¿Parece una aplicación de seguridad?

¿Tiene jerarquía visual?

¿Hay suficiente espacio?

¿Los elementos importantes destacan?

¿Los botones parecen realmente clicables?

¿Los Details tienen una experiencia elegante?

¿El diseño funciona sin necesidad de explicar al usuario cómo utilizarlo?

Si alguna respuesta es "no", mejora el diseño antes de entregar.

---

# 22. RESULTADO FINAL

Entrega únicamente:

**un único archivo HTML completo**

No expliques demasiado antes del código.

No me des pseudocódigo.

No me des fragmentos.

Quiero el HTML completo listo para copiar y ejecutar.

Y algo MUY IMPORTANTE:

**No quiero que parezca una versión ligeramente mejorada de mi captura.**

Quiero que, al comparar ambas interfaces, la nueva parezca pertenecer a una aplicación completamente diferente y mucho más profesional.

Haz que tenga ese efecto de:

> "Esto parece un producto real."

Prioriza diseño, UX, detalle y personalidad por encima de simplemente reproducir la estructura original.
