# QA Sprint 1 Signoff

## Pruebas realizadas
1. Verificación de carga de la página `index.html` en local.
2. Inspección del DOM y de los formularios de autenticación.
3. Revisión del formulario de registro y confirmación de que el `label` de email apunta correctamente a `registerEmail`.
4. Revisión de la visibilidad de los formularios de login/registro al alternar pestañas.
5. Revisión del script de Supabase en la página y confirmación de que `window.supabase` y `createClient` están disponibles.
6. Revisión de la lógica de `app.js` para guardias de permisos en `openEditDialog`, `saveEdit` y `deleteTip`.
7. Revisión de `supabase.sql` para políticas RLS en `profiles` y `tips`.
8. Revisión de `PROJECT_BRIEF.md` y `docs/sprint-1/dev-summary.md` para asegurar que los cambios de Sprint 1 están documentados.

## Bugs encontrados
### 1. No se detectaron bugs de código directo en los cambios de Sprint 1.
- El ajuste de `index.html` corrige un bug de accesibilidad en el formulario de registro.
- Las guardias añadidas en `app.js` son una mejora de seguridad en el frontend.

### 2. Hallazgos de riesgo observados
- No se pudo verificar la ejecución de registros, login, creación/edición/borrado de propinas con un backend activo dentro del entorno de QA. La validación se hizo a nivel de interfaz, lógica de eventos y políticas declaradas.
- La política `profiles_select_all` permite selects anónimos sobre `profiles`, lo cual actualmente es aceptable para mostrar nombres públicos, pero debe revisarse si se añaden datos sensibles en esa tabla.

## Gravedad
- Bug funcional directo: Ninguno detectado en los cambios aplicados. (Gravedad: baja)
- Riesgo de seguridad: Bajo/medio, basado en la política RLS de `profiles` y la necesidad de no exponer datos extra en el futuro.
- Riesgo de implementación: Medio, porque no se validó una sesión de usuario real ni interacción completa con Supabase Auth en el ambiente actual.

## Pasos para reproducir
1. Abrir `index.html` localmente en el navegador.
2. Confirmar que el botón `Registrarse` muestra el formulario de registro.
3. Verificar que el campo `Email` en registro está correctamente etiquetado.
4. Abrir el inspector y confirmar que `window.supabase` existe y que el script de Supabase está cargado.
5. Revisar `app.js` para confirmar la existencia de los guardias de permiso:
   - `openEditDialog` con `canEditTip(tip)`
   - `saveEdit` con `canEditTip(tip)`
   - `deleteTip` con `canEditTip(tip)`
6. Revisar `supabase.sql` para las políticas RLS declaradas.

## Recomendaciones
- Ejecutar pruebas con el backend Supabase activo y con cuentas de usuario reales antes de aprobar definitivamente.
- Revisar la política `profiles_select_all` si en el futuro se añaden campos que no deban ser públicos.
- Añadir pruebas automatizadas o scripts de integración para flujo de auth y operaciones de propinas.
- Asegurar que el mensaje `configWarning` no se muestra en producción cuando la configuración de Supabase es válida.

## Decisión final
- No aprobado aún para despliegue en producción.
- Aprobado como revisión de Sprint 1 en cuanto a las mejoras de código aplicadas: los cambios hicieron avanzar la seguridad y la accesibilidad, pero falta validación completa con backend y flujo de usuarios reales.

## Observaciones finales
- El proyecto cumple con los cambios solicitados para Sprint 1.
- El siguiente paso es una prueba end-to-end con Supabase Auth y datos reales.
- No se realizaron commits ni pushes durante esta revisión.
