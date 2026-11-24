# Fase 3 — Motor de campo: protocolos completos e inseminación por lote

Backend Node monolito modular; convenciones: skill `node`. Base existente:
`005_protocol_engine.sql` (motor data-driven con secuencia validada y descuento
atóomico genérico), `008_semen_lots.sql` (lotes con consumo atómico propio).

## Specs

- S1: "Motor de fases 1–7 con transiciones validadas y responsables por etapa" (plan-de-trabajo.md, Fase 3).
- S2: "acasalamiento/inseminación con descuento atómico en una transacción (animal + fase + insumos) y trazabilidad por animal" (plan-de-trabajo.md, Fase 3).
- S3: "Todo gasto ... se registra ligado a animal, lote o evento" (plan, Valorización temprana) — el consumo por lote mantiene el ledger con animal_id.
- S4: "un test e2e por módulo (API: supertest)" (plan, QA) — cada tarea con tests de integración.
- S5: "JWT por tenant, RLS en PostgreSQL" (plan, Seguridad) — SPs con chequeo de tenant.

## Tasks

- T1 [S1] Protocolo de cría por defecto: plantilla estándar 7 fases con un solo POST (nombres por defecto, sin insumos obligatorios salvo los que defina el tenant), tests. Commit: feat(protocol)
- T2 [S1,S2,S3,S5] Inseminación por lote: completar fase 3 (o la fase que defina requiredItemId de categoría semen) consumiendo de un semenLotId específico, atómico en un CALL (ejecución + lote + stock + ledger con animal_id), tests. Commit: feat(protocol)
- T3 [S1] Responsable por etapa: default_team_id opcional en protocol_phases (validado del tenant), usado cuando la ejecución no manda teamId, tests. Commit: feat(protocol)
- T4 [S1] Estado de protocolo por animal: GET del estado (fase actual, fases pendientes, historial con insumo consumido), tests. Commit: feat(protocol)
- T5 [S4] Cierre Fase 3 backend: suite verde, README actualizado, log de cierre. Commit: docs

## Log

- L1: "Avancemos con la siguiente fase después vemos el front" — usuario autoriza Fase 3 backend (motor de campo); la PWA offline-first y la UI web quedan para después; spike del chip aplazado (ver fase-2 doc, L3).
- L2 (cierre): T1–T4 entregados en commits fb6dfb8 (protocolo de cría por defecto), f51d321 (inseminación por lote atómica), abab170 (responsable por etapa + módulo teams), 2985aa9 (estado de protocolo por animal). Suite 72/72. README actualizado. Nota técnica: fn_get_protocol_status es LANGUAGE sql tras un fallido intento plpgsql (SELECT INTO con json_agg complejo); guardas de tenancy en el service.

