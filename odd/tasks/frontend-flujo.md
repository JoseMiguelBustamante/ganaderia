# Fase 3/4 — Frontend GanaderApp (React, flujo completo)

SPA React en `/home/agent/repos/Proyect/ganaderia-web` (repo público
github.com/JoseMiguelBustamante/ganaderia-web). Stack: Vite + React 19 +
Tailwind v4 (tokens de design/system.md) + react-router 7 + axios.
Deploy: Dokploy auto-rebuild por push a main. Deliverables sin backend propio
ni tests automatizados aún: verificación manual por URL de producción.

## Specs

- S1: "Registro de establecimiento" — ruta /registro: crea tenant + owner via POST /api/auth/register {tenantName, slug, email, password, displayName}; al éxito guarda token y navega a /animales. (plan M1)
- S2: "Pantalla de animales" — ruta /animales con búsqueda (GET /api/animals?search=) y ficha con estado de protocolo (GET /api/protocols/animals/:id/status?protocolId=). (plan M3)
- S3: "Registrar evento / completar fase" — desde la ficha: completar fase con equipo (POST /api/protocols/animals/:id/execute {protocolId, phaseNumber, teamId?}) y opcional lote de semen {semenLotId, doses}. (plan M3)
- S4: "Inventario y alertas" — rutas /inventario (items GET /api/inventory?stage=, crear item, agregar stock) y /alertas (GET /api/inventory/alerts). (plan M2)
- S5: "Resumen de hoy" en el home "/" — eventos del día, pendientes de sincronizar y accesos rápidos. (offline-first queda para PWA posterior; el home muestra datos reales de la API).
- S6: identidad visual GanaderApp (design/system.md): verde #1C3A2D, crema #F4F0E4, dorado #C99B3F, serif display para títulos, español, targets táctiles ≥44px.

## Tasks

- T1 [S1,S6] Registro (/registro) + guard de sesión; login navega a / si hay token. Commit: feat(web)
- T2 [S2,S6] Layout de app con nav inferior (campo/animales/stock/alertas) + /animales lista con búsqueda + alta; badge de protocolo. Commit: feat(web)
- T3 [S2,S3,S6] Ficha de animal: estado de fases con completed/current/pending + acción completar fase (con lote opcional). Commit: feat(web)
- T4 [S4,S6] /inventario (lista, crear item, agregar stock, lotes) + /alertas. Commit: feat(web)
- T5 [S5,S6] Home "Resumen de hoy": contadores reales y accesos. Commit: feat(web)
- T6 Cierre: build verde, deploy verificado en producción, Keber README. Commit: docs

## Log

- L1: "Continua" — tras aprobar la landing y replica de arquitectura, el usuario aprueba continuar el flujo: registro → animales → eventos → inventario.
- L2 (recuerdo): identidad visual del mockup del dueño: verde bosque/crema/dorado + serif (design/system.md); prototipos anteriores ignorados.
