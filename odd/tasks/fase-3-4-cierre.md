# Cierre Fase 3 + Fase 4 — Offline, contable y reportes

Backend Node en `/home/agent/repos/Proyect/ganaderia` (API, 82/82 verde) y SPA en
`/home/agent/repos/Proyect/ganaderia-web` (React). Convenciones: skill `node` en el
API; identidad `design/system.md` en el front.

## Specs

- S1: "M4. Contable y Financiero: Compras, cuentas por pagar, valorización simple del ganado, costo por protocolo/etapa. Sin estados financieros completos." (plan-de-trabajo.md, MoSCoW, Should)
- S2: "Todo gasto (compra de insumo, servicio, evento sanitario) se registra ligado a animal, lote o evento en el momento en ocurre." (plan, Valorización temprana)
- S3: "M6. Reportes y Tableros: KPIs básicos, reportes operativos y financieros exportables, alertas tempranas." (plan, MoSCoW, Should)
- S4: "PWA offline-first: PWA con service worker, cola de operaciones pendientes y sincronización con resolución autoritativa del servidor. El servidor manda; la UI muestra qué se sincronizó y qué quedó pendiente." (plan, Requisitos transversales)
- S5: "acasalamiento/inseminación con descuento atómico en una transacción" y el contrato `POST /api/protocols/animals/:id/execute` ya acepta `{semenLotId, doses}` — la UI debe ofrecer elegir el lote. (plan, Fase 3)
- S6: "un test e2e por módulo (API: supertest)" y "JWT por tenant, RLS en PostgreSQL" para todo módulo nuevo. (plan, QA + Seguridad referenced)

## Tasks

- T1 [S4,S6] API: módulo `purchases` (compras + cuentas por pagar): migración con RLS, SPs, CRUD, pago parcial/total, tests. Commit: feat(purchases)
- T2 [S2,S6] API: valorización por animal y por etapa/protocolo sobre `stock_movements` + consumos, tests. Commit: feat(reports)
- T3 [S3,S6] API: reportes/KPI (`GET /api/reports/summary`) con animales por estado, consumo, gasto del período, alertas, tests. Commit: feat(reports)
- T4 [S5] Front: selector de lote de semen + dosis en la ficha del animal al completar fase. Commit: feat(web)
- T5 [S4] Front: PWA (service worker, cola local de operaciones, indicador pendiente/enviado). Commit: feat(web)
- T6 [S3] Front: pantalla de reportes/KPI consumiendo el resumen. Commit: feat(web)
- T7 Cierre: suites verdes, README/docs, deploy verificado en producción. Commit: docs

## Log

- L1: "Completa las demás fases porfa" — usuario autoriza cerrar Fase 3 (offline + consumo por lote) y ejecutar Fase 4 (contable + reportes) del plan.
