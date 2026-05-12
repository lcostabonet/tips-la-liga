# Sprint 1 Checklist

## Validación funcional
- [ ] Iniciar sesión con email y contraseña.
- [ ] Registro de usuario con nombre público.
- [ ] Crear propina en EUR.
- [ ] Crear propina en USD y verificar conversión a EUR.
- [ ] Editar propina propia.
- [ ] Borrar propina propia.
- [ ] Ver ranking mensual actualizado.
- [ ] Ver ranking global actualizado.
- [ ] Ver historial diario del mes.
- [ ] Seleccionar otro mes y actualizar datos.

## Seguridad y permisos
- [ ] Revisar `app.js` para asegurarse de que no hay claves secretas.
- [ ] Confirmar que solo `SUPABASE_URL` y `anon` key se usan en frontend.
- [ ] Validar que no hay `service_role`, connection string privada ni tokens secretos en el repo.
- [ ] Revisar las reglas RLS de Supabase para `tips` y `profiles`.
- [ ] Confirmar que un usuario no puede editar/borrar propinas ajenas.

## Experiencia móvil
- [ ] Probar el sitio en móvil real o emulador.
- [ ] Verificar que los formularios se adaptan correctamente.
- [ ] Asegurar que los botones son accesibles y legibles.
- [ ] Confirmar que no hay contenido recortado o superpuesto.

## Manejo de errores
- [ ] Simular error de API de cambio USD/EUR y revisar mensaje de error.
- [ ] Simular error de red en Supabase y revisar mensaje de error.
- [ ] Verificar que no se rompa la interfaz ante errores.

## Documentación y entrega
- [ ] Actualizar `docs/sprint-1/plan.md` con los hallazgos.
- [ ] Entregar `docs/sprint-1/handoff-dev.md` con las correcciones realizadas.
- [ ] Completar `docs/sprint-1/checklist.md` con estado final.
- [ ] Confirmar que no se hicieron cambios de código fuera del alcance del sprint.
