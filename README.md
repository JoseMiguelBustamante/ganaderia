# Backend ganaderia — API

API de gestión ganadera multi-tenant (Node.js + ultimate-express + PostgreSQL).
Monolito modular: cada dominio es un módulo interno con la separación
Controller → Service → Repository y toda la lógica de datos en stored
procedures/functions de PostgreSQL. El aislamiento entre tenants lo aplica
Row Level Security en la base (no en el código de aplicación).

## Quick start

```bash
npm install
npm run db:up          # PostgreSQL embebido en 127.0.0.1:55432 (dev)
npm run dev            # API en http://127.0.0.1:3100 (env dev por defecto)
npm run web:dev        # SPA React en http://127.0.0.1:5901 (proxea /api a 3100)
```

## Commands

| Command | Qué hace |
|---|---|
| `npm run db:up` | Inicia el clúster embebido (crea DBs `ganaderia` y `ganaderia_test`) |
| `npm run db:init` | Crea los archivos del clúster y deja el servidor detenido |
| `npm run db:down` | Detiene el clúster |
| `npm run db:reset` | Borra el clúster y lo recrea (destruye datos locales) |
| `npm run db:smoke` | Clúster efímero de un solo uso: conecta, consulta y corta |
| `npm run db:migrate` | Aplica `scripts/migrations/*.sql` en dev y test (idempotente) |
| `npm test` | Suite de integración (clúster efímero, puerto 55433) |
| `npm run dev` | API con defaults de desarrollo (sin archivos .env) |
| `npm run web:dev` | Frontend Vite en 5901 con proxy `/api` → 3100 |
| `npm run e2e` | Playwright (requiere `npx playwright install chromium`) |

## Environment variables

El proceso sale al arrancar si falta una requerida. No hay `.env` commiteado:
`npm run dev` inyecta defaults de desarrollo; producción recibe las variables
desde el entorno (ver `docs/deployment.md`).

| Variable | Requerida | Dev default | Uso |
|---|---|---|---|
| `PORT` | no | `3100` con dev | Puerto HTTP de la API |
| `NODE_ENV` | no | `development` | `development` / `test` / `production` |
| `JWT_SECRET` | **sí** (min 32) | dev-only secret | Firma de tokens |
| `JWT_EXPIRES_IN` | no | `24h` | Vida del JWT |
| `BASE_URL` | **sí** | `http://localhost:3100` | URL pública base |
| `DATABASE_URL` | **sí** | rol `ganaderia_app` en 55432 | Conexión runtime (RLS activa) |
| `ADMIN_DATABASE_URL` | no | rol `postgres` en 55432 | owner: migraciones, bootstrap, login |

**Regla de tenancy:** `DATABASE_URL` SIEMPRE conecta con un rol sin
`BYPASSRLS` (`ganaderia_app`); `ADMIN_DATABASE_URL` se usa solo para mover
transversalmente tenants (registro, login, migraciones). Ver `docs/deployment.md`
para rotar la contraseña del rol en producción.

## Modules & endpoints

| Módulo | Endpoints | Notas |
|---|---|---|
| SaaS / auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Tenant + owner; slug+email+password; genera JWT `{sub, tenantId, role}` |
| Animales | `POST /api/animals`, `GET /api/animals?search=`, `GET /api/animals/:id` | Caravana/chip únicos entre activos; 409 por duplicado |
| Inventario | `POST /api/inventory`, `POST /api/inventory/:id/stock`, `GET /api/inventory/:id`, `GET /api/inventory?stage=`, `GET /api/inventory/alerts` | Stock con ledger `stock_movements` ligado a animal; etiqueta `stage` (catálogo por etapa: chequeo/inseminación/...); `alerts` agrupa items bajo mínimos, lotes ≤3 dosis y lotes vencidos |
| Proveedores | `POST /api/suppliers`, `GET /api/suppliers?activeOnly=`, `GET /api/suppliers/:id`, `PUT /api/suppliers/:id`, `DELETE /api/suppliers/:id` | Nombre único case-insensitive por tenant; DELETE es baja lógica |
| Lotes de semen | `POST /api/semen-lots`, `GET /api/semen-lots`, `GET /api/semen-lots/:id`, `POST /api/semen-lots/:id/consume` | Lote ligado a item (solo categoría semen) y proveedor; consumo atómico en una transacción: lote + stock + ledger, con `animalId` opcional para trazabilidad |
| Protocolos | `POST /api/protocols`, `POST /api/protocols/breeding`, `GET /api/protocols`, `POST /api/protocols/animals/:id/execute`, `GET /api/protocols/animals/:id/status?protocolId=`, `GET /api/protocols/animals/:id/executions` | 1–7 fases; ejecución secuencial; descuento atómico en el mismo CALL; `breeding` crea la plantilla estándar de 7 fases (idempotente); `execute` acepta `semenLotId`+`doses` para consumir un lote específico atómicamente; `status` devuelve fases con estado completed/current/pending |
| Equipos | `POST /api/teams`, `GET /api/teams` | Equipos responsables; una fase puede llevar equipo por defecto (`defaultTeamId`), usado si la ejecución no manda `teamId` |
| Compras / cuentas por pagar | `POST /api/purchases`, `GET /api/purchases?status=`, `GET /api/purchases/:id`, `POST /api/purchases/:id/payments`, `GET /api/purchases/payables-summary` | Compra contable mínima, pagos atómicos parciales/totales; filtro pending/partial/paid |
| Reportes / valorización | `GET /api/reports/animals/:id/costs`, `GET /api/reports/stage-costs`, `GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | Costos estimados y KPI aislados por tenant; todas las rutas requieren JWT |

Contrato de respuesta: éxito `{ data: ... }`; error
`{ error: { code, message, details? } }` con códigos de `src/config/errorCodes.js`.
Razones de negocio finas van en `details.reason`
(`INVALID_CREDENTIALS`, `EAR_TAG_ALREADY_EXISTS`, `PHASE_OUT_OF_SEQUENCE`, ...).

## Compras, valorización y KPI

Migraciones `015`–`017`. `POST /api/purchases` requiere solamente
`{ "description": "Servicio sanitario", "totalAmount": 100 }`.
Opcionales: `supplierId`, `purchasedAt` (default fecha actual), `dueDate`, y
`itemId` + `quantity` (deben enviarse juntos). Fechas: `YYYY-MM-DD` válido;
montos positivos de hasta 2 decimales; cantidad positiva de hasta 3 decimales.
Proveedor e insumo deben pertenecer al tenant. No hay tabla de detalle;
una compra puede representar un servicio o un único insumo. Registrar la compra
**no modifica stock**: para ingresos se usa el endpoint de inventario existente.

`POST /api/purchases/:id/payments` recibe `{ "amount": 40 }` y devuelve la
compra actualizada (200). El pago bloquea la compra en la misma transacción,
actualiza `paidAmount` y pasa a `partial` o `paid`. Rechaza sin mutación
`PAYMENT_EXCEEDS_TOTAL` y `PAYMENT_MUST_BE_POSITIVE` (422, `BUSINESS_RULE`,
`details.reason`); una compra inexistente o ajena devuelve 404
(`PURCHASE_NOT_IN_TENANT` al pagar). No se editan ni eliminan compras en este MVP.
`payables-summary` devuelve `{totalPending, totalPaid, countPending, overdueCount}`:
pendiente es el saldo, pagado es la suma de abonos; vencida significa
`dueDate < CURRENT_DATE` y estado distinto de `paid`.

Precio unitario estimado: promedio aritmético **no ponderado** de
`totalAmount / quantity` de todas las compras del mismo `itemId` y tenant,
independientemente de su fecha o estado de pago; sin compras vale 0.
Las compras sin insumo no aportan precio. No es costo histórico ni una
valorización de mercado: nuevas compras pueden cambiar estimaciones anteriores.
El costo por animal considera solo movimientos negativos ligados a ese animal,
con `{animalId, totalCost, movements:[{movementId,itemId,itemName,qty,occurredAt,estimatedCost}]}`;
redondea cada costo estimado a 2 decimales. Un animal ajeno devuelve 404.
Por etapa agrega ejecuciones por número y nombre de fase, usando el insumo y
cantidad requeridos de su definición actual; devuelve
`[{phaseNumber,phaseName,executions,estimatedCost}]`. No incluye costos de
servicios sin consumo ni reemplaza la cantidad de fase por dosis particulares de
un lote de semen.

`reports/summary` devuelve
`{animals:{total,active,byPhase:[{phaseNumber,phaseName,count}]},
inventory:{lowStockItems,expiredLots,lowDoseLots},
consumption:{movements,totalUnits},purchases:{total,paid,pending},executions:{total}}`.
`purchases` contiene montos, no cantidades de compras. Solo consumos (ledger
negativo, no ingresos de stock) y compras se filtran por fecha, con ambos extremos
incluidos. Por defecto son hoy y los 29 días anteriores; con solo `to`, son los
30 días terminados en esa fecha; con solo `from`, termina hoy. Un intervalo
invertido o fecha inválida devuelve 400. Las fechas de consumos usan la zona
horaria de PostgreSQL. Los demás contadores representan el estado global actual:
`byPhase` cuenta animales en la última fase completada de cada protocolo (un
animal puede figurar en varios protocolos); las alertas reutilizan las reglas de
`inventory/alerts` y devuelven cantidades; ejecuciones incluye todo el historial.

## Architecture

```
src/
├── config/       # env (Zod), logger, errorCodes, constants (nombres SQL)
├── db/           # postgres.js: executeQuery / executeStoreProcedure /
│                 #   withTenant (GUC + RLS) / withSystem (owner, bootstrap)
├── controllers/  # request/response, lee req.validated
├── dto/          # schemas Zod por recurso y operación
├── middlewares/  # authenticate/authorize (JWT), validateBody/Query/Params
├── repositories/ # única capa que toca la DB (params explícitos, sin lógica)
├── services/     # lógica de negocio, AppError, forma pública camelCase
├── routes/       # authenticate → validate → controller
└── utils/        # AppError, sendError
apps/web/         # SPA React del walking skeleton
scripts/          # db.js (ciclo del clúster), migrate.js, migrations/*.sql
test/
├── integration/  # suite vitest sobre clúster efímero
└── e2e/          # Playwright walking-skeleton
```

Convenciones completas: skill `node` (Controller → Service → Repository,
DTOs Zod en route, logger local, errores en tabla local, ES Modules).
Reglas de datos en `scripts/migrations/` (todo filtro y procesamiento en SQL;
`tenant_id` + RLS en todas las tablas; SPs reciben el tenant como parámetro
y guardan con `app_tenant_id()`).

## Testing

```bash
npm test      # integración + unitarios: RLS, auth, inventario, protocolos, compras y reportes
```

Cada módulo lleva su test de integración que pisa el contrato público
(status codes, códigos de error, aislamiento entre tenants). El e2e de
browser completa el recorrido visual del walking skeleton cuando el
entorno tiene Chromium instalable.
