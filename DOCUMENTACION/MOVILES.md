# Compatibilidad móvil revisada

Esta actualización incluye los cambios de contraseña y de compatibilidad móvil.
Se deben actualizar frontend y backend juntos, siguiendo LEER_PRIMERO.txt.

## Cambios incluidos

- Menú con controles táctiles, cierre al navegar, al tocar fuera y con Escape.
- Menú desplazable en pantallas horizontales de poca altura.
- Estilos del menú público limitados a ese menú; no interfieren con el admin.
- Campos de al menos 16 px en móvil, botones táctiles y espacios para zonas seguras.
- Viewport adaptable sin bloquear el zoom del usuario.
- Registro con confirmación, ocho caracteres, mayúscula y número, validado también
  en el servidor. Mostrar/ocultar actúa sobre ambas contraseñas.
- Selección de fotos desde cámara/galería nativas. Las fotos se procesan una a una
  para reducir memoria. Errores de formato/tamaño se muestran en pantalla.
- Solicitudes de servicios y repuestos: después de guardarlas aparece un botón
  Continuar en WhatsApp. Su apertura parte de un toque, sin depender de una ventana
  automática después de una petición de red.
- Avisos de error al generar/copiar referidos. No se muestra “Copiado” si la copia falla.
- El canje disponible permite solicitar coordinación por WhatsApp; no simula
  descuentos automáticos. Un beneficio marcado no disponible muestra Próximamente.
- La última compra se calcula con el historial real disponible; se retiró una
  fecha y un servicio de ejemplo que antes aparecían fijos en la cuenta.
- Retirado un modal de demostración sin acceso desde la interfaz.

## Pruebas automatizadas

Se utilizaron dos motores: Chromium y WebKit en Linux, con emulación táctil de
Pixel 7, iPhone SE, iPhone 13, pantalla de 320 px e iPad Mini, más orientación
horizontal de 667 × 320 px. Los registros están en verificacion/mobile-*.txt.
La prueba de WebKit ejercita el motor usado por Safari, pero no es Safari instalado
en un iPhone físico ni constituye una comprobación de todas las versiones de iOS.
Los perfiles de iPhone en Chromium prueban diseño/interacción, no el motor Safari.

Casos: abrir menú, navegar y cerrarlo, tocar fuera, desplazamiento horizontal,
visibilidad y validación de contraseñas, tamaño de campos, formularios de servicios
/repuestos, URL de continuación a WhatsApp, portal staff, búsqueda de cliente,
recepción y conversión de una imagen a JPEG. La API se simuló y no se crearon
registros reales. También se verificó la confirmación pública de contraseña en
WebKit; los requisitos se rechazaron o aceptaron según correspondía.

## Prueba final en teléfonos reales

Después del despliegue HTTPS, probar en Chrome Android y Safari iPhone:

1. Registro, confirmación y login de un cliente de prueba.
2. Menú, orientación vertical/horizontal y teclado abierto sin campos inaccesibles.
3. Staff: Tomar foto y Elegir de galería; otorgar permiso si el teléfono lo pide.
4. Recibir un vehículo y ver fotos/actualizaciones desde la cuenta del cliente.
5. Servicios/repuestos y botón Continuar en WhatsApp; comprobar la apertura de la
   aplicación instalada y, cuando no exista, la alternativa que ofrezca WhatsApp.

La cámara física, el teclado del sistema, el autofill del llavero, archivos HEIC
concretos y la apertura de la app WhatsApp no se certifican por emulación. Si una
foto no se puede decodificar, la interfaz pide usar JPG o PNG. La entrega no modifica
los permisos del teléfono y no garantiza compatibilidad con navegadores antiguos.

Referencias de implementación:
- https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- https://webkit.org/blog/5610/more-responsive-tapping-on-ios/

Resultado de la matriz final: cinco perfiles aprobados en Chromium y cinco en
WebKit. Una ejecución compartida anterior agotó la espera de recepción en 320 px;
el caso aislado y la repetición final con procesos independientes aprobaron.
No se interpreta esa repetición como prueba de cámara física ni de producción.
