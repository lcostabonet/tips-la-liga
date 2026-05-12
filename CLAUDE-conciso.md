# CLAUDE.md

## Proyecto

Este proyecto se llama **Tips La Liga**. Es una web para registrar propinas entre compañeros de transporte discrecional y mostrar rankings mensuales y globales.

## Tecnologías

Usa **HTML**, **CSS**, **JavaScript puro**, **Supabase**, **Git**, **GitHub** y **GitHub Pages**. No uses frameworks como React, Vue o Angular salvo petición explícita.

## Archivos principales

- `index.html`: estructura de la web.
- `style.css`: diseño visual y móvil.
- `app.js`: login, registro, propinas, conversión EUR/USD y rankings.
- `supabase.sql`: tablas, políticas RLS y base de datos.

## Reglas de trabajo

Explica los cambios en español, paso a paso y de forma sencilla. Antes de cambios grandes, propone un plan. Modifica solo lo necesario y prioriza código claro para principiantes.

## Seguridad

Nunca incluyas claves secretas, database password, service_role key, connection strings privadas ni tokens. En frontend solo puede estar la URL pública de Supabase y la anon/publishable key. Mantén RLS activo.

## Git

Antes de publicar revisa:

```bash
git status
git diff
```

Después:

```bash
git add .
git commit -m "Mensaje descriptivo"
git push
```

No uses `git push --force` sin confirmación.
