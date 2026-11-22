-- 002_auth: stored procedures and functions for the auth module (T3).
-- sp_* are procedures invoked with CALL; fn_* are functions read with SELECT.
-- Onboarding and login resolve across tenants on the system connection; the
-- per-tenant read (fn_get_user_by_id) runs under RLS through withTenant.

BEGIN;

CREATE OR REPLACE PROCEDURE sp_create_tenant_with_owner(
    p_name text,
    p_slug text,
    p_email citext,
    p_password_hash text,
    p_display_name text,
    INOUT p_result json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tenant_id uuid;
    v_team_id uuid;
    v_user_id uuid;
BEGIN
    INSERT INTO tenants (name, slug) VALUES (p_name, p_slug)
        RETURNING id INTO v_tenant_id;

    INSERT INTO teams (tenant_id, name) VALUES (v_tenant_id, 'Propietarios')
        RETURNING id INTO v_team_id;

    INSERT INTO users (tenant_id, email, password_hash, display_name, role, team_id)
    VALUES (v_tenant_id, p_email, p_password_hash, p_display_name, 'owner', v_team_id)
        RETURNING id INTO v_user_id;

    p_result := json_build_object(
        'tenant', json_build_object(
            'id', v_tenant_id, 'name', p_name, 'slug', p_slug, 'planStatus', 'trial'),
        'user', json_build_object(
            'id', v_user_id, 'tenantId', v_tenant_id, 'email', p_email,
            'displayName', p_display_name, 'role', 'owner')
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_tenant_by_slug(p_slug text)
RETURNS TABLE (id uuid, name text, slug text, plan_status text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT t.id, t.name, t.slug, t.plan_status
    FROM tenants t
    WHERE t.slug = p_slug
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION fn_get_user_by_tenant_and_email(p_tenant_id uuid, p_email citext)
RETURNS users
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT u.*
    FROM users u
    WHERE u.tenant_id = p_tenant_id
      AND u.email = p_email
      AND u.is_active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION fn_get_user_by_id(p_user_id uuid)
RETURNS users
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT u.*
    FROM users u
    WHERE u.id = p_user_id
      AND u.tenant_id = app_tenant_id()
    LIMIT 1;
$$;

COMMIT;
