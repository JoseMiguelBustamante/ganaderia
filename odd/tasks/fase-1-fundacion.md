# Fase 1 — Fundación, Módulo 1 y walking skeleton

Desarrollo de la Fase 1 del plan v2: base infraestructural, módulo SaaS/usuarios y el
flujo vertical mínimo (walking skeleton) como Definition of Done de la fase.
Convenciones backend: skill `node` (/home/agent/.cursor/skills/node/SKILL.md).
Arquitectura de datos: plan v2 sección 1 (multi-tenant con tenant_id + RLS, SPs).

## Specs

S1 (decisión del usuario, verbatim): «De momento lo haremos todo con node y react , no spring boot ni python» — backend Node monolito modular + frontend React; sin Spring Boot ni Python.

S2 (habitabilidad, verbatim del usuario): «Entonces continuemos con el proyecto agrega la skills de node porfa si es que no esta» — la convención backend es la skill `node`: Controller → Service → Repository, DTOs Zod en la route, logger local, error table local, ES Modules, ultimate-express, pg solo en src/db/postgres.js.

S3 (tenant, quote del plan v2): «PostgreSQL única. **Multi-tenant: `tenant_id` en todas las tablas + Row Level Security**; los stored procedures reciben el tenant como parámetro obligatorio.» Decisión fijada en la semana 1 del proyecto.

S4 (DoD de la fase, quote del plan v2): «flujo vertical mínimo completo y testeado: login → alta de animal → completar fase 1 del protocolo → descuento de un insumo en inventario, recorriendo React → API → PostgreSQL con un test e2e.»

S5 (gastos ligados, quote del plan v2): «Todo gasto (compra de insumo, servicio, evento sanitario) se registra **ligado a animal, lote o evento** en el momento en ocurre.

S6 (QA, quote del plan v2): «un test e2e por módulo (React: Playwright; API: supertest); **staging desde la Fase 1**».

## Tasks

- T1 · S2,S6 · inline · infra de datos de desarrollo: PostgreSQL embebido para dev/tests, scripts npm db:init/up/down, smoke test de conexión (feat/fase-1)
- T2 · S2,S3 · inline · esquema base multi-tenant (tenants, teams, users con roles) en scripts/migrations/001_foundation.sql con RLS + gateway conTenant/withSystem (feat/fase-1)
- T3 · S2,S3 · inline · auth: registro/login con JWT por tenant + middlewares authenticate/authorize (feat/fase-1)
- T4 · S2,S5 · worker (corrected handoff; two approved decisions: 23505→ConflictError in service, fn_get_animal_by_id→RETURNS SETOF) · animales: alta individual y listado por SP (feat/fase-1)
- T5 · S2,S3,S5 · worker (decisión aprobada: escenario de ejecución coherente A) · protocolos: modelo de 7 fases, completar fase y descuento atómico de insumo en un solo CALL (feat/fase-1)
- T6 · S4,S6 · inline · esqueleto React y recorrido vertical del walking skeleton con test e2e (feat/fase-1)
- T7 · S6 · inline · README/help/env actualizados, docs/deployment.md (patrón Dokploy + rotación de credenciales) y cierre de fase (feat/walking-skeleton)

## Log

L1 (pedido original, verbatim): «Entonces continuemos con el proyecto agrega la skills de node porfa si es que no esta» — añadida la skill `node` a /home/agent/.cursor/skills/, registry refrescado (8 skills) y persistido en Engram (topic_key: skill-registry).
L2: contexto de continuación — el plan v2 (docs/plan-de-trabajo.md) y las infográficas del flujo del cliente (design/flujo-cliente-ganaderia/) estaban listos; baseline commit c465b9d en main y branch feat/fase-1 creada.
L3: corte de slice — T1 (c386215, db harness) y T2 (e00a91b, multi-tenant RLS + gateway + tests de aislamiento 4/4) suman 645 líneas; próximo commit abre slice nuevo. T3 en progreso.
L4: verificación de seguridad independiente (gentle-ai-verify) — 4 propiedades PASS estático, 2 UNVERIFIED con defecto probable: login con email inexistente 500 por composite nulo de fn RETURNS users, y /me con claim cruzado firmado resolvía 200. Confirmado en RED con las pruebas ready-to-commit del verificador (test/integration/auth-security.test.js) y corregido: funciones a RETURNS SETOF users (002), login de trabajo constante con hash dummy; suite security 3/3, total 16/16. Commit 23d9b76. Restos: bcrypt trunca a 72 bytes (contraseñas unicode largas comparten input efectivo); rol productivo se crea operativamente al desplegar; catch-all NOT_FOUND añade respuesta JSON a rutas no emparejadas (baseline cambiado, aceptado). 4 commits, ~1220 líneas — la publicación elegirá forma de entrega (sugerida: referencias por commits de unidad).
L5: T4 entregado por worker tras dos decisiones de contrato aprobadas (23505→ConflictError en el service; fn_get_animal_by_id→RETURNS SETOF, mismo root cause del composite nulo detectado por el worker sin DB). Verificación parent: db:reset + suite 25/25. Commit 8de60ae (por rutas explícitas). T5 en progreso vía worker (motor de protocolos + descuento atómico).
L6: incidentes de higiene git en paralelo con workers — (1) un `git add -A` capturó un archivo a medio escribir del worker (separado con reset --soft en frío), (2) un add del doc ODD en carrera dejó el blob vacío en un commit intermedio (restaurado en 1e656a2). Regla vigente: commits por rutas explícitas siempre, y commits de solo-mis-archivos mientras haya workers activos.
L7: T5 entregado por worker con 13 node --check verdes y una decisión aprobada (escenario A: ítem de stock cero separado para INSUFFICIENT_STOCK, sin mutación al rechazar). Verificación parent: db:reset + suite 31/31 en primer intento, incluidos descuento atómico (5→2 con rechazos en el medio sin mutar), PHASE_OUT_OF_SEQUENCE/ALREADY_COMPLETED/NOT_FOUND, cross-tenant 422 ANIMAL_NOT_IN_TENANT y 404 en historial ajeno. Commit 1e656a2. Riesgo conocido heredado: la protección de duplicados bajo concurrencia simultánea confía en la UNIQUE (animal, protocolo, fase); locking SELECT FOR UPDATE de stock queda para Fase 3 (sync offline reabre concurrencia). T6 (React + walking skeleton e2e) es el unit pendiente del DoD.
L8: T6 entregado — worker estructuró apps/web + e2e tras dos aprobaciones de contrato (insumo en fase 1; proxy Vite sin CORS). Verificación parent: vite build OK (JSX compila), suite 31/31 tras unificar lecturas a camelCase (defecto real de contrato detectado por el walking skeleton: ear_tag/stock_qty vs writes camelCase), y flujo vertical API-e2e OK (registro→animal→stock 3→fase 1→stock 2, PHASE_NOT_FOUND en fase inexistente). Commit 45d0868. GAP NOMBRADO (S6 parcial): el e2e de Playwright NO corrió en este entorno — chromium headless-shell requiere libatk/libnss (libs de sistema) y no hay sudo; el spec quedó commiteado y es ejecutable en otra máquina/CI (npx playwright install chromium && npm run e2e). El DoD S4 («flujo vertical completo y testeado») queda demostrado API-a-API; el recorrido browser queda como prueba pendiente de entorno habilitado, no como pase afirmado.
L9: CIERRE DE FASE 1 — README reescrito (quick start, comandos npm, variables con roles/P0, módulos y endpoints, arquitectura, testing) y docs/deployment.md nuevo (patrón electronica central: imagen :80, migraciones pre-boot como admin, Postgres del VPS, variables del panel, rotación obligatoria de ganaderia_app, verificación post-deploy, conocido/pendiente). Veredicto por spec: S1 cumplida (Node+React únicos, sin Spring/Python); S2 cumplida (skill node aplicada y verificada por review); S3 cumplida (tenant_id+RLS probado por 4 tests + API cross-tenant); S4 cumplida en su fondo con gap de forma (flujo vertical demostrado API-a-API; recorrido browser pendiente de entorno con Chromium); S5 cumplida (stock_movements ligado a animal con movementId devuelto); S6 parcial por el mismo gap del e2e browser; deployments doc deja el servicio Dokploy listo para crear cuando el review pendiente se resuelva (routing de modelos de reviewers sin asignar — única acción humana). Bloqueado fuera de la fase: push a GitHub + creación del servicio.
