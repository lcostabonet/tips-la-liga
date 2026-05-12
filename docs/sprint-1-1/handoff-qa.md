# Sprint 1.1 Handoff QA

## Propósito
Entregar a QA una guía para ejecutar pruebas end-to-end con Supabase real, validando el flujo completo de usuarios y permisos.

## Estado actual
- Sprint 1 completado con mejoras de seguridad y accesibilidad.
- Código commiteado, listo para pruebas con backend activo.
- Falta validación real de auth, CRUD y rankings con datos de Supabase.

## Prioridades de QA
1. Configurar entorno de prueba con Supabase.
2. Crear usuarios de prueba y datos iniciales.
3. Ejecutar flujo completo: registro → login → operaciones CRUD → rankings.
4. Verificar permisos y seguridad.
5. Probar en móvil y documentar resultados.

## Requisitos de entorno
- Proyecto Supabase de prueba (no producción).
- Ejecutar `supabase.sql` en el proyecto de prueba.
- Actualizar `app.js` con `SUPABASE_URL` y `anon` key del proyecto de prueba.
- Usar navegador moderno (Chrome/Firefox) para pruebas.

## Usuarios de prueba recomendados
- Usuario A: email `testa@example.com`, nombre `Test A`
- Usuario B: email `testb@example.com`, nombre `Test B`
- Admin: email `lluis15basket@hotmail.es` (para permisos especiales)

## Flujo de pruebas
1. Registro y login de usuarios.
2. Añadir propinas en EUR y USD.
3. Editar/borrar propias propinas.
4. Intentar editar/borrar ajenas (debe fallar).
5. Ver rankings y exportar CSV.
6. Probar en móvil.

## Puntos de atención
- Verificar que la API de cambio USD/EUR funciona (frankfurter.dev).
- Confirmar que políticas RLS bloquean acceso indebido.
- Documentar cualquier error de red o auth.
- Limpiar datos de prueba al finalizar.

## Entregables del sprint
- Checklist completado en `docs/sprint-1-1/checklist-e2e.md`.
- Reporte de bugs encontrados con gravedad y pasos para reproducir.
- Recomendaciones para fixes o mejoras.
- Decisión final: aprobado o no para despliegue.

## Notas finales
- No modificar código durante pruebas.
- Usar datos temporales y limpiar después.
- Si hay fallos críticos, documentar y pausar despliegue.
