# Sprint 3D Database Plan: driver_payment_methods

## Nueva tabla `driver_payment_methods`

```sql
-- ============================================================
-- Sprint 3D: Múltiples métodos de pago externos por conductor
-- ============================================================

create table if not exists public.driver_payment_methods (
  id            uuid        primary key default gen_random_uuid(),
  driver_id     uuid        not null references auth.users(id) on delete cascade,
  provider      text        not null,
  payment_url   text        not null,
  instructions  text,
  is_active     boolean     not null default true,
  display_order smallint    not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

### Índice

```sql
create index if not exists driver_payment_methods_driver_id_idx
  on public.driver_payment_methods(driver_id);
```

### Trigger `updated_at`

```sql
drop trigger if exists driver_payment_methods_set_updated_at
  on public.driver_payment_methods;
create trigger driver_payment_methods_set_updated_at
  before update on public.driver_payment_methods
  for each row execute function public.set_updated_at();
```

Reutiliza `set_updated_at()` ya existente en `supabase.sql`.

---

## Constraints

### Unicidad: un método por proveedor por conductor

```sql
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'uq_driver_payment_method_provider'
      and conrelid = 'public.driver_payment_methods'::regclass
  ) then
    alter table public.driver_payment_methods
      add constraint uq_driver_payment_method_provider
      unique (driver_id, provider);
  end if;
end;
$$;
```

Un conductor puede tener un único método por proveedor. Si en el futuro se necesita más de uno (ej. dos cuentas PayPal), se elimina esta restricción.

### Validación de dominios por proveedor

```sql
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'dpm_url_valid'
      and conrelid = 'public.driver_payment_methods'::regclass
  ) then
    alter table public.driver_payment_methods
      add constraint dpm_url_valid
      check (
        (provider = 'paypal' and (
          payment_url like 'https://paypal.me/%'
          or payment_url like 'https://www.paypal.me/%'
          or payment_url like 'https://paypal.com/%'
          or payment_url like 'https://www.paypal.com/%'
        ))
        or
        (provider = 'revolut' and (
          payment_url like 'https://revolut.me/%'
          or payment_url like 'https://app.revolut.com/%'
        ))
        or
        (provider not in ('paypal', 'revolut'))
      );
  end if;
end;
$$;
```

La última cláusula `provider not in ('paypal', 'revolut')` permite proveedores futuros sin restricción de dominio hasta que se defina su constraint.

---

## RLS: `driver_payment_methods`

```sql
alter table public.driver_payment_methods enable row level security;

-- Conductor: leer sus propios métodos
drop policy if exists "dpm_conductor_read_own" on public.driver_payment_methods;
create policy "dpm_conductor_read_own"
  on public.driver_payment_methods
  for select to authenticated
  using (driver_id = auth.uid());

-- Conductor: crear sus propios métodos
drop policy if exists "dpm_conductor_insert_own" on public.driver_payment_methods;
create policy "dpm_conductor_insert_own"
  on public.driver_payment_methods
  for insert to authenticated
  with check (driver_id = auth.uid());

-- Conductor: actualizar sus propios métodos
drop policy if exists "dpm_conductor_update_own" on public.driver_payment_methods;
create policy "dpm_conductor_update_own"
  on public.driver_payment_methods
  for update to authenticated
  using  (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- Conductor: eliminar sus propios métodos
drop policy if exists "dpm_conductor_delete_own" on public.driver_payment_methods;
create policy "dpm_conductor_delete_own"
  on public.driver_payment_methods
  for delete to authenticated
  using (driver_id = auth.uid());

-- Admin: acceso total
drop policy if exists "dpm_admin_all" on public.driver_payment_methods;
create policy "dpm_admin_all"
  on public.driver_payment_methods
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Grants
grant select, insert, update, delete on public.driver_payment_methods to authenticated;
```

**Sin política para `anon`:** los métodos de pago se exponen solo a través de la vista `public_driver_profiles` (donde `anon` tiene SELECT). Los registros individuales en la tabla base solo son accesibles para el conductor propietario y el admin.

---

## Vista `public_driver_profiles` actualizada

Añade la columna `payment_methods` con el array JSON de métodos activos del conductor.

```sql
drop view if exists public.public_driver_profiles;
create view public.public_driver_profiles
  with (security_invoker = false)
as
  select
    dpp.id,
    dpp.display_name,
    dpp.vehicle_info,
    dpp.route_info,
    dpp.tip_link_slug,
    dpp.public_url,
    dpp.is_active,
    dpp.is_visible,
    -- Columnas legacy Sprint 3A (compatibilidad hasta Sprint 3E)
    dpp.payment_provider,
    dpp.payment_url,
    dpp.payment_instructions,
    -- Nuevos métodos Sprint 3D
    (
      select json_agg(
        json_build_object(
          'provider',    m.provider,
          'payment_url', m.payment_url,
          'instructions', m.instructions,
          'display_order', m.display_order
        )
        order by m.display_order, m.created_at
      )
      from public.driver_payment_methods m
      where m.driver_id = dpp.driver_id
        and m.is_active = true
    ) as payment_methods
  from public.driver_payment_profiles dpp
  where dpp.is_active = true
    and dpp.is_visible = true;

grant select on public.public_driver_profiles to anon;
grant select on public.public_driver_profiles to authenticated;
```

### Por qué `json_agg` en la vista

- Una sola query de Supabase devuelve el conductor con sus métodos ya incluidos — sin N+1.
- El frontend recibe `driver.payment_methods` como un array de objetos JavaScript (Supabase deserializa JSON automáticamente).
- Si el conductor no tiene métodos en la nueva tabla, `json_agg` devuelve `null` — la app cae en el flujo legacy.

---

## Decisiones de diseño

### ¿Por qué `unique (driver_id, provider)` y no permitir varios PayPal?
Sprint 3D soporta uno por proveedor. La restricción es idempotente y puede eliminarse en Sprint 3E si surge la necesidad. Mejor simple y extendible que complejo desde el inicio.

### ¿Por qué mantener las columnas legacy en `driver_payment_profiles`?
Eliminar columnas en una tabla con datos de producción requiere una migración cuidadosa y un sprint dedicado. En Sprint 3D, las columnas legacy se vacían progresivamente (migración de datos) pero no se eliminan. Sprint 3E hará el `ALTER TABLE ... DROP COLUMN`.

### ¿Por qué `security_invoker = false` en la vista?
Consistente con la vista existente. La vista corre como `postgres`, bypassando RLS. El filtro `WHERE` y la lista de columnas son la barrera de seguridad. `driver_id` y `stripe_account_id` nunca se exponen.

### ¿`provider not in ('paypal', 'revolut')` en el constraint?
Permite insertar proveedores futuros (bizum, transferencia) sin modificar el constraint. Cuando se añada Bizum en Sprint 3E, se actualizará el constraint para incluir sus dominios.
