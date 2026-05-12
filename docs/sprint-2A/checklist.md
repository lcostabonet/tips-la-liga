# Sprint 2A Checklist: Prototipo "Dar Propina"

## Estado general
- [ ] Sprint iniciado
- [ ] Código listo para revisión
- [ ] Revisión completada
- [ ] Sprint aprobado

---

## Estructura y navegación
- [ ] Pestaña "Dar propina" visible en la nav principal
- [ ] La pestaña activa su sección sin romper las demás vistas
- [ ] El botón de volver a la lista funciona correctamente

## Lista de conductores
- [ ] Se renderizan al menos 3 conductores de ejemplo
- [ ] Cada tarjeta muestra emoji, nombre y bio
- [ ] El botón "Seleccionar" funciona y muestra la vista de pago
- [ ] Las tarjetas son accesibles y tienen buen contraste

## Vista de pago
- [ ] Se muestra el nombre y emoji del conductor seleccionado
- [ ] El QR ficticio aparece y es visible (imagen de `api.qrserver.com`)
- [ ] El QR no contiene datos reales ni secrets
- [ ] Chips de importe (1€, 2€, 5€) funcionan y se marcan al seleccionar
- [ ] El input de importe libre acepta valores y actualiza el botón
- [ ] El botón "Pagar" muestra el importe seleccionado
- [ ] El botón "Pagar" está desactivado si no hay importe
- [ ] El aviso "Modo demo" es visible y claro

## Feedback simulado
- [ ] Al pulsar "Pagar" el botón cambia a estado "Procesando..."
- [ ] Después del timeout aparece el mensaje de confirmación
- [ ] El mensaje incluye importe y nombre del conductor
- [ ] El botón "Dar otra propina" vuelve a la lista de conductores

## Diseño móvil
- [ ] La interfaz es usable en 375px (iPhone SE)
- [ ] La interfaz es usable en 390px (iPhone 14)
- [ ] Los botones tienen al menos 44px de alto
- [ ] El QR es legible en pantallas pequeñas
- [ ] No hay overflow horizontal en ninguna vista

## Código y seguridad
- [ ] No hay `STRIPE_SECRET_KEY` ni ninguna key secreta en el código
- [ ] No hay `SUPABASE_SERVICE_ROLE_KEY` en el código
- [ ] No se realizan llamadas a Edge Functions
- [ ] No se modifican tablas ni RLS de Supabase
- [ ] Los datos de conductores son hardcodeados (no vienen de Supabase)
- [ ] No se añaden dependencias nuevas sin justificación

## Compatibilidad con código existente
- [ ] Las vistas de login, ranking e historial siguen funcionando
- [ ] El CSS nuevo no rompe estilos globales existentes
- [ ] La lógica JS nueva no interfiere con eventos existentes

## Revisión final
- [ ] Probado en Chrome (escritorio y modo responsive)
- [ ] Probado en Safari móvil (o simulador iOS)
- [ ] Sin errores en consola del navegador
- [ ] El aviso "Modo demo" es visible en todas las resoluciones probadas
- [ ] Documentación actualizada si hubo cambios respecto al plan
