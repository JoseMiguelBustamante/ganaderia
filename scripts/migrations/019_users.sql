-- 019_users: tenant staff and authenticated password reset (S1, S2, S5).
-- is_active already exists in 001. Retain legacy roles for existing data;
-- the new user API only accepts owner, manager, operator and vet.
-- Multiple owners are allowed; serializing deactivation on the tenant row
-- ensures concurrent requests cannot remove the last active owner.
-- Email self-service recovery remains pending an SMTP/mailer integration.
BEGIN;

ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('owner', 'manager', 'operator', 'vet', 'admin', 'field', 'purchasing'));

CREATE OR REPLACE PROCEDURE sp_create_user(
    p_tenant_id uuid, p_email citext, p_password_hash text,
    p_display_name text, p_role text, p_team_id uuid,
    INOUT p_user json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user users;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    IF p_role IS NULL OR p_role NOT IN ('owner', 'manager', 'operator', 'vet') THEN
        RAISE EXCEPTION 'ROLE_NOT_ALLOWED' USING ERRCODE = 'P0001';
    END IF;
    IF p_team_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM teams WHERE id = p_team_id AND tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'TEAM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO users (tenant_id, email, password_hash, display_name, role, team_id)
    VALUES (p_tenant_id, p_email, p_password_hash, p_display_name, p_role, p_team_id)
    RETURNING * INTO v_user;
    p_user := json_build_object(
        'id', v_user.id, 'tenantId', v_user.tenant_id, 'email', v_user.email,
        'displayName', v_user.display_name, 'role', v_user.role,
        'teamId', v_user.team_id, 'isActive', v_user.is_active, 'createdAt', v_user.created_at
    );
END;
$$;

CREATE OR REPLACE PROCEDURE sp_deactivate_user(
    p_tenant_id uuid, p_user_id uuid, INOUT p_id uuid DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user users;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    PERFORM 1 FROM tenants WHERE id = p_tenant_id FOR UPDATE;
    SELECT * INTO v_user FROM users
    WHERE id = p_user_id AND tenant_id = p_tenant_id AND is_active FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    IF v_user.role = 'owner' AND NOT EXISTS (
        SELECT 1 FROM users WHERE tenant_id = p_tenant_id
          AND role = 'owner' AND is_active AND id <> p_user_id
    ) THEN
        RAISE EXCEPTION 'LAST_OWNER' USING ERRCODE = 'P0001';
    END IF;
    UPDATE users SET is_active = false WHERE id = p_user_id AND tenant_id = p_tenant_id;
    p_id := p_user_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_change_user_password(
    p_tenant_id uuid, p_user_id uuid, p_password_hash text,
    INOUT p_id uuid DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    UPDATE users SET password_hash = p_password_hash
    WHERE id = p_user_id AND tenant_id = p_tenant_id AND is_active;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    p_id := p_user_id;
END;
$$;

-- Public columns only: never send password hashes through the staff list.
CREATE OR REPLACE FUNCTION fn_get_all_users(p_tenant_id uuid, p_include_inactive boolean DEFAULT false)
RETURNS TABLE (id uuid, tenant_id uuid, email citext, display_name text,
    role text, team_id uuid, is_active boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY SELECT u.id, u.tenant_id, u.email, u.display_name,
        u.role, u.team_id, u.is_active, u.created_at
    FROM users u WHERE u.tenant_id = p_tenant_id AND u.tenant_id = app_tenant_id()
      AND (p_include_inactive IS TRUE OR u.is_active)
    ORDER BY u.created_at, u.id;
END;
$$;

-- Cross-tenant bootstrap resolver deliberately runs on the system connection;
-- retain the existing email-only ordering but exclude deactivated accounts.
CREATE OR REPLACE FUNCTION fn_get_login_context_by_email(p_email citext)
RETURNS TABLE (
    tenant_id uuid, tenant_name text, tenant_slug text, plan_status text,
    user_id uuid, email citext, password_hash text, display_name text,
    role text, team_id uuid
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT t.id, t.name, t.slug, t.plan_status,
           u.id, u.email, u.password_hash, u.display_name, u.role, u.team_id
    FROM users u JOIN tenants t ON t.id = u.tenant_id
    WHERE u.email = p_email AND u.is_active
    ORDER BY CASE WHEN u.role = 'owner' THEN 0 ELSE 1 END, u.created_at
    LIMIT 1;
$$;

COMMIT;
