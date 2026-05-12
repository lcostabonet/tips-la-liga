# PROJECT BRIEF: Tips La Liga

## 1. Resumen del proyecto
Tips La Liga es una web de ranking de propinas para compañeros de transporte discrecional. La aplicación permite a los usuarios registrados con email y contraseña gestionar propinas en EUR y USD, ver rankings mensuales y globales, consultar su historial y comparar resultados entre compañeros.

## 2. Alcance del proyecto
- Plataforma web estática con HTML, CSS y JavaScript puro.
- Autenticación de usuarios mediante Supabase Auth.
- CRUD de propinas con conversión automática a EUR.
- Rankings de propinas: mensual, global e historial por usuario.
- Despliegue en GitHub Pages como frontend estático.

## 3. Audiencia objetivo
- Conductores, ayudantes y coordinadores de transporte discrecional.
- Equipos que quieren llevar un ranking amistoso de propinas.
- Usuarios que valoran una herramienta ligera y sin dependencias grandes.

## 4. Objetivos principales
- Ofrecer una experiencia intuitiva y divertida para gestionar propinas.
- Garantizar que cada usuario vea y modifique solo sus propias entradas.
- Convertir todas las propinas a EUR para comparaciones consistentes.
- Mantener un diseño limpio, móvil y accesible.
- Evitar frameworks como React o Vue.

## 5. Funcionalidades clave
1. Autenticación y registro
   - Inicio de sesión con email y contraseña.
   - Registro con nombre público para rankings.

2. Gestión de propinas
   - Añadir propinas en EUR o USD.
   - Conversión automática USD → EUR.
   - Editar y borrar propinas propias.
   - Comentarios opcionales para cada propina.

3. Rankings y análisis
   - Ranking mensual basado en totales en EUR.
   - Ranking global acumulado.
   - Historial por día y por usuario.
   - Selección de mes y exportación CSV.

4. Experiencia de usuario
   - Interfaz responsiva y clara.
   - Mensajes de estado para carga, éxito y error.
   - Diseño divertido pero profesional.

## 6. Estado actual del proyecto
- Archivos presentes: `index.html`, `style.css`, `app.js`, `supabase.sql`.
- La interfaz ya cubre login/registro, creación de propinas, rankings y edición.
- `app.js` contiene lógica de Supabase, fetch de tipo de cambio y renderización de rankings.
- Hay un `ADMIN_EMAIL` para permisos administrativos.
- El proyecto no incluye tests ni documentación de despliegue.

## 7. Arquitectura técnica
- Frontend estático servido en GitHub Pages.
- Supabase como backend para Auth, base de datos y APIs.
- Tablas esperadas: `profiles`, `tips`.
- API externa para conversión de USD a EUR (`frankfurter.dev`).
- JavaScript puro para datos, DOM y control de estado.

## 8. Supabase y seguridad
- En una aplicación estática, la `SUPABASE_URL` pública y la `anon`/`publishable` key pueden estar en el frontend.
- Nunca usar ni commitear claves secretas como `service_role`, contraseña de base de datos, connection string privada o tokens sensibles.
- La seguridad debe basarse en Supabase Auth y políticas de RLS (Row Level Security) para `tips` y `profiles`.
- Los permisos deben garantizar que:
  - Cada usuario solo pueda leer/escribir sus propias propinas.
  - Solo el administrador o autor pueda editar/borrar una propina.

## 9. Riesgos y mitigación
### Riesgos
- Exposición accidental de claves secretas en el repositorio.
- Fallos de la API externa de cambio de moneda.
- Políticas RLS mal configuradas que permitan acceso indebido.
- Experiencia móvil insuficiente.

### Mitigación
- Documentar claramente qué keys son públicas y cuáles no.
- Manejar errores de red y mostrar mensajes claros.
- Revisar y testar las políticas RLS en Supabase.
- Priorizar diseño responsive en las próximas iteraciones.

## 10. Diseño y experiencia
- Estilo simple, limpio y con toques divertidos.
- Móvil como primera prioridad.
- Interfaz con tarjetas, botones grandes y lectura clara.
- Uso de emojis ligeros para dar personalidad sin distraer.

## 11. Suposiciones
- GitHub Pages se usa solo para el frontend estático.
- La base de datos y Auth se gestionan completamente desde Supabase.
- No se requerirá backend propio aparte de Supabase.
- Los usuarios son colaboradores internos con interés en rankings amistosos.

## 12. Requisitos no funcionales
- Rendimiento rápido en móviles.
- Arquitectura sin dependencias de frameworks.
- Seguridad por políticas RLS y autenticación.
- Documentación clara de configuración y despliegue.
- No almacenar ni mostrar datos sensible innecesarios.

## 13. Cronograma sugerido
1. Documentar esquema Supabase y reglas RLS.
2. Revisión del frontend actual y posibles mejoras UX.
3. Añadir validación, mensajes de estado y manejo de errores.
4. Preparar README con instrucciones de setup y despliegue.
5. Publicar en GitHub Pages y verificar que Supabase funciona desde el sitio estático.

## 14. Criterios de éxito
- Usuarios pueden registrarse e iniciar sesión.
- Los usuarios pueden añadir, editar y borrar sus propias propinas.
- Rankings mensual y global funcionan correctamente.
- Propinas en USD se convierten automáticamente a EUR.
- La configuración de Supabase no expone claves secretas.
- El proyecto está desplegado y accesible mediante GitHub Pages.
