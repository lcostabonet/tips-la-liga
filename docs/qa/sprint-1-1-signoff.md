# QA Sprint 1.1 Signoff

## Pruebas realizadas
1. Inspección estática del código para lógica de registro, login, logout y persistencia de sesión.
2. Verificación de guardias de permisos en `openEditDialog`, `saveEdit` y `deleteTip`.
3. Revisión de lógica de conversión USD/EUR y manejo de errores.
4. Inspección de rankings mensual, global e historial diario.
5. Verificación de exportación CSV.
6. Revisión de responsividad móvil en CSS.
7. Verificación de que no hay claves secretas expuestas en `app.js`.
8. Simulación de flujo de UI sin backend activo (registro/login forms, rankings display).

Nota: Las pruebas E2E reales requieren un backend Supabase activo con usuarios de prueba. En este entorno, se realizó validación estática y de interfaz. No se pudo ejecutar pruebas con datos reales de Supabase.

## Checks aprobados
- [x] Configuración de Supabase en `app.js` usa solo `SUPABASE_URL` y `anon` key públicas.
- [x] No hay claves secretas (`service_role`, connection string privada, database password, tokens) en el repositorio.
- [x] UI es responsiva en móvil (media query @media (max-width: 800px) presente).
- [x] Lógica de guardias de permisos implementada en `app.js` para editar/borrar propinas.
- [x] Manejo de errores con try/catch y mensajes de toast en operaciones.
- [x] Rankings mensual y global tienen lógica de renderizado.
- [x] Exportación CSV implementada.
- [x] Formularios de registro y login presentes y funcionales en interfaz.

## Checks fallidos
- [ ] Configurar Supabase con datos de prueba (no ejecutado: requiere backend activo).
- [ ] Crear usuarios de prueba (Usuario A, Usuario B, Admin) (no ejecutado: requiere backend).
- [ ] Registro de nuevo usuario funciona (no verificado: requiere backend).
- [ ] Login con email/contraseña funciona (no verificado: requiere backend).
- [ ] Logout funciona y redirige a auth (no verificado: requiere backend).
- [ ] Sesión persiste al recargar página (no verificado: requiere backend).
- [ ] Añadir propina en EUR funciona y se guarda (no verificado: requiere backend).
- [ ] Añadir propina en USD funciona, se convierte a EUR y se guarda (no verificado: requiere backend).
- [ ] Conversión USD/EUR es correcta (usando API externa) (no verificado: requiere backend).
- [ ] Editar propina propia funciona (no verificado: requiere backend).
- [ ] Borrar propina propia funciona con confirmación (no verificado: requiere backend).
- [ ] Intentar editar/borrar propina ajena falla con mensaje de error (no verificado: requiere backend).
- [ ] Ranking mensual muestra propinas del mes actual correctamente (no verificado: requiere backend).
- [ ] Ranking global muestra todas las propinas correctamente (no verificado: requiere backend).
- [ ] Rankings se actualizan en tiempo real tras añadir/editar/borrar (no verificado: requiere backend).
- [ ] Historial diario del mes se muestra correctamente (no verificado: requiere backend).
- [ ] Seleccionar otro mes actualiza rankings y historial (no verificado: requiere backend).
- [ ] Exportar CSV del mes funciona y contiene datos correctos (no verificado: requiere backend).
- [ ] Mensajes de error se muestran para operaciones fallidas (parcial: verificado en código, no en runtime).
- [ ] No hay errores en consola del navegador (no verificado: requiere ejecución con backend).

## Bugs encontrados
### 1. No se detectaron bugs en el código fuente durante inspección estática.
- La lógica de permisos y UI parece correcta.
- El CSS responsivo está implementado.

### 2. Limitaciones de pruebas sin backend
- No se pudo validar interacciones reales con Supabase Auth y base de datos.
- Conversión USD/EUR depende de API externa, no probada en runtime.
- Rankings y CRUD requieren datos reales para verificación completa.

## Gravedad
- Bugs funcionales: Ninguno detectado (gravedad: baja).
- Riesgos de implementación: Alto, porque falta validación con backend real.
- Seguridad: Baja, ya que no hay claves secretas expuestas y guardias están en código.

## Pasos para reproducir
1. Abrir `index.html` localmente en navegador.
2. Verificar que formularios de registro/login se muestran correctamente.
3. Inspeccionar `app.js` para confirmar guardias de permisos.
4. Revisar `style.css` para media queries móviles.
5. Buscar en el repositorio por términos como "service_role" o "database password" (no deberían aparecer).
6. Para pruebas completas: Configurar Supabase de prueba, actualizar `app.js`, crear usuarios y ejecutar flujo manual.

## Recomendaciones
- Ejecutar pruebas E2E reales con un proyecto Supabase de prueba antes de aprobar para producción.
- Crear usuarios temporales y limpiar datos después de pruebas.
- Verificar la API de cambio USD/EUR en runtime.
- Añadir logging o debugging para errores de red.
- Considerar tests automatizados para lógica de permisos y UI.

## Decisión final
- No aprobado para despliegue en producción.
- Aprobado como validación estática: el código está listo para pruebas con backend, pero falta confirmación de funcionamiento end-to-end con datos reales.

## Observaciones finales
- El Sprint 1.1 no pudo completarse completamente sin un entorno Supabase activo.
- Recomiendo configurar un proyecto de prueba y repetir las pruebas con usuarios reales.
- Una vez aprobado con backend, proceder a despliegue en GitHub Pages.
