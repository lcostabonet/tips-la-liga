# Sprint 1 Plan

## 1. Objetivo del sprint
Revisar la estabilidad, seguridad básica, experiencia móvil y errores importantes antes de compartir la web con más usuarios.

## 2. Tareas priorizadas
1. Validar la configuración de Supabase y asegurar que las claves secretas no estén expuestas.
2. Revisar y documentar las políticas RLS para `tips` y `profiles`.
3. Comprobar la experiencia de autenticación y flujo de registro/login.
4. Verificar el comportamiento móvil y corregir problemas de diseño responsive.
5. Evaluar el manejo de errores en operaciones de red (Supabase y la API de cambio USD/EUR).
6. Revisar permisos de edición y borrado para que solo el autor o administrador pueda modificar propinas.
7. Probar la carga y renderizado de rankings mensual, global e historial.
8. Documentar resultados y preparar un handoff claro para el siguiente sprint.

## 3. Archivos afectados probables
- `index.html`
- `style.css`
- `app.js`
- `supabase.sql`
- `PROJECT_BRIEF.md`
- `docs/sprint-1/plan.md`
- `docs/sprint-1/handoff-dev.md`
- `docs/sprint-1/checklist.md`

## 4. Riesgos
- Exposición accidental de claves secretas en el repositorio.
- Políticas RLS incompletas o mal configuradas que permitan acceso indebido.
- Dependencia de la API externa de tipo de cambio que pueda fallar.
- UI móvil con problemas de legibilidad o elementos no accesibles.
- Errores no manejados que rompan el flujo de registro o creación de propinas.

## 5. Criterios de aceptación
- El proyecto carga correctamente y permite iniciar sesión/regístrate.
- Las propinas se pueden añadir, editar y borrar solo por su autor o administrador.
- Los rankings mensual y global se muestran correctamente.
- La interfaz es usable en dispositivos móviles.
- No hay claves secretas expuestas en el repositorio.
- Se documentan las reglas de seguridad básicas de Supabase y el estado actual de la configuración.

## 6. Checklist de pruebas
- [ ] Login con email/contraseña funciona.
- [ ] Registro con nombre público funciona y aparece en el ranking.
- [ ] Crear propina en EUR funciona.
- [ ] Crear propina en USD funciona y su conversión a EUR es correcta.
- [ ] Editar propina propia funciona.
- [ ] Borrar propina propia funciona.
- [ ] No es posible editar/borrar propina de otro usuario.
- [ ] Rankings mensual y global se actualizan.
- [ ] Historial diario del mes se muestra.
- [ ] El sitio es responsivo en móvil.
- [ ] Errores de red se muestran con mensajes claros.
- [ ] No se encuentran claves secretas en `app.js` ni en el repositorio.

## 7. Qué NO debe tocar el equipo de desarrollo
- No cambiar los requisitos de diseño general o el alcance principal del proyecto.
- No introducir frameworks nuevos como React, Vue o Angular.
- No agregar backend propio fuera de Supabase.
- No commitear keys secretas de Supabase (service_role, connection string privada, database password, tokens secretos).
- No eliminar la funcionalidad existente de rankings o CRUD de propinas sin una razón clara.

## 8. Recomendaciones para QA
- Centrar las pruebas en flujo completo: registro → login → añadir propina → ver ranking.
- Probar tanto EUR como USD y verificar la conversión.
- Testear el comportamiento en móviles reales o emuladores.
- Revisar la configuración de Supabase y los permisos en `supabase.sql`.
- Documentar cualquier hallazgo crítico inmediatamente en el checklist y comunicarlo al equipo.
