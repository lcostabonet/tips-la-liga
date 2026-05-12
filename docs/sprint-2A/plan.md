# Sprint 2A Plan: Prototipo Visual "Dar Propina"

## Objetivo del sprint
Construir una interfaz visual inicial para la pestaña "Dar propina" que permita al usuario seleccionar un conductor, ver un QR ficticio y un botón de pago ficticio. Sin integración real con Stripe ni Supabase.

## Contexto
Sprint 2 diseñó la arquitectura completa de Stripe Connect. Sprint 2A es el paso previo: validar visualmente el flujo de pago con datos de ejemplo antes de conectar backend real. Permite iterar rápido sobre UX sin riesgo.

## Alcance

### Incluye
- Nueva pestaña o sección "Dar propina" en el frontend existente.
- Lista de conductores de ejemplo (datos hardcodeados en JS).
- Tarjeta de conductor seleccionado con nombre, foto/emoji y descripción.
- QR ficticio (imagen placeholder o generado con librería pública sin secrets).
- Selector de importe: opciones rápidas (1€, 2€, 5€, otro) y campo manual.
- Botón "Pagar" ficticio que muestra un mensaje de confirmación simulado.
- Diseño móvil, limpio y con personalidad (emojis ligeros, colores coherentes).

### Excluye explícitamente
- Integración con Stripe (real ni test mode).
- Edge Functions de Supabase.
- Modificaciones en tablas o RLS de Supabase.
- Claves secretas de ningún tipo.
- Autenticación del cliente pagador (no es necesaria en este sprint).

## Datos de ejemplo
```js
const MOCK_DRIVERS = [
  { id: 1, name: "Marta G.",   emoji: "🚌", bio: "10 años en ruta",  slug: "marta-g"   },
  { id: 2, name: "Jordi P.",   emoji: "🚐", bio: "Siempre puntual",  slug: "jordi-p"   },
  { id: 3, name: "Sandra R.",  emoji: "🚍", bio: "La favorita",      slug: "sandra-r"  },
];
```

## Flujo de pantalla
```
1. [Pestaña "Dar propina"]
        ↓
2. Lista de conductores (tarjetas con emoji + nombre + bio)
        ↓
3. Seleccionar conductor → vista detalle
        ↓
4. Elegir importe (chips rápidos + input libre)
        ↓
5. QR ficticio + botón "Pagar X €"
        ↓
6. Mensaje simulado "✅ ¡Propina enviada!" (sin backend)
```

## Criterios de aceptación
- [ ] La pestaña "Dar propina" es visible y accesible desde la nav.
- [ ] Se muestran al menos 3 conductores de ejemplo.
- [ ] Al seleccionar un conductor aparece su tarjeta con QR.
- [ ] El selector de importe funciona (chips + input manual).
- [ ] El botón "Pagar" muestra feedback visual simulado.
- [ ] La interfaz es usable en móvil (375px mínimo).
- [ ] No hay claves secretas en el código.
- [ ] No se modifican tablas ni lógica existente de Supabase.

## Stack
- HTML, CSS y JavaScript puro. Sin frameworks.
- QR placeholder: imagen SVG inline o `https://api.qrserver.com/v1/create-qr-code/` con URL ficticia (sin datos reales).
- Sin dependencias nuevas de npm ni CDN pesados.

## Entregables
- Código en `index.html`, `style.css`, `app.js` (o sección nueva si se separa).
- `docs/sprint-2A/plan.md` (este archivo)
- `docs/sprint-2A/handoff-dev.md`
- `docs/sprint-2A/checklist.md`

## Estimación
| Tarea                          | Tiempo estimado |
|-------------------------------|-----------------|
| Pestaña nav + estructura HTML  | 30 min          |
| CSS tarjetas conductores       | 45 min          |
| Lógica JS selección conductor  | 30 min          |
| Selector de importe            | 30 min          |
| QR placeholder + botón pago   | 30 min          |
| Feedback simulado              | 15 min          |
| Revisión móvil y pulido        | 30 min          |
| **Total**                      | **~3,5 h**      |

## Siguiente paso (Sprint 2B)
Conectar esta UI con Edge Functions reales y Stripe Connect una vez validada visualmente con el equipo.
