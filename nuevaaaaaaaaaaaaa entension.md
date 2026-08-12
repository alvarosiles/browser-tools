Quiero que desarrolles una extensión para Google Chrome, compatible con Chrome Web Store y Manifest V3, que funcione como un automatizador de acciones sobre páginas web.

OBJETIVO

La extensión debe permitir al usuario seleccionar una zona de una página web y, después de configurar un intervalo de tiempo, ejecutar automáticamente una acción en esa zona.

Las acciones disponibles serán:

🖱️ Click del mouse
␣ Presionar la tecla ESPACIO
↵ Presionar la tecla ENTER/INTRO

La extensión debe tener una interfaz sencilla, moderna y fácil de usar.

FLUJO DE USO
PASO 1 — Seleccionar zona

El usuario abre la extensión y pulsa:

"Seleccionar zona"

Después:

La extensión debe permitir seleccionar visualmente una zona de la página.
El usuario debe poder hacer clic y arrastrar para dibujar un rectángulo.
El rectángulo debe mostrarse visualmente mientras se selecciona.
Al terminar, guardar las coordenadas de la zona.
Mostrar la zona seleccionada de forma visual.
Preferiblemente usar el centro del rectángulo como punto de acción para el click.

Ejemplo:

┌──────────────────────────────┐
│                              │
│       ┌──────────────┐       │
│       │ ZONA         │       │
│       │ SELECCIONADA │       │
│       └──────────────┘       │
│                              │
└──────────────────────────────┘


Debe tener un botón:

"Cambiar zona"

para poder seleccionar otra ubicación.

PASO 2 — CONFIGURAR INTERVALO

Después de seleccionar la zona, el usuario debe elegir cada cuánto tiempo se ejecutará la acción.

Opciones rápidas:

30 segundos
1 minuto
2 minutos
3 minutos
5 minutos
10 minutos

También debe existir una opción:

"Personalizado"

que permita introducir una cantidad y seleccionar:

segundos
minutos
horas

Ejemplos:

Cada: [ 3 ] [ minutos ▼ ]


o

Cada: [ 45 ] [ segundos ▼ ]


Validar que el valor sea mayor que 0.

PASO 3 — ELEGIR ACCIÓN

Mostrar tres opciones:

Acción:

○ 🖱️ Click del mouse

○ ␣ Presionar ESPACIO

○ ↵ Presionar ENTER

Click del mouse

Si el usuario selecciona esta opción:

Ejecutar un click en el centro de la zona seleccionada.
El click debe realizarse sobre la página web activa.
ESPACIO

Si selecciona ESPACIO:

Enviar una pulsación de la tecla Space a la página activa.
ENTER

Si selecciona ENTER:

Enviar una pulsación de Enter a la página activa.

Importante: utiliza las APIs permitidas por Chrome para extensiones Manifest V3 y explica claramente cualquier limitación de seguridad o permisos que tenga Chrome.

PASO 4 — INICIAR

Debe existir un botón grande:

▶ INICIAR

Cuando el usuario lo pulse:

Comenzar la cuenta regresiva.
Mostrar el estado como ACTIVO.
Mostrar cuánto falta para la próxima acción.
Cuando llegue el momento, ejecutar la acción seleccionada.
Reiniciar automáticamente el temporizador.
Continuar indefinidamente hasta que el usuario pulse detener.

Ejemplo:

Estado: 🟢 ACTIVO

Próxima acción:
02:43

Acción:
🖱️ Click

Intervalo:
3 minutos

PASO 5 — DETENER

Debe existir un botón:

■ DETENER

Al pulsarlo:

Detener completamente el temporizador.
No ejecutar más acciones.
Cambiar el estado a:

⚪ DETENIDO

El usuario debe poder volver a pulsar "Iniciar" posteriormente.

INTERFAZ

Quiero una interfaz moderna y limpia.

Preferencias:

Diseño oscuro.
Bordes redondeados.
Botones grandes.
Buena separación entre elementos.
Iconos simples.
Interfaz responsive.
Popup de aproximadamente 350–400 px de ancho.

Ejemplo aproximado:

┌───────────────────────────────────┐
│       ⚡ AUTO ACTION               │
│                                   │
│  ZONA                              │
│  ┌─────────────────────────────┐  │
│  │ Zona seleccionada ✓         │  │
│  └─────────────────────────────┘  │
│                                   │
│  [ Cambiar zona ]                 │
│                                   │
│  INTERVALO                         │
│  [ 3 ] [ minutos ▼ ]             │
│                                   │
│  ACCIÓN                            │
│  ◉ 🖱️ Click del mouse             │
│  ○ ␣ Espacio                      │
│  ○ ↵ Enter                        │
│                                   │
│  ┌─────────────────────────────┐  │
│  │       ▶ INICIAR             │  │
│  └─────────────────────────────┘  │
│                                   │
│  ┌─────────────────────────────┐  │
│  │       ■ DETENER             │  │
│  └─────────────────────────────┘  │
│                                   │
│  🟢 ACTIVO                        │
│  Próxima acción: 02:43            │
└───────────────────────────────────┘

REQUISITOS TÉCNICOS

Utiliza:

Manifest V3.
JavaScript puro, si no es necesario usar frameworks.
HTML.
CSS.
Chrome APIs oficiales.
chrome.storage para guardar configuración.
Service worker/background cuando sea necesario.
Content scripts cuando sea necesario.

Quiero que la extensión sea lo más sencilla posible de instalar y mantener.

NO quiero depender de un servidor externo.

PERSISTENCIA

La extensión debe recordar:

Zona seleccionada.
Intervalo.
Unidad de tiempo.
Acción seleccionada.

Si cierro y vuelvo a abrir Chrome, la configuración debería permanecer guardada.

Si es técnicamente posible y seguro, también quiero que el estado del temporizador pueda recuperarse después de cerrar/reabrir el popup.

PERMISOS

Utiliza solamente los permisos estrictamente necesarios.

Explícame:

Qué permisos necesita la extensión.
Para qué sirve cada permiso.
Si existe alguna limitación de Chrome para hacer clicks o enviar teclas automáticamente.

No solicites permisos innecesarios.

COMPATIBILIDAD

Debe funcionar en páginas web normales de Chrome.

Ten en cuenta que existen páginas especiales donde Chrome no permite ejecutar extensiones, como:

chrome://
Chrome Web Store
páginas internas del navegador
otras páginas restringidas por Chrome

Si una página no permite ejecutar la extensión, muestra un mensaje claro al usuario.

SEGURIDAD Y ESTABILIDAD

Implementa:

Validación de todos los valores introducidos.
Evitar múltiples temporizadores simultáneos.
Limpieza correcta de timers.
Manejo de errores.
Evitar que la extensión se quede ejecutándose accidentalmente varias veces.
Estado visual claro.
No bloquear la página.
No consumir CPU innecesariamente.
ESTRUCTURA DEL PROYECTO

Quiero que me entregues el proyecto completo con una estructura similar a:

auto-action-extension/
│
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── content.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png


Si consideras que otra estructura es técnicamente mejor, puedes modificarla.

MUY IMPORTANTE

No quiero solamente una explicación.

Quiero que escribas el código completo y funcional de todos los archivos necesarios.

Para cada archivo:

Indica el nombre del archivo.
Muestra el contenido completo.
No omitas partes con comentarios como // aquí va el resto.
El código debe poder copiarse directamente a archivos y cargarse en Chrome.

Después explícame paso a paso:

INSTALACIÓN

Cómo:

Crear la carpeta.
Crear cada archivo.
Pegar el código.
Abrir chrome://extensions.
Activar "Modo desarrollador".
Pulsar "Cargar descomprimida".
Seleccionar la carpeta.
Probar la extensión.
PRUEBA

Incluye una prueba sencilla para verificar que funciona:

Abrir una página web con un botón.
Seleccionar el botón.
Configurar 30 segundos.
Elegir "Click del mouse".
Pulsar iniciar.
Esperar 30 segundos.
Comprobar que se ejecutó el click.

También quiero una prueba para ESPACIO y otra para ENTER.

POSIBLES MEJORAS

Después de terminar la V1, indícame qué mejoras podríamos agregar en una V2, por ejemplo:

Atajo de teclado para iniciar/detener.
Sonido cuando se ejecuta una acción.
Contador de acciones realizadas.
Pausar/reanudar.
Múltiples zonas.
Diferentes intervalos para diferentes acciones.
Historial.
Perfiles de configuración.
Otras mejoras útiles.

Pero primero quiero que construyas una V1 funcional, sencilla y estable.

Antes de escribir el código, analiza las limitaciones reales de Chrome Manifest V3 para hacer clicks y enviar teclas automáticamente. Si alguna función no puede implementarse exactamente como la describo debido a las restricciones de Chrome, indícalo y propón la alternativa técnicamente correcta en lugar de inventar una API.