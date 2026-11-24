# Plan de Trabajo v2 — SaaS de Gestión Ganadera

Documento operativo y técnico para desarrollar el sistema SaaS de gestión ganadera con un
equipo de cinco personas en 12 semanas. Reemplaza a la versión 1 del Plan Maestro
(reunión de arquitectura del 19/11/2026). Los cambios principales: **un solo stack de
backend (Node.js)** y frontend (React), backend como **monolito modular**, un
**walking skeleton** al final de la Fase 1, y requisitos transversales que la v1 no
cubría (offline en campo, QA automatizado, contratos de eventos, valorización temprana).

## Quick path

1. Aprobar la decisión de arquitectura (sección 1).
2. Revisar la hoja de ruta 12 semanas (sección 5) y el alcance MVP (sección 4).
3. Crear las épicas en Jira (incluida la nueva épica M0) y asignar los primeros tickets.

---

## 1. Decisiones de arquitectura (cambios v1 → v2)

| Tema | v1 | v2 | Razón |
|---|---|---|---|
| Backend | 3 stacks: Node + Spring Boot + Python | **Un solo backend Node.js**, monolito modular | 4 stacks para 5 personas significaban 4 pipelines, 4 integraciones de auth y dueños únicos por servicio. Los módulos cruzan datos constantemente (acasalamiento descuenta inventario; contable valora eventos de campo): en microservicios eso exige transacciones distribuidas que el equipo y el plazo no pueden pagar. |
| Frontend | React | React (igual) | Sin cambios. Se desarrolla como SPA + PWA con soporte offline (sección 6). |
| Organización | Microservicios desde el día 1 | Monolito modular con **límites de dominio internos** (módulo = rutas + dto + service + repository). La extracción futura queda sujeta a disparadores objetivo (sección 8). | Permite transacciones locales (una transacción de PostgreSQL cubre acasalamiento + descuento de stock), un pipeline, un despliegue y revisión simple desde el día 1. |
| Base de datos | (no definido en v1) | PostgreSQL única. **Multi-tenant: `tenant_id` en todas las tablas + Row Level Security**; los stored procedures reciben el tenant como parámetro obligatorio. | Alineado con la arquitectura de stored procedures ya definida en el repo. Decisión no negociable después: se fija en la semana 1. |
| Contable | Spring Boot | Módulo interno Node (Fase 4) | Queda en Node; si crece a complejidad ERP, se extrae como servicio (disparador, sección 8). |
| Chip / IA | Python | **Contrato de ingestión agnóstico** (`POST /ingest/lecturas`) servido por el backend Node. Los modelos predictivos quedan post-MVP. | El hardware no exige Python: los bastones lectores entregan series por HTTP o a una app puente. Si algún SDK obliga a Python, vuelve como servicio aislado de ingestión (disparador). |

**Stack v2:** Node.js (≥20, ultimate-express, Zod, pg, JWT) · React (PWA) · PostgreSQL · CI + staging.

## 2. Organización del código

| Elemento | Decisión |
|---|---|
| Repositorio | Monorepo recomendado: `apps/api` (backend actual) y `apps/web` (React). Alternativa aceptada: repos separados con versionado coordinado de contratos. |
| Módulos backend | `src/modules/{usuarios,proveedores,inventario,animales,protocolos,contable,reportes}` con la estructura Controller → Service → Repository existente. |
| Base de datos | Un esquema `public` con `tenant_id`; stored procedures por dominio (`config/constants.js` centraliza sus nombres). |
| Eventos de dominio | Catálogo único (`docs/eventos.md`, se crea en Fase 1): `animal.registrado`, `animal.chip_vinculado`, `fase.completada`, `acasalamiento.registrado`, `insumo.consumido`, `compra.registrada`. Sirve a los tableros (M6) y deja maduro el diseño para extraer servicios más adelante. |

## 3. Equipo y roles (v2, mapeado al stack único)

| Integrante | Rol | Foco |
|---|---|---|
| Miguel Justiniano | PO + Diseño UI/UX | Prototipos web y de campo, criterios de aceptación en Jira, QA de usabilidad, aprobación de entregas. |
| Daniel Montaño | Líder técnico / Arquitecto | Multi-tenant, modelado de datos, motor de protocolos, despliegue y observabilidad. |
| Montoya | Desarrollo backend | Motor de fases 1–7, acasalamiento/inseminación, módulo contable. |
| Cristian Arauz | Desarrollo backend | Inventario, lotes de semen, ingestión de lecturas de chip, alertas de stock. |
| José Miguel Bustamante | Desarrollo frontend | React: usuarios, equipos, compras, tableros; integración con las APIs. |

Revisión cruzada obligatoria: **todo PR lo revisa el par de otro dominio** (ningún dominio
depende de un solo revisor). Daniel no revisa todo: rota.

## 4. Alcance del MVP (MoSCoW)

| Módulo | Alcance en 12 semanas | Prioridad |
|---|---|---|
| M1. Incorporación, Usuarios y Configuración SaaS | Registro de propiedad (secundario → principal), roles y equipos, activación de plan (máquina de estados del plan; **cobros reales solo si el piloto los exige**). | Must |
| M2. Inventario, Proveedores y Control de Semen | Proveedores, catálogo de productos por etapa, lotes/dosis de semen, alertas de stock mínimo. | Must |
| M3. Ciclo Operativo en Campo | Registro individual de bovino, lectura de serie/chip, protocolo de 7 fases secuencial, acasalamiento/inseminación con descuento automático y atómico de insumos. **Offline-first.** | Must |
| M4. Contable y Financiero | Compras, cuentas por pagar, valorización simple del ganado, costo por protocolo/etapa. Sin estados financieros completos. | Should |
| M5. Consolidación y Analítica | Solo **diseño y captura del event-log** desde la Fase 1. Modelos predictivos e IA: post-MVP. | Won't (MVP) |
| M6. Reportes y Tableros | KPIs básicos, reportes operativos y financieros exportables, alertas tempranas. | Should |

## 5. Hoja de ruta 12 semanas

La regla de oro de la v1 se mantiene: **ninguna interfaz sin prototipo aprobado por
UI/UX; nada pasa a Done sin validación del PO en campo.**

### Fase 1 (Semanas 1–3): Fundación y primera prueba de integración

- Semana 1: modelo de datos multi-tenant (esquema + RLS), **diseño del modelo del motor de protocolos** (entidades Animal, Protocolo, FaseEjecutada, Equipo responsable, Insumo consumido; contratos API de fases escritos, no implementados), decisión de **ligar cada gasto a animal/lote/evento** para la valorización (ver sección 6).
- Semanas 1–3: módulos M0 (fundación) y M1 (SaaS/usuarios): JWT con tenant, roles y equipos, planes, esqueleto React, CI/CD, staging.
- **Walking skeleton — Definition of Done de la Fase 1:** flujo vertical mínimo completo y testeado: login → alta de animal → completar fase 1 del protocolo → descuento de un insumo en inventario, recorriendo React → API → PostgreSQL con un test e2e. La UI es provisoria; la integración no queda para la semana 12.
- Entregables UI/UX: prototipos de login/equipos y primer boceto de pantallas de campo.

### Fase 2 (Semanas 4–6): Inventario, semen y spike de hardware

- M2 completo: proveedores, productos por etapa, lotes/dosis, alertas de stock.
- **Spike de chip en semanas 4–5** (no semana 7): leer series con el bastón real, validar el puente de conexión, definir y congelar el contrato `POST /ingest/lecturas` (incluye flujo de lectura fallida y carga diferida). La UI debe funcionar manual-first: el chip acelera, no bloquea.
- Prototipos de campo probados en dispositivo: una mano, guantes, sol.

### Fase 3 (Semanas 7–9): Campo, protocolos y acasalamiento

- Motor de fases 1–7 con transiciones validadas y responsables por etapa, acasalamiento/inseminación con **descuento atómico en una transacción** (animal + fase + insumos) y trazabilidad por animal.
- **PWA offline-first** (sección 6) sobre el flujo de campo.
- Chip integrado según el contrato de la Fase 2.

### Fase 4 (Semanas 10–12): Contable, reportes y MVP

- M4 mínimo: compras, cuentas por pagar, valorización (usa los vínculos de gasto ya capturados desde Fase 1, sin reconstruir datos).
- M6: tableros KPI y reportes exportables sobre el event-log.
- Pruebas integrales de usabilidad en campo, despliegue del MVP.
- **Revisión de disparadores** (sección 8): decidir si algo ya justifica extracción, con datos de las 10 semanas anteriores.

## 6. Requisitos transversales (nuevos en v2)

| Tema | Decisión |
|---|---|
| **Offline en campo** | El potrero no tiene señal: PWA con service worker, **cola de operaciones pendientes** y sincronización con resolución autoritativa del servidor. El Módulo 3 se diseña offline desde el día 1; no se descubre con la demo en puerta. |
| **Valorización temprana** | Todo gasto (compra de insumo, servicio, evento sanitario) se registra **ligado a animal, lote o evento** en el momento en ocurre. Sin esa decisión en la semana 1, la valorización de la Fase 4 requiere reconstruir historial. |
| **QA automatizado** | La única validación no puede ser el PO. Cada HU lleva sus criterios de aceptación en Gherkin; un test e2e por módulo (React: Playwright; API: supertest); **staging desde la Fase 1**; prueba de carga k6 sobre el flujo de protocolo antes del MVP. El pipeline valida que nada se rompa; el PO valida que sea usable. |
| **Contratos de eventos** | Aun en monolito, los módulos publican/consumen solo por el catálogo de eventos de la sección 2. Ningún módulo consulta las tablas internas de otro módulo. |
| **Seguridad** | JWT por tenant, RLS en PostgreSQL, secretos solo en variables de entorno (documentadas en README, nunca commiteadas). |

## 7. Gestión en Jira (v1 ajustada)

- Se mantiene: tablero Scrum, sprints de 2 semanas, jerarquía Épica → HU → Subtarea, estados To Do → In Progress → Ready for QA → Done, ceremonias de la v1 (planning quincenal 1 h, sync lunes/miércoles/viernes 15 min, review + demo UX quincenal 45 min).
- **Nueva épica M0 – Fundamentos transversales:** autenticación y tenant, CI/CD, staging, catálogo de eventos, esqueleto React. La v1 no la tenía y es justo lo que consume la Fase 1.
- Las HU se escriben **verticales** (valor recorrible de punta a punta), no por capas, para evitar el crunch de integración.
- Criterios de aceptación en Gherkin dentro de cada ticket (ver QA).

## 8. Riesgos y disparadores de revisión

| Riesgo | Mitigación |
|---|---|
| Hardware del bastón/chip impredecible | Spike en semanas 4–5; ingesta manual operativa hasta que el chip confirme; contrato congelado antes de Fase 3. |
| Sincronización offline con conflictos | Regla simple y documentada: el servidor manda; la UI muestra qué se sincronizó y qué quedó pendiente. Datos críticos validados en servidor, no solo en cliente. |
| RLS/stored procedures mal ajustados | Diseño y prueba de tenancy en la semana 1 con tests que simulan dos tenant. |
| Valorización sin base de costos | Vínculo gasto → animal/lote/evento obligatorio desde la Fase 1. |

**Disparadores para reabrir la decisión de extracción de servicios** (se evalúan al cierre de cada fase):
1. Carga analítica o reportes que degraden el core operativo en producción.
2. El módulo contable crece hacia complejidad ERP (multipaís, multimoneda, conciliación).
3. Un SDK de hardware solo integre en otro lenguaje.
4. El equipo crece por encima de ~8 desarrolladores y los límites de módulo empiezan a chocar en las revisiones de código.

Si nada dispara, el monolito continúa: es la opción más barata hasta que una medida diga lo contrario.

## Checklist

- [ ] El equipo aprobó el stack v2 (Node + React) y la tabla de la sección 1.
- [ ] M0 existe como épica en Jira y la Fase 1 tiene el walking skeleton como Definition of Done.
- [ ] La decisión de valorización (gasto ligado a animal/lote/evento) está registrada en la épica correspondiente.
- [ ] El spike de chip está agendado para las semanas 4–5 con el bastón real disponible.
- [ ] Staging y CI funcionan desde la semana 2.

## Next step

Con el plan aprobado: crear épicas M0–M6 en Jira, y desdoblar la Fase 1 en HUs verticales
la primera semana (el walking skeleton es la primera de ellas).

---

## Estado de ejecución (actualizado)

| Fase | Alcance | Estado |
|---|---|---|
| Fase 1 | Fundación multi-tenant, auth, walking skeleton | Cerrada |
| Fase 2 | Inventario, proveedores, catálogo por etapa, lotes de semen, alertas | Cerrada (backend) |
| Fase 3 | Motor de fases 1–7, inseminación con descuento atómico, equipos por etapa, estado por animal, PWA offline con cola de sincronización | Cerrada |
| Fase 4 | Compras, cuentas por pagar, valorización por animal y por etapa, reportes KPI | Cerrada en su alcance mínimo (M4/M6 del MoSCoW) |

Pendientes explícitos: spike del bastón lector (aplazado hasta conocer el modelo
del hardware), analítica/IA (M5, post-MVP) e instalación de iconos de aplicación
para la PWA.

### Bloque de entrega (post plan)

Resuelto y verificado en producción: usuarios con roles (dueño, encargado,
operario, veterinario) y permisos aplicados en las rutas; alta y baja de
personal con protección del último dueño; cambio y reset de contraseña;
edición y baja lógica de animales e insumos; carga de stock y de compras
desde la app. Suite de la API: 115 tests.

Siguiente bloque pendiente (operar con confianza): pantallas de proveedores,
lotes de semen y compras; reportes exportables; backups y monitoreo; rate
limiting; ambiente de staging; e2e y prueba de carga.

