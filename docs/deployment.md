# Deployment — Dokploy (patrón Electronica Central)

Cómo se publica esta API en el VPS con Dokploy, usando el mismo patrón que
Electronica_Central_Backend: imagen Docker que escucha en `:80` para Traefik,
PostgreSQL como contenedor del VPS en `127.0.0.1:5432`, y las credenciales
solo como variables de entorno del panel.

## Pre-requisitos del VPS

1. **PostgreSQL del servidor** (contenedor compose, igual que electronica):
   `postgres:16` en `127.0.0.1:5432`, volumen persistente. No hace falta crear
   la base ni el rol a mano: **el arranque del contenedor se auto-bootstrappea**
   (`scripts/bootstrap-db.js` crea la base `ganaderia` y el rol `ganaderia_app`,
   y sincroniza la contraseña del rol con la de `DATABASE_URL` en cada boot).
2. **Contraseñas reales en el panel** (los placeholders `<contra-...>` fallan):
   `ADMIN_DATABASE_URL` con la del superuser del contenedor postgres, y
   `DATABASE_URL` con la contraseña que quieras para el rol runtime — la que
   pongas ahí es la que el rol va a tener después del redeploy.

## Variables de entorno (Dokploy → Application → Environment)

| Variable | Valor en el VPS |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `80` |
| `JWT_SECRET` | string aleatorio ≥ 32 chars (generar: `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `24h` (o la política que defina el producto) |
| `BASE_URL` | `https://ganaderia.<dominio-del-vps>` |
| `DATABASE_URL` | `postgres://ganaderia_app:<tu-contraseña-runtime>@127.0.0.1:5432/ganaderia` — el bootstrap le pone esa contraseña al rol en el arranque |
| `ADMIN_DATABASE_URL` | `postgres://postgres:<contra-admin>@127.0.0.1:5432/ganaderia` |

`127.0.0.1` funciona porque el contenedor de la API corre con `network_mode`
al host de Dokploy igual que las demás apps del patrón. Si el despliegue usa
red de Docker separada, reemplazar por el host del contenedor postgres.

## Imagen

`Dockerfile` (raíz): `node:22-alpine`, `npm ci --omit=dev`, `EXPOSE 80`. El
comando de arranque aplica migraciones (`scripts/migrate.js --db dev`) con la
conexión admin **antes** de levantar la API con el rol runtime — así el
esquema siempre está al día del código desplegado y la API nunca corre con
privilegios de owner.

## Pasos de creación del servicio (Dokploy)

1. Push de `main` a GitHub (`JoseMiguelBustamante/ganaderia`).
2. `~/.dokploy/deploy-app.sh` con: nombre, URL del repo, branch `main`,
   host `ganaderia.<dominio>`, build `dockerfile`.
3. Cargar las variables de entorno de la tabla anterior en la app.
4. Redeploy para que el contenedor arranque con el entorno completo.

## Verificación post-deploy

```bash
curl https://ganaderia.<dominio>/api/health          # {"data":{"status":"ok"}}
# alta de tenant de prueba y flujo demo del README
```

## Conocido / pendiente de esta fase

- El e2e de Playwright del walking skeleton no corrió en el entorno de origen
  (falta `libatk`/`libnss` para Chromium y no hay sudo); el spec está
  commiteado y corre en una máquina con deps de sistema o en CI.
- Los movimientos de stock y la ejecución de fases son atómicos por CALL,
  pero la contención concurrente (sync offline de Fase 3) agregará
  `SELECT ... FOR UPDATE` sobre el stock.
