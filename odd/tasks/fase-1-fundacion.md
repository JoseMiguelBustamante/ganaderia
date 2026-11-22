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
- T2 · S2,S3 · inline · esquema base multi-tenant (tenants, users con roles) en scripts/init.sql con RLS + bootstrap (feat/fase-1)
- T3 · S2,S3 · inline · auth: registro/login con JWT por tenant + middlewares authenticate/authorize (feat/fase-1)
- T4 · S2,S5 · inline · animales: alta individual y listado por SP (get/sp_create/get_all) (feat/fase-1)
- T5 · S2,S3,S5 · inline · protocolos: modelo de 7 fases, completar fase 1 y descuento atómico de insumo en una transacción SQL (feat/fase-1)
- T6 · S4,S6 · inline · esqueleto React y recorrido vertical del walking skeleton con test e2e (feat/fase-1)
- T7 · S6 · inline · README/help/env actualizados y cierre de Fase 1 (feat/fase-1)

## Log

L1 (pedido original, verbatim): «Entonces continuemos con el proyecto agrega la skills de node porfa si es que no esta» — añadida la skill `node` a /home/agent/.cursor/skills/, registry refrescado (8 skills) y persistido en Engram (topic_key: skill-registry).
L2: contexto de continuación — el plan v2 (docs/plan-de-trabajo.md) y las infográficas del flujo del cliente (design/flujo-cliente-ganaderia/) estaban listos; baseline commit c465b9d en main y branch feat/fase-1 creada.
