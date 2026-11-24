-- 014_login_by_email: login resolves tenant+user from the email alone.
-- Email is unique per tenant but owners register one tenant per email in
-- practice; the resolver returns the owner's tenant for that email.
BEGIN;

CREATE OR REPLACE FUNCTION fn_get_login_context_by_email(p_email citext)
RETURNS TABLE (
    tenant_id uuid, tenant_name text, tenant_slug text, plan_status text,
    user_id uuid, email citext, password_hash text, display_name text,
    role text, team_id uuid
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT t.id, t.name, t.slug, t.plan_status,
           u.id, u.email, u.password_hash, u.display_name, u.role, u.team_id
    FROM users u
    JOIN tenants t ON t.id = u.tenant_id
    WHERE u.email = p_email
    ORDER BY CASE WHEN u.role = 'owner' THEN 0 ELSE 1 END, u.created_at
    LIMIT 1;
$$;

COMMIT;
