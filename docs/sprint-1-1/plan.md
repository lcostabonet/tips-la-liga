# Sprint 1.1 Plan

## 1. Objetivo del sprint
Validar end-to-end con Supabase real: comprobar registro, login, añadir propina, editar propina, borrar propina, ranking mensual, ranking global, conversión USD/EUR y permisos reales con usuarios de prueba.

## 2. Tareas priorizadas
1. Configurar entorno de prueba con Supabase activo y datos de prueba.
2. Crear usuarios de prueba (al menos 2-3) para validar permisos.
3. Probar flujo completo de registro y login con cuentas reales.
4. Añadir propinas en EUR y USD, verificar conversión automática.
5. Editar y borrar propinas propias, intentar editar/borrar ajenas.
6. Verificar rankings mensual y global con datos reales.
7. Probar exportación CSV del mes.
8. Documentar resultados y confirmar estabilidad antes de despliegue.

## 3. Archivos afectados probables
- `index.html` (para pruebas en navegador)
- `app.js` (lógica de auth y CRUD)
- `supabase.sql` (políticas RLS)
- `docs/sprint-1-1/plan.md`
- `docs/sprint-1-1/checklist-e2e.md`
- `docs/sprint-1-1/handoff-qa.md`

## 4. Riesgos
- Fallos en la API externa de cambio USD/EUR que rompan la conversión.
- Políticas RLS mal configuradas que permitan acceso indebido.
- Problemas de red o configuración de Supabase que impidan auth.
- Datos de prueba que queden en la base de datos de producción.
- Experiencia móvil no validada con datos reales.

## 5. Criterios de aceptación
- Flujo completo de registro → login → añadir propina → editar/borrar → ver rankings funciona.
- Permisos respetados: solo editar/borrar propias propinas.
- Conversión USD/EUR correcta y mostrada.
- Rankings mensual y global actualizados correctamente.
- No hay errores críticos en consola o UI.
- Documentación de pruebas y resultados completada.

## 6. Checklist de pruebas
- [ ] Configurar Supabase con datos de prueba.
- [ ] Crear usuarios de prueba (Usuario A, Usuario B, Admin).
- [ ] Registro y login exitosos.
- [ ] Añadir propina en EUR.
- [ ] Añadir propina en USD y verificar conversión.
- [ ] Editar propina propia.
- [ ] Borrar propina propia.
- [ ] Intentar editar/borrar propina ajena (debe fallar).
- [ ] Ver ranking mensual actualizado.
- [ ] Ver ranking global actualizado.
- [ ] Exportar CSV del mes.
- [ ] Probar en móvil con datos reales.

## 7. Qué NO debe tocar el equipo de desarrollo
- No cambiar código fuente; solo pruebas y documentación.
- No commitear datos sensibles o claves de prueba.
- No modificar políticas RLS sin aprobación.
- No añadir usuarios reales o datos de producción.
- No hacer push sin confirmación.

## 8. Recomendaciones para QA
- Usar un proyecto Supabase de prueba separado para evitar contaminar producción.
- Crear usuarios temporales y limpiar después de pruebas.
- Documentar cada paso con screenshots o logs si es posible.
- Probar tanto en desktop como móvil.
- Reportar cualquier error de red, auth o permisos inmediatamente.
