# Sprint 1 Handoff Dev

## Propósito
Entregar al equipo de desarrollo una guía clara de lo que se debe revisar y corregir en el Sprint 1 sin modificar el alcance fundamental.

## Estado actual
- Proyecto con frontend estático en `index.html`, `style.css` y `app.js`.
- Supabase usado como backend con autenticación y CRUD de propinas.
- Convertir propinas USD a EUR mediante API externa.
- Proyecto inicial ya comiteado y listo para revisión.

## Prioridades de desarrollo
1. Revisar la carga y renderizado de la app.
2. Comprobar autenticación y registro de usuarios.
3. Validar permisos de edición/borrado de propinas.
4. Verificar experiencia móvil y responsive.
5. Mejorar manejo de errores de red y mostrar mensajes claros.

## Puntos de atención
- Asegurarse de que `SUPABASE_URL` y `anon` key son las únicas credenciales públicas presentes.
- No añadir ni commitear claves secretas (`service_role`, contraseña de BD, connection string privada, tokens secretos).
- Usar Supabase Auth y políticas RLS para la seguridad.
- No introducir dependencias o frameworks nuevos.

## Revisión de seguridad básica
- Verificar que `supabase.sql` contiene la estructura esperada para `profiles` y `tips`.
- Confirmar que `app.js` no expone credenciales secretas.
- Revisar si hay referencias a claves o tokens adicionales.

## Requisitos de diseño móvil
- Comprobar que la UI se ajusta en pantallas pequeñas.
- Validar que los botones y formularios son fácilmente usables en móvil.
- Revisar que el contenido no se recorte ni quede inaccesible.

## Entregables del sprint
- Lista de problemas corregidos y pruebas realizadas.
- Documentación de reglas RLS y configuración de Supabase.
- Ajustes mínimos en UI móvil si se detectan problemas.
- Informe de hallazgos críticos y recomendaciones para el siguiente sprint.
