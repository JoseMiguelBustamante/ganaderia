# Design System — GanaderApp

Fuente: mockup de landing provisto por el dueño (imagen de referencia, 24/11/2026).
Es el único source de identidad visual del proyecto; los valores se registran tal
como se leen de la referencia. Sin CSS custom properties en el repo todavía.

## Colores

| Token | Valor | Uso |
| --- | --- | --- |
| `green-800` | `#1C3A2D` | Fondo del hero, botones pill oscuros, chips de fase, CTA final |
| `green-900` | `#14291F` | Bordes/sombra profunda sobre verde |
| `cream-100` | `#F4F0E4` | Fondo claro principal (secciones claras, body) |
| `cream-200` | `#E9E4D2` | Banda de sección alternativa (tras el grid 3×2) |
| `card-white` | `#FFFFFF` | Tarjetas sobre crema y sobre verde |
| `gold-500` | `#C99B3F` | Acento: numeración 01–06, subtítulo del hero, botón primario del hero |
| `gold-600` | `#A87F2E` | Hover/borde del acento dorado |
| `ink-900` | `#20281F` | Texto principal sobre claro |
| `ink-600` | `#4B5546` | Texto secundario sobre claro |
| `cream-text` | `#F4F0E4` | Texto sobre verde |
| `alert-red` | `#B3452E` | Dato crítico (contador «lotas por vencer» en el resumen) |

## Tipografía

| Rol | Familia | Uso |
| --- | --- | --- |
| Display | Serif editorial (p. ej. Georgia/`Georgia, 'Times New Roman', serif`; en prod: prueba Playfair/Fraunces) | Títulos de sección y frases de marca: «Tu rodeo, siempre bajo control.», «Lo que resuelve», «Las 7 fases del ciclo», «Recupera el control del negocio» |
| Body | Sans del sistema (`system-ui, -apple-system, 'Segoe UI', sans-serif`) | Párrafos, labels, números del resumen, cuerpo de tarjetas |

Pesos: display 700–800; body 400/500; números del resumen 700.

## Espaciado y forma

| Valor | Uso |
| --- | --- |
| Radio `16px` | Tarjetas grandes, botones pill (radio completo para CTA) |
| Radio `12px` | Filas internas del resumen, chips de fase |
| Padding de tarjeta `20–24px` | Tarjetas de beneficios y resumen |
| Gap de grilla `16–24px` | Grid 3×2, chips de fase |
| Sombra suave difusa | Tarjeta flotante del hero sobre verde |

## Componentes base

- **Nav**: logo serif a la izquierda, CTA pill verde a la derecha (`Quiero probarla`).
- **Hero**: bloque verde con eyebrow dorado en mayúsculas pequeñas, título display grande en crema, párrafo corto y botón dorado `Pedir acceso`; tarjeta flotante `Resumen de hoy` con filas blancas label→[N].
- **Tarjeta de beneficio**: número dorado (01–06, serif), título sans bold, texto corto.
- **Chips de fase**: pill verde con número dorado y nombre en crema; 7 en fila.
- **CTA final**: título display centrado + botón pill verde.

## Reglas

- El dorado solo se usa como acento (números, eyebrow, un botón); nunca como fondo grande.
- El verde profundo es el color de marca y de acción primaria sobre claro.
- Modo claro siempre; el hero es el único bloque oscuro completo.
- Texto crítico (alerta) se acompaña siempre de texto legible, no solo color.
