ssd

## Arreglo batería - Software/Firmware

Perfecto, entonces te ahorro las advertencias básicas de seguridad que ya conocés de sobra.

Dado que ya vas a retirar la batería, del lado de software/firmware esto es lo que te puede servir:

**Reset de SMC después de retirar la batería:** mantené el botón de encendido presionado ~10 segundos sin batería y sin cargador conectado. Luego conectá el MagSafe y encendé normalmente.

Los drivers pendientes que vimos antes (gráfica, cámara FaceTime, audio) — una vez que la máquina esté estable sin batería, te recomiendo instalar el Boot Camp Support Software correspondiente a MacBookPro8,3 para resolver esos 3 dispositivos con error (código 31, 28 y 22).

Si querés, puedo dejarte armado el instalador o buscar el link directo de Apple para esa versión de Boot Camp mientras hacés el trabajo físico.

## ¿Encenderá sin batería?

Sí, debería encender sin problema, conectada al cargador MagSafe.

Basado en lo que vimos:

- Es un MacBookPro8,3 (2011), que no requiere batería presente para arrancar (a diferencia de los modelos con chip T2 o Apple Silicon).
- La batería ya está al 0% y aparentemente es la causa de los apagones intermitentes.
- No hay eventos de fallo crítico de hardware en el log que sugieran otro problema (placa, RAM, etc.).

Una vez que la saques:

1. Reset de SMC (sin batería, sin cargador, botón de encendido 10 seg).
2. Conectá el MagSafe.
3. Encendé normal.

El único punto a verificar de tu lado como técnico: que el cargador y el cable MagSafe estén en buen estado, porque si además hay un falso contacto ahí, seguiría apagándose aunque ya no tenga batería puesta — en ese caso el problema ya no sería la batería sino el cable/conector.

## Ficha técnica completa

### Equipo

- Apple MacBook Pro 8,3 (línea "Early 2011")
- N.º de serie: C02FC5NLDF92
- Placa base: Mac-942459F5819B171B (serie: C02112601J1DM5QAP)
- Firmware/BIOS: versión 87.0.0.0.0

### Procesador

- Intel Core i7-2720QM @ 2.20 GHz
- 4 núcleos físicos / 8 hilos (Hyper-Threading)
- Caché L2: 256 KB, L3: 6 MB

### Memoria RAM

- 8 GB (1 módulo de 8 GB, BANK 0) a 1333 MHz

### Almacenamiento

- SSD Kingston SA400S37240G — 223.57 GB (~240 GB nominal), interfaz IDE/SATA

### Gráficos

- Detectado como "Adaptador de pantalla básico de Microsoft" (resolución 1920×1200) — recordá que esto es porque falta el driver real de la Intel HD 3000 / AMD Radeon (según config), que instalarás con Boot Camp.

### Red

- Ethernet: Broadcom NetXtreme Gigabit (MAC 70:CD:60:F1:62:4E)
- WiFi: Broadcom 802.11n (MAC E0:F8:47:1B:B5:50)

### Batería

- Presente pero al 0% de carga (candidata a ser retirada, como hablamos)

### Sistema operativo

- Windows 10 Enterprise LTSC, 64 bits, build 17763
- Instalado el 08/06/2026