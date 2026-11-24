# Bloque de entrega — lo que falta para poder entregar el software

Cuatro bloqueantes acordados al cierre de las Fases 3–4. API en
`/home/agent/repos/Proyect/ganaderia`, SPA en `/home/agent/repos/Proyect/ganaderia-web`.

## Specs

- S1: "delegar sin perder control: cada fase tiene su equipo y ves quién hizo qué y cuándo" — hoy solo existe el usuario owner; se necesitan usuarios con rol (owner, capataz, operario, veterinario) y permisos aplicados en las rutas. (docs/contexto-producto.md; hoy `authorize()` no se usa en ninguna ruta)
- S2: "un productor que olvida su contraseña tiene que poder volver a entrar" — reset de contraseña. Sin SMTP configurado, el camino implementable es reset iniciado por el owner del establecimiento (y por el propio usuario autenticado). El autoservicio por email queda documentado como pendiente de mailer.
- S3: "el front solo crea: un animal con la caravana mal tipeada no se puede corregir" — edición y baja lógica de animales e insumos, en API y en la SPA.
- S4: "cargar stock desde la app" — sin esto el stock queda en cero y las fases con insumo fallan con INSUFFICIENT_STOCK. Alta de stock y de compras desde la SPA.
- S5: toda ruta nueva mantiene el contrato `{data}` / `{error:{code,message,details}}`, RLS por tenant y tests de integración (plan, QA + Seguridad).

## Tasks

- T1 [S3,S5] API: PUT y DELETE (baja lógica) de animales e insumos, tests. Commit: feat(animals,inventory)
- T2 [S3,S4] Front: editar/baja de animal desde la ficha, agregar stock y compras desde Stock. Commit: feat(web)
- T3 [S1,S5] API: usuarios del establecimiento (alta con rol, listado, baja lógica), `authorize()` aplicado a las rutas sensibles, reset de contraseña por owner, tests. Commit: feat(users)
- T4 [S1] Front: pantalla de equipo (alta, roles, baja) y cambio de contraseña. Commit: feat(web)
- T5 Cierre: suites verdes, docs, deploy verificado. Commit: docs

## Log

- L1: "Si comienza con ese bloqueo guarda en memoria todo la lista que nos falta por completar" — usuario autoriza arrancar los 4 bloqueantes; la lista completa (bloqueantes, necesarios y pulido) quedó en memoria Engram con topic_key `ganaderia-pendientes`.
- L2 (cierre): T1 commits ec828e9 (edición/baja animales e insumos, 7 tests), T2 commits 4ca0020 (front: editar/baja + stock + compras), T3 commit 1830013 (usuarios, roles, reset de contraseña; 12 tests; bug de login de usuarios inactivos corregido), T4 commit 5a9bad1 (pantalla Equipo). Suite API 115/115.
- L3 (verificación en producción): GET /api/users 200; alta de operario 201; login del operario 200; el operario intentando crear usuarios → 403. Front desplegado con Equipo, edición y carga de stock.
- Pendiente conocido: los JWT ya emitidos siguen válidos hasta su vencimiento aunque el usuario sea dado de baja; el autoservicio de recuperación por email necesita un mailer configurado.

