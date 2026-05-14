# Sprint 3D Migration Plan: payment_provider → driver_payment_methods

## Objetivo
Copiar los datos de pago actuales (columnas planas de Sprint 3A) a la nueva tabla `driver_payment_methods`, sin eliminar las columnas legacy hasta Sprint 3E.

---

## Orden de ejecución en el SQL Editor de Supabase

Los siguientes bloques deben ejecutarse **en este orden** después de crear la tabla `driver_payment_methods` y sus constraints.

---

### Paso 1 — Copiar datos existentes

```sql
insert into public.driver_payment_methods
  (driver_id, provider, payment_url, instructions, is_active, display_order)
select
  dpp.driver_id,
  dpp.payment_provider,
  dpp.payment_url,
  dpp.payment_instructions,
  true,
  0
from public.driver_payment_profiles dpp
where dpp.payment_provider is not null
  and dpp.payment_url      is not null
on conflict (driver_id, provider) do nothing;
```

**`ON CONFLICT DO NOTHING`:** si un método ya fue insertado manualmente (ej. en pruebas), no falla ni sobreescribe.

**Requisito previo:** el constraint `dpm_url_valid` debe existir **antes** de ejecutar este INSERT. Los datos actuales ya cumplieron el constraint `payment_url_provider_match` de Sprint 3A, por lo que la validación no debería fallar para registros PayPal. Si hubiera un registro con provider distinto de PayPal con URL no válida para ese proveedor, el INSERT fallaría — en ese caso limpiar manualmente la fila problemática antes de migrar.

---

### Paso 2 — Verificar la migración

```sql
-- Cuántos métodos se migraron
select count(*) from public.driver_payment_methods;

-- Verificar que todos los conductores con payment_url tienen su método migrado
select
  dpp.display_name,
  dpp.payment_provider,
  dpp.payment_url,
  dpm.provider as migrated_provider,
  dpm.payment_url as migrated_url
from public.driver_payment_profiles dpp
left join public.driver_payment_methods dpm
  on dpm.driver_id = dpp.driver_id
  and dpm.provider = dpp.payment_provider
where dpp.payment_provider is not null
  and dpp.payment_url is not null;
```

Verificar que todas las filas tienen `migrated_url` no nulo (migración completa).

---

### Paso 3 — Vaciar columnas legacy (opcional en Sprint 3D)

Este paso es **opcional** en Sprint 3D. Se recomienda ejecutarlo una vez verificada la migración y actualizado el frontend para usar la nueva tabla.

```sql
-- Solo ejecutar tras confirmar que el frontend ya usa driver_payment_methods
update public.driver_payment_profiles
set
  payment_provider     = null,
  payment_url          = null,
  payment_instructions = null
where payment_provider is not null
   or payment_url      is not null;
```

**Precaución:** no ejecutar este paso hasta que el frontend esté desplegado y probado con la nueva tabla. Si se vacían las columnas legacy antes, los conductores con el frontend antiguo perderán su configuración de pago en "Dar propina".

La eliminación de las columnas (DROP COLUMN) se planifica para Sprint 3E.

---

## Compatibilidad regresiva durante la transición

Durante el período entre la migración de la DB y el despliegue del frontend:

| Estado del sistema | Comportamiento |
|---|---|
| DB migrada, frontend antiguo desplegado | Frontend lee `payment_url` legacy → pago sigue funcionando |
| DB migrada, frontend nuevo desplegado | Frontend lee `payment_methods` → nuevo flujo multi-método |
| Columnas legacy vaciadas, frontend nuevo | Solo funciona el nuevo flujo — sin regresión si frontend nuevo está activo |

La clave es: **no vaciar columnas legacy hasta que el frontend nuevo esté en producción y verificado.**

---

## Rollback

Si la migración tiene problemas:

```sql
-- Eliminar todos los métodos del Sprint 3D (solo si es necesario)
delete from public.driver_payment_methods;

-- Las columnas legacy en driver_payment_profiles no fueron modificadas
-- → el frontend antiguo sigue funcionando sin cambios
```

La tabla `driver_payment_methods` puede eliminarse de forma segura si la migración se aborta, ya que las columnas legacy en `driver_payment_profiles` no se tocan hasta el Paso 3.
