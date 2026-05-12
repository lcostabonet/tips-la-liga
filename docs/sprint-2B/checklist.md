# Sprint 2B Checklist: Base de datos para perfiles de conductores

## Estado general
- [ ] Sprint iniciado
- [ ] SQL ejecutado en Supabase
- [ ] Revisión QA completada
- [ ] Sprint aprobado

---

## Tabla `driver_payment_profiles`
- [ ] Tabla creada sin errores en Supabase SQL Editor
- [ ] Columna `driver_id` con referencia a `auth.users(id)` y `on delete cascade`
- [ ] Columna `tip_link_slug` con constraint `unique`
- [ ] Columna `stripe_account_id` presente pero no expuesta en la vista
- [ ] Columnas `is_active` e `is_visible` con default `true`
- [ ] Columna `stripe_status` con default `'not_connected'`

## Vista pública `public_driver_profiles`
- [ ] Vista creada con `security_invoker = false`
- [ ] La vista solo incluye: `id`, `display_name`, `vehicle_info`, `route_info`, `tip_link_slug`, `public_url`, `is_active`, `is_visible`
- [ ] La vista excluye `stripe_account_id`, `driver_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`
- [ ] La vista filtra `is_active = true AND is_visible = true`
- [ ] Permiso `SELECT` concedido a roles `anon` y `authenticated`

## RLS y políticas
- [ ] RLS habilitado en `driver_payment_profiles`
- [ ] Función `public.is_admin()` creada
- [ ] Política `conductor_read_own` activa (SELECT, driver_id = auth.uid())
- [ ] Política `conductor_insert_own` activa (INSERT, with check)
- [ ] Política `conductor_update_own` activa (UPDATE, using + with check)
- [ ] Política `admin_read_all` activa (SELECT, is_admin())
- [ ] Política `admin_update_all` activa (UPDATE, is_admin())
- [ ] Política `admin_delete_all` activa (DELETE, is_admin())

## Datos de prueba
- [ ] Al menos 3 conductores insertados con `is_visible = true`
- [ ] Al menos 1 conductor insertado con `is_visible = false` (para probar filtro)
- [ ] `tip_link_slug` únicos y coherentes con los slugs de `MOCK_DRIVERS`

## Verificación de seguridad
- [ ] `select * from public.public_driver_profiles` devuelve solo columnas seguras
- [ ] `select stripe_account_id from public.public_driver_profiles` falla (columna no existe)
- [ ] Usuario anónimo puede leer la vista (verificar con rol `anon` en Supabase)
- [ ] Usuario anónimo NO puede leer la tabla directamente (RLS violation)
- [ ] Conductor solo lee su propio registro en la tabla
- [ ] Admin puede leer todos los registros

## Integridad del frontend
- [ ] `app.js` no modificado
- [ ] `index.html` no modificado
- [ ] `style.css` no modificado
- [ ] Sin claves secretas nuevas añadidas al código

## Documentación
- [ ] `docs/sprint-2B/plan.md` entregado
- [ ] `docs/sprint-2B/handoff-dev.md` entregado
- [ ] `docs/sprint-2B/checklist.md` entregado (este archivo)
- [ ] `docs/sprint-2B/rls-plan.md` entregado
