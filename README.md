# ganaderia

Livestock management backend API (Node.js + Express + PostgreSQL).

## Architecture

Controller → Service → Repository. All filtering and processing happens in
PostgreSQL stored functions/procedures; repositories pass explicit parameters
and never transform data.

```
src/
├── config/       # env (Zod-validated), logger, errorCodes, constants (SQL names)
├── db/           # postgres.js: executeQuery / executeStoreProcedure (only pg import)
├── controllers/  # request/response handling, reads req.validated
├── dto/          # Zod schemas per resource and operation
├── middlewares/  # auth (JWT), validateBody/Query/Params
├── repositories/ # only layer touching the database
├── services/     # pure business logic, throws AppError
├── routes/       # route assembly: authenticate → authorize → validate → controller
└── utils/        # AppError, sendError
```

## Environment variables

Copy `.env.example` (create it locally; never commit real secrets) or export:

| Variable | Required | Example |
|---|---|---|
| `PORT` | no (default 3000) | `3000` |
| `NODE_ENV` | no | `development` |
| `JWT_SECRET` | yes (min 32 chars) | long random string |
| `JWT_EXPIRES_IN` | no (default 24h) | `24h` |
| `BASE_URL` | yes | `http://localhost:3000` |
| `DATABASE_URL` | yes | `postgres://user:pass@localhost:5432/ganaderia` |

The process exits at startup if a required variable is missing or invalid.

## Run

```bash
npm install
npm run dev
```

## Dependencies (install when adding the first feature)

- `ultimate-express` — router (Express-compatible API)
- `zod` — DTO validation
- `pg` — PostgreSQL driver (only imported in `src/db/postgres.js`)
- `jsonwebtoken` — auth middleware
- `dotenv` — load `.env` in `index.js` before importing `env`

## Testing

```
test/
├── integration/
├── performance/   # k6 scripts
└── unit-test/     # controllers, middlewares, services
```
