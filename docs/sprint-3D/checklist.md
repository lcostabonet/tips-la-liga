# Sprint 3D Checklist: Múltiples métodos de pago externos

## Estado general
- [ ] Sprint iniciado
- [ ] Código implementado
- [ ] Revisión QA completada
- [ ] Sprint aprobado

---

## Base de datos

- [ ] Tabla `driver_payment_methods` creada (`supabase.sql` Sprint 3D)
- [ ] Índice en `driver_id`
- [ ] Trigger `updated_at` aplicado
- [ ] Constraint `uq_driver_payment_method_provider` idempotente
- [ ] Constraint `dpm_url_valid` con dominios PayPal y Revolut
- [ ] RLS activado en `driver_payment_methods`
- [ ] Políticas `dpm_conductor_*` (read, insert, update, delete) creadas
- [ ] Política `dpm_admin_all` creada
- [ ] Grant `authenticated` sobre la tabla

## Vista `public_driver_profiles`

- [ ] Vista recreada con columna `payment_methods` (json_agg)
- [ ] `payment_methods` incluye `provider`, `payment_url`, `instructions`, `display_order`
- [ ] `payment_methods` ordena por `display_order`, luego `created_at`
- [ ] Si conductor sin métodos: `payment_methods = null` (no error)
- [ ] Columnas legacy (`payment_provider/url/instructions`) siguen presentes
- [ ] Grants `anon` y `authenticated` re-concedidos

## Migración de datos

- [ ] Datos de Sprint 3A copiados a `driver_payment_methods` (Paso 1 migration-plan)
- [ ] Verificación: todos los conductores con `payment_url` tienen su método migrado
- [ ] Columnas legacy vaciadas (Paso 3) — solo tras verificar frontend desplegado

## Validación de dominios

- [ ] `VALID_PAYPAL_DOMAINS` eliminado
- [ ] `VALID_PAYMENT_DOMAINS` añadido con `paypal` y `revolut`
- [ ] `isValidPaymentUrl(provider, url)` actualizada para usar el mapa
- [ ] PayPal: `https://paypal.me/`, `https://www.paypal.me/`, `https://paypal.com/`, `https://www.paypal.com/`
- [ ] Revolut: `https://revolut.me/`, `https://app.revolut.com/`
- [ ] Proveedores desconocidos: devuelve `true` (sin restricción)
- [ ] `saveEditDriver()` sigue funcionando sin cambios (misma firma)
- [ ] `saveDriverSelfProfile()` sigue funcionando sin cambios

## "Dar propina" — flujo multi-método

- [ ] `loadPublicDrivers()` incluye `payment_methods` en el SELECT
- [ ] `renderDriverList()` propaga `payment_methods` en `normalized`
- [ ] `showDriverPayView()` detecta `payment_methods` (array no vacío)
- [ ] QR inicializado con el primer método (`display_order ASC`)
- [ ] Botón "Pagar con PayPal →" visible (azul)
- [ ] Botón "Pagar con Revolut →" visible (violeta)
- [ ] Pulsar botón: actualiza QR + abre URL en nueva pestaña
- [ ] `payment-methods-list` sustituye al `external-pay-btn` del Sprint 3A
- [ ] Si `payment_methods` null/vacío Y `payment_url` existe: flujo legacy Sprint 3A
- [ ] Si ambos vacíos: aviso "Sin método configurado"
- [ ] MOCK_DRIVERS no usan pago externo (`isMock: true`)

## Panel admin — gestión de métodos

- [ ] Botón "Métodos de pago" en tarjeta de conductor
- [ ] `#driverMethodsSection` en `index.html`
- [ ] `showDriverMethodsSection()` carga y renderiza lista de métodos
- [ ] `renderMethodList()` muestra provider, URL y estado por método
- [ ] Botón "Editar" abre `showMethodForm()` con datos prellenados
- [ ] Botón "Eliminar" pide confirmación y llama `deleteDriverMethod()`
- [ ] Botón "+ Añadir método" abre `showMethodForm()` en modo creación
- [ ] `showMethodForm()` incluye selector proveedor, URL, preview, instrucciones, toggle activo
- [ ] Guardar método nuevo llama `insertDriverMethod()`
- [ ] Guardar edición llama `updateDriverMethod()`
- [ ] Toast de confirmación tras operación
- [ ] Formulario de método reutiliza clases Sprint 3B (validación, QR preview, badge)

## "Mi enlace" — gestión de métodos propios

- [ ] `showDriverSelfSection()` renderiza lista de métodos del conductor
- [ ] `loadSelfMethods()` usa `driver_payment_methods` (no más campos planos)
- [ ] Botón "Editar" y "Eliminar" funcionan para métodos propios
- [ ] Botón "+ Añadir método" disponible
- [ ] Guard `if (!currentUser) return` en todas las funciones de escritura
- [ ] Disclaimer visible: "Tips La Liga no procesa pagos..."

## Seguridad

- [ ] `deleteDriverMethod()`: solo elimina por `id` — sin filtro de `driver_id` en cliente, pero RLS lo protege
- [ ] `updateDriverMethod()`: RLS `dpm_conductor_update_own` impide modificar métodos ajenos
- [ ] Sin PayPal API, sin Revolut API, sin claves secretas
- [ ] `methodFormPreviewTimer` independiente de `qrPreviewTimer` y `selfQrPreviewTimer`
- [ ] `escapeHtml()` aplicado en todos los `innerHTML` con datos de DB

## CSS

- [ ] `.payment-methods-list` vertical, gap 10px
- [ ] `.payment-method-btn.paypal` azul `#009cde`
- [ ] `.payment-method-btn.revolut` violeta `#7c3aed`
- [ ] `.method-list-item` en panel admin / "Mi enlace"
- [ ] `.method-actions` con botones compactos

## Sin regresiones

- [ ] Conductores existentes con `payment_url` legacy siguen recibiendo propinas
- [ ] Panel admin (Onboarding, Refresh, Test 1€) sigue funcionando
- [ ] Login, registro, rankings, propinas funcionan
- [ ] Stripe Connect aparcado, sin modificar
- [ ] `supabase.sql` — solo bloques Sprint 3D añadidos al final

## Documentación

- [ ] `docs/sprint-3D/plan.md` entregado
- [ ] `docs/sprint-3D/database-plan.md` entregado
- [ ] `docs/sprint-3D/frontend-plan.md` entregado
- [ ] `docs/sprint-3D/migration-plan.md` entregado
- [ ] `docs/sprint-3D/handoff-dev.md` entregado
- [ ] `docs/sprint-3D/checklist.md` entregado (este archivo)
- [ ] `docs/sprint-3D/qa-plan.md` entregado
- [ ] `docs/sprint-3D/dev-summary.md` creado tras implementación
