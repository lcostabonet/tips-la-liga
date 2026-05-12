# Sprint 1.1 Checklist E2E

## Configuración inicial
- [ ] Proyecto Supabase de prueba configurado con `supabase.sql` ejecutado.
- [ ] `SUPABASE_URL` y `anon` key actualizadas en `app.js` para entorno de prueba.
- [ ] Usuarios de prueba creados:
  - Usuario A: email `testa@example.com`, nombre `Test A`
  - Usuario B: email `testb@example.com`, nombre `Test B`
  - Admin: email `lluis15basket@hotmail.es` (si aplica)

## Pruebas de autenticación
- [ ] Registro de nuevo usuario funciona (email único, nombre público).
- [ ] Login con email/contraseña funciona.
- [ ] Logout funciona y redirige a auth.
- [ ] Sesión persiste al recargar página.

## Pruebas de gestión de propinas
- [ ] Añadir propina en EUR (ej. 10.50 EUR) funciona y se guarda.
- [ ] Añadir propina en USD (ej. 10.00 USD) funciona, se convierte a EUR y se guarda.
- [ ] Conversión USD/EUR es correcta (usando API externa).
- [ ] Editar propina propia (cambiar cantidad, moneda, comentario) funciona.
- [ ] Borrar propina propia funciona con confirmación.
- [ ] Intentar editar propina de Usuario B desde Usuario A falla con mensaje de error.
- [ ] Intentar borrar propina de Usuario B desde Usuario A falla con mensaje de error.

## Pruebas de rankings
- [ ] Ranking mensual muestra propinas del mes actual correctamente.
- [ ] Ranking global muestra todas las propinas correctamente.
- [ ] Rankings se actualizan en tiempo real tras añadir/editar/borrar.
- [ ] Historial diario del mes se muestra correctamente.
- [ ] Seleccionar otro mes actualiza rankings y historial.

## Pruebas adicionales
- [ ] Exportar CSV del mes funciona y contiene datos correctos.
- [ ] Mensajes de error se muestran para operaciones fallidas (ej. red, permisos).
- [ ] UI es responsiva en móvil (pantallas pequeñas).
- [ ] No hay errores en consola del navegador.
- [ ] Configuración de Supabase no expone claves secretas.

## Limpieza
- [ ] Datos de prueba eliminados de Supabase.
- [ ] Usuarios de prueba eliminados.
- [ ] Configuración revertida a valores seguros.

## Resultados
- [ ] Todos los checks pasan: Sprint 1.1 aprobado.
- [ ] Algunos fallan: Documentar bugs y recomendar fixes.
- [ ] Fallos críticos: No aprobar hasta resolver.
