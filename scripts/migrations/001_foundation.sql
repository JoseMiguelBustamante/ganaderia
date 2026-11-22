-- 001_foundation: multi-tenant base (S3 of odd/tasks/fase-1-fundacion.md).
-- tenant_id on every table; Row Level Security keyed on the app.current_tenant
-- GUC; stored procedures and functions always receive the tenant explicitly.
-- The API runtime role (ganaderia_app) has NOBYPASSRLS; migrations and system
-- bootstrap run as the admin/owner connection, which bypasses RLS by design.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ganaderia_app') THEN
    CREATE ROLE ganaderia_app LOGIN PASSWORD 'ganaderia_app_dev' NOBYPASSRLS;
  ELSE
    ALTER ROLE ganaderia_app WITH LOGIN PASSWORD 'ganaderia_app_dev' NOBYPASSRLS;
  END IF;
END
$$;

-- citext requires its extension; create it once (superuser-safe here).
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS tenants (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    slug        text NOT NULL UNIQUE,
    plan_status text NOT NULL DEFAULT 'trial'
                CHECK (plan_status IN ('trial', 'active', 'paused')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    name       text NOT NULL,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    email         citext,
    password_hash text NOT NULL,
    display_name  text NOT NULL,
    role          text NOT NULL CHECK (role IN ('owner', 'admin', 'field', 'vet', 'purchasing')),
    team_id       uuid REFERENCES teams (id) ON DELETE SET NULL,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE INDEX idx_teams_tenant    ON teams (tenant_id);
CREATE INDEX idx_users_tenant    ON users (tenant_id);
CREATE INDEX idx_users_tenant_email ON users (tenant_id, email);

-- GUC helper: NULL when app.current_tenant is unset -> every policy fails closed.
CREATE OR REPLACE FUNCTION app_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_tenant', true), '')::uuid;
$$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_isolation ON tenants;
CREATE POLICY tenants_isolation ON tenants
    USING (id = app_tenant_id());

DROP POLICY IF EXISTS teams_isolation ON teams;
CREATE POLICY teams_isolation ON teams
    USING (tenant_id = app_tenant_id());

DROP POLICY IF EXISTS users_isolation ON users;
CREATE POLICY users_isolation ON users
    USING (tenant_id = app_tenant_id());

-- Runtime role privileges, including future tables created by later migrations.
GRANT USAGE ON SCHEMA public TO ganaderia_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ganaderia_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ganaderia_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ganaderia_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO ganaderia_app;

COMMIT;
