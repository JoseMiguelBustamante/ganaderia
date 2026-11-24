# Production API image. Listens on :80 so Traefik/Dokploy can reach it
# the same way as other apps on this VPS (mirrors Electronica_Central_Backend).
# The embedded dev database is never shipped: production connects to the VPS
# PostgreSQL via DATABASE_URL / ADMIN_DATABASE_URL.
FROM node:22
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80

# Apply production bootstrap (role + database) and schema migrations as the
# admin connection, then boot the API as the least-privileged runtime role
# (RLS enforced, NOBYPASSRLS). DATABASE_URL's password defines the runtime
# role password; bootstrap rotates it in the same boot.
CMD ["sh", "-c", "node scripts/container-env.js && . /tmp/container-env.sh && node scripts/bootstrap-db.js && node scripts/migrate.js --db dev && node index.js"]
