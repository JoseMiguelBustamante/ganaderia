# GanaderApp — Web (React)

SPA React del SaaS ganadero. Identidad visual: `design/system.md` del repo backend
(verde #1C3A2D, crema #F4F0E4, dorado #C99B3F, serif display).

## Arquitectura (igual a Electronica_Central_frontend)

- Vite + React 19 + Tailwind v4 + react-router 7 + axios.
- La API se consume por `VITE_API_URL` (env var de BUILD), ej:
  `https://ganaderia.187.127.19.244.sslip.io/api`.
  En desarrollo la ruta relativa `/api` se proxea con `API_PROXY_TARGET`.
- Token JWT en `localStorage` (`session.ts`); interceptor agrega `Authorization`
  y redirige a `/login` en 401.
- Contrato de la API: éxito `{ data }`, error `{ error: { code, message, details? } }`.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción (`dist/`)
- `npm run preview` — sirve el build

## Docker

Multi-stage: build de Vite, luego nginx estático con fallback SPA
(`try_files ... /index.html`). Build arg `VITE_API_URL` define la URL de la API.
