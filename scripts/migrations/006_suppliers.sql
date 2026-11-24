-- 006_suppliers: tenant-scoped suppliers directory (Fase 2 / M2, T1).
BEGIN;

CREATE TABLE suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    name text NOT NULL,
    contact_name text,
    phone text,
    email text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness per tenant (functional index; plain UNIQUE is
-- case-sensitive and would accept "vet central" next to "Vet Central").
CREATE UNIQUE INDEX suppliers_tenant_name_ci ON suppliers (tenant_id, lower(name));

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY suppliers_isolation ON suppliers
    USING (tenant_id = app_tenant_id());

CREATE OR REPLACE PROCEDURE sp_create_supplier(
    p_tenant_id uuid, p_name text, p_contact_name text, p_phone text, p_email text,
    INOUT p_supplier json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_supplier suppliers;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    INSERT INTO suppliers (tenant_id, name, contact_name, phone, email)
    VALUES (p_tenant_id, p_name, p_contact_name, p_phone, p_email)
    RETURNING * INTO v_supplier;
    p_supplier := json_build_object(
        'id', v_supplier.id, 'tenantId', v_supplier.tenant_id, 'name', v_supplier.name,
        'contactName', v_supplier.contact_name, 'phone', v_supplier.phone,
        'email', v_supplier.email, 'isActive', v_supplier.is_active
    );
END;
$$;

CREATE OR REPLACE PROCEDURE sp_update_supplier(
    p_tenant_id uuid, p_supplier_id uuid, p_contact_name text, p_phone text, p_email text,
    INOUT p_supplier json DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_supplier suppliers;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    UPDATE suppliers
    SET contact_name = COALESCE(p_contact_name, contact_name),
        phone = COALESCE(p_phone, phone),
        email = COALESCE(p_email, email)
    WHERE id = p_supplier_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
      AND is_active
    RETURNING * INTO v_supplier;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SUPPLIER_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    p_supplier := json_build_object(
        'id', v_supplier.id, 'tenantId', v_supplier.tenant_id, 'name', v_supplier.name,
        'contactName', v_supplier.contact_name, 'phone', v_supplier.phone,
        'email', v_supplier.email, 'isActive', v_supplier.is_active
    );
END;
$$;

CREATE OR REPLACE PROCEDURE sp_deactivate_supplier(
    p_tenant_id uuid, p_supplier_id uuid,
    INOUT p_supplier_id_out uuid DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    UPDATE suppliers SET is_active = false
    WHERE id = p_supplier_id AND tenant_id = p_tenant_id AND tenant_id = app_tenant_id()
      AND is_active;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SUPPLIER_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    p_supplier_id_out := p_supplier_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_supplier_by_id(p_tenant_id uuid, p_supplier_id uuid)
RETURNS SETOF suppliers
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT s.* FROM suppliers s
    WHERE s.id = p_supplier_id AND s.tenant_id = p_tenant_id AND s.tenant_id = app_tenant_id()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION fn_get_all_suppliers(p_tenant_id uuid, p_active_only boolean)
RETURNS SETOF suppliers
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT s.* FROM suppliers s
    WHERE s.tenant_id = p_tenant_id AND s.tenant_id = app_tenant_id()
      AND (p_active_only IS NOT TRUE OR s.is_active)
    ORDER BY s.name;
$$;

COMMIT;
