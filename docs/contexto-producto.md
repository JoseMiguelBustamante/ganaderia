# GanaderApp — Contexto del Proyecto

> Documento de referencia para diseño y desarrollo. Describe qué es el producto,
> para quién se construye y qué debe lograr. Las decisiones de diseño visual se
> definen después, a partir de este documento.

## 1. Qué es

Un **SaaS de gestión ganadera** multitenant: cada establecimiento ganadero se
registra como un cliente aislado (tenant) y opera su propia información dentro
de la misma aplicación web. El usuario se conecta desde el celular, incluso en
zonas de campo sin señal de internet.

- **Producto web**: React (SPA/PWA), accesible desde el navegador del teléfono.
- **Backend**: API Node.js ya en producción (`ganaderia.187.127.19.244.sslip.io/api`).
- **Base de datos**: PostgreSQL con aislamiento por tenant (Row Level Security).

## 2. Para quién

| Usuario | Qué hace | Dispositivo y contexto |
|---|---|---|
| **Trabajador de campo** | Registra eventos de animales: chequeos, inseminaciones, vacunas, partos | Celular, una sola mano, a pleno sol, a veces con guantes, **sin señal** |
| **Responsable / dueño del establecimiento** | Supervisa el trabajo del día, revisa alertas de stock y lotes, decide compras | Celular o computadora, con señal, entrada diaria |
| **Administrador SaaS** (futuro) | Gestiona su organización: usuarios, equipos, plan contratado | Oficina |

El trabajo real ocurre **en el potrero**: la interfaz principal debe ser operable
sin señal, con una mano, legible bajo el sol y con botones grandes.

## 3. El flujo central (corazón del producto)

1. **Alta de animal**: se registra un bovino con su caravana (y chip, más adelante).
2. **Protocolo de 7 fases**: cada animal recorre un protocolo secuencial:
   **Chequeo → Preparo → Inseminación → Gestación → Preparto → Parto → Destete**.
   Cada fase la completa un equipo responsable y puede requerir insumos.
3. **Consumo de insumos**: al completar una fase se descuentan automáticamente
   las dosis o unidades del inventario, de forma atómica y trazable
   (quedan ligadas al animal y al lote).
4. **Inventario y lotes**: el establecimiento administra proveedores, productos
   por etapa del ciclo, y lotes de semen con dosis totales/disponibles y vencimiento.
5. **Alertas**: el sistema avisa cuando un insumo está bajo su stock mínimo,
   cuando un lote queda con pocas dosis o cuando un lote venció.
6. **Trabajo sin señal**: los eventos se guardan primero en el teléfono y se
   sincronizan solos cuando vuelve la conexión; la interfaz siempre muestra
   qué está pendiente y qué ya se envió.

## 4. Lo que la interfaz debe lograr

- **Registrar un evento en menos de 30 segundos** desde que se abre la app.
- Nunca perder un registro por falta de señal; que el usuario vea claramente
  qué falta sincronizar.
- Que el responsable abra la app por la tarde y en una pantalla entienda
  **cómo estuvo el día** y **qué requiere su acción hoy**.
- Operable con una mano y con guantes; legible a pleno sol.
- Errores y estados en español, con texto claro (no solo colores ni íconos).

## 5. Alcance del MVP (prioridades)

| Módulo | Contenido | Prioridad |
|---|---|---|
| M1 | Registro de propiedad, usuarios y roles, activación de plan | Must |
| M2 | Inventario, proveedores, lotes/dosis de semen, alertas de stock | Must |
| M3 | Ciclo operativo en campo: animales, protocolo de 7 fases, eventos, **offline-first** | Must |
| M4 | Contable mínimo: compras, valorización simple | Should |
| M6 | Reportes y tableros con KPIs | Should |
| M5 | Analítica avanzada / IA | Post-MVP |

Estado actual del desarrollo:
- **Backend completo para M1–M3 en producción** (auth por tenant, animales,
  inventario, lotes de semen, protocolos, alertas). Suite de tests verde.
- **Frontend pendiente**: es la etapa siguiente; los prototipos se definieron
  a partir de este documento.
- Chip de lectura (bastón): **aplazado** hasta confirmar el modelo que usa el dueño.

## 6. Restricciones técnicas

- PWA con service worker; la app funciona sin conexión y sincroniza después.
- APIs existentes que el frontend debe consumir (todas con auth JWT por tenant):
  - `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
  - `POST /api/animals`, `GET /api/animals?search=`, `GET /api/animals/:id`
  - `POST /api/inventory`, `POST /api/inventory/:id/stock`, `GET /api/inventory?stage=`,
    `GET /api/inventory/alerts`
  - `POST /api/suppliers`, `GET /api/suppliers`, `PUT /api/suppliers/:id`, `DELETE /api/suppliers/:id`
  - `POST /api/semen-lots`, `GET /api/semen-lots`, `POST /api/semen-lots/:id/consume`
  - `POST /api/protocols`, `POST /api/protocols/animals/:id/execute`, `GET /api/protocols/animals/:id/executions`
- Contrato de errores uniforme: `{ error: { code, message, details? } }`.
- Idioma de la interfaz: español.

## 7. Pendiente de decisión (dueño del diseño)

El diseño visual (colores, tipografía, layout, densidad, identidad) queda
abierto. Este documento fija **qué** debe lograr la interfaz, no **cómo** se ve.
