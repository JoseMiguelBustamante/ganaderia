# Operar con confianza — protección y reportes exportables

Siguiente bloque tras cerrar los cuatro bloqueantes de entrega. API en
`/home/agent/repos/Proyect/ganaderia`, SPA en `/home/agent/repos/Proyect/ganaderia-web`.

## Specs

- S1: "Rate limiting" y bloqueo por intentos de login fallidos (lista de pendientes, bloque necesario).
- S2: "reportes operativos y financieros exportables" (plan-de-trabajo.md, M6).
- S3: "alertas tempranas" y monitoreo: el sistema debe avisar cuando algo se cae, y la base debe poder recuperarse (lista de pendientes, backups + monitoreo).
- S4: pantallas faltantes del front para proveedores, lotes de semen y compras (el backend ya las expone).
- S5: contratos y RLS intactos; cada módulo nuevo con tests de integración (plan, QA + Seguridad).

## Tasks

- T1 [S1] API: limitador de intentos para `/api/auth/login` y `/api/auth/register` con respuesta 429 `RATE_LIMITED`, configurable por env, más un limitador general por IP. Tests unitarios del limitador y de integración del bloqueo. Commit: feat(security)
- T2 [S2] API: exportación CSV de reportes (resumen, compras y consumos) con `text/csv`. Commit: feat(reports)
- T3 [S2] Front: botones de descarga de los reportes en la pantalla Reportes. Commit: feat(web)
- T4 [S4] Front: pantallas de proveedores, lotes de semen (alta con dosis y vencimiento) y listado de compras con saldo. Commit: feat(web)
- T5 [S3] Backups y monitoreo: dejar el procedimiento escrito y ejecutable según lo que el usuario decida (destino S3 en Dokploy o copia manual programada) + verificación de salud externa. Commit: docs

## Log

- L1: "Continuemos porfa" tras cerrar el bloque de entrega: se avanza con el bloque de operar con confianza en el orden propuesto (protección primero, después pantallas y exportables).
