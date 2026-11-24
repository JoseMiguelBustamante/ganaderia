# Fase 2 — M2: Inventario, Proveedores y Control de Semen

Backend Node monolito modular; convenciones: skill `node` (Controller→Service→Repository,
Zod DTOs, SPs PostgreSQL, RLS por tenant). Base existente: `004_inventory.sql`
(items + stock_movements con tenant RLS).

## Specs

- S1: "M2 completo: proveedores, productos por etapa, lotes/dosis, alertas de stock." (plan-de-trabajo.md, Fase 2)
- S2: "Proveedores, catálogo de productos por etapa, lotes/dosis de semen, alertas de stock mínimo." (MoSCoW M2, Must)
- S3: "un test e2e por módulo (... API: supertest)" — cada módulo nuevo lleva tests de integración (plan, QA automatizado).
- S4: "JWT por tenant, RLS en PostgreSQL" — tablas nuevas con RLS + chequeo tenant en SPs, igual que 004_inventory (plan, Seguridad).
- S5: "Todo gasto (compra de insumo, servicio, evento sanitario) se registra ligado a animal, lote o evento" — los lotes de semen registran su proveedor y los movimientos quedan en el ledger (plan, Valorización temprana).

## Tasks

- T1 [S1,S2,S3,S4] Módulo proveedores: CRUD (crear/listar/obtener/actualizar/baja lógica) con migración 006, RLS, tests. Commit: feat(inventory)
- T2 [S1,S2,S3,S4] Catálogo por etapa: campo `stage` opcional en inventory_items + filtro de listado, migración 006, tests. Commit: feat(inventory)
- T3 [S1,S2,S3,S4,S5] Lotes de semen: tabla semen_lots (item, lote, proveedor, dosis total/disponibles, vencimiento), SPs crear/consumir atómico, endpoints, tests. Commit: feat(inventory)
- T4 [S1,S2,S3] Alertas de stock: GET /inventory/alerts (items con stock_qty <= min_stock + lotes bajos/vencidos), tests. Commit: feat(inventory)
- T5 [S1,S3] Cierre Fase 2 M2 backend: suite completa verde, README/API docs actualizados, commit de cierre. Commit: docs

## Log

- L1: "Continuemos con la fase 2 porfa" — usuario autoriza implementar Fase 2; se empieza por M2 backend (el spike de chip requiere hardware físico del usuario).
- L2 (cierre T5): T1–T4 entregados en commits 622bda2 (proveedores), 8c74dc0 (catálogo por etapa), b40a0ca (lotes de semen), f13c85d (alertas). Suite 57/57. README actualizado con los endpoints nuevos. Verificación pendiente en producción: el deploy Dokploy sigue en crash-loop por env vars (hilo separado del código).
