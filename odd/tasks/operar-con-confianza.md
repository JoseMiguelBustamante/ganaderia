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
- L2 (cierre T1): commit 3fcfd95. Limitador de ventana fija con almacén por instancia, 429 RATE_LIMITED (nuevo código), Retry-After, clave ip+email en auth y limitador general por IP; montado a nivel de ruta porque el middleware por prefijo no corre en ultimate-express. 7 tests. Suite 122/122.
- L3 (cierre T2): commit 51e565a. Exportaciones CSV de compras y consumos con rango de fechas, comillas RFC 4180, fechas ISO y Content-Disposition. 6 tests. Suite 128/128.
- L4 (cierre T3/T4): commit 1db6156 del front: pantallas de proveedores y compras con pagos, alta de lotes de semen en Stock, botones de descarga CSV y accesos desde Inicio. Verificado en producción: CSV real con datos de la demo, proveedores OK y bloqueo 429 al intento 11.
- L5 (T5): el usuario eligió "solo documentar por ahora". Se entregó docs/backups.md (backup manual verificado, restore, tres opciones de automatización, frecuencia/retención y monitoreo de salud) y scripts/backup-db.sh con verificación y rotación. Automatización pendiente de definir destino.

