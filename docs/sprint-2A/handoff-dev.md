# Sprint 2A Handoff Dev: Prototipo "Dar Propina"

## Contexto
Este sprint construye una interfaz visual estática para el flujo de dar propina a un conductor. No hay backend real. El objetivo es validar UX antes de conectar Stripe Connect en Sprint 2B.

## Qué implementar

### 1. Nueva pestaña en la navegación
Añadir un botón/tab "Dar propina" en la barra de navegación existente, visible para todos (sin login requerido en este sprint).

### 2. Datos mock en JS
Definir un array `MOCK_DRIVERS` en `app.js` (o en un archivo `mock-data.js` separado si se prefiere):
```js
const MOCK_DRIVERS = [
  { id: 1, name: "Marta G.",  emoji: "🚌", bio: "10 años en ruta", slug: "marta-g"  },
  { id: 2, name: "Jordi P.",  emoji: "🚐", bio: "Siempre puntual", slug: "jordi-p"  },
  { id: 3, name: "Sandra R.", emoji: "🚍", bio: "La favorita",     slug: "sandra-r" },
];
```
Estos datos nunca tocan Supabase en este sprint.

### 3. Vista lista de conductores
- Renderizar tarjetas con: emoji, nombre, bio y botón "Seleccionar".
- Al pulsar "Seleccionar" → mostrar vista de pago de ese conductor.

### 4. Vista de pago del conductor
Elementos requeridos:
- **Cabecera**: emoji + nombre del conductor.
- **QR ficticio**: usar `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=tips-la-liga-demo-{slug}">`. Esta URL es pública y no expone secretos; el QR apunta a una URL demo sin datos reales.
- **Selector de importe**:
  ```html
  <div class="tip-chips">
    <button class="chip" data-amount="1">1 €</button>
    <button class="chip" data-amount="2">2 €</button>
    <button class="chip" data-amount="5">5 €</button>
    <input type="number" id="custom-amount" placeholder="Otro importe" min="0.50" step="0.50">
  </div>
  ```
- **Botón "Pagar X €"**: desactivado hasta que se seleccione importe.
- **Aviso claro**: "🧪 Modo demo — el pago no es real."

### 5. Feedback simulado
Al pulsar "Pagar":
1. Botón pasa a estado `loading` (deshabilitar + texto "Procesando...").
2. Después de 1,5 s: mostrar panel de confirmación.
   ```
   ✅ ¡Propina de X € enviada a [Conductor]!
   Gracias por tu generosidad 🙌
   [Dar otra propina]
   ```
3. Botón "Dar otra propina" → vuelve a la lista de conductores.

### 6. Navegación y estado
- Usar la misma estrategia de `showSection()` / `currentView` que ya existe en `app.js`.
- No romper las vistas existentes (login, ranking, historial).

## Restricciones importantes
| Prohibido                                   | Alternativa en este sprint            |
|--------------------------------------------|---------------------------------------|
| `STRIPE_SECRET_KEY` o cualquier key secreta | No usar Stripe en absoluto            |
| Llamadas a Edge Functions de Supabase       | Simular con `setTimeout`              |
| Modificar tablas `tips`, `profiles`, etc.  | Datos hardcodeados en JS              |
| Almacenar pagos en Supabase                 | Solo mostrar mensaje de confirmación  |
| Librerías CDN pesadas                       | JS puro, máximo imagen QR externa     |

## Archivos a modificar
- `index.html` — añadir sección HTML para "Dar propina".
- `style.css` — estilos para tarjetas de conductor, chips de importe, QR.
- `app.js` — lógica de selección, cálculo de importe y feedback simulado.

## Archivos a NO modificar
- `supabase.sql`
- Cualquier lógica existente de auth, rankings o propinas propias.

## Referencia de diseño
Seguir las convenciones visuales actuales del proyecto:
- Variables CSS ya definidas en `style.css` (colores, fuentes, border-radius).
- Botones grandes (min 44px de alto) para usabilidad móvil.
- Tarjetas con sombra suave y bordes redondeados.
- Emojis para dar personalidad, sin abusar.
- Paleta coherente con el resto de la app.

## Cómo probar
1. Abrir `index.html` en el navegador (sin servidor necesario para este sprint).
2. Navegar a la pestaña "Dar propina".
3. Seleccionar un conductor.
4. Elegir o escribir un importe.
5. Pulsar "Pagar" y verificar el feedback simulado.
6. Probar en viewport 375px (iPhone SE) y 390px (iPhone 14).
