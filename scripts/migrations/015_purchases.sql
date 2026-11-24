-- Minimal accounts payable; optional single inventory item for valuation.
BEGIN;

CREATE TABLE purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
    description text NOT NULL CHECK (length(trim(description)) > 0),
    total_amount numeric(12,2) NOT NULL CHECK (total_amount > 0),
    purchased_at date NOT NULL DEFAULT CURRENT_DATE,
    due_date date,
    paid_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= total_amount),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
    created_at timestamptz NOT NULL DEFAULT now(),
    item_id uuid REFERENCES inventory_items(id),
    quantity numeric(12,3),
    CHECK ((item_id IS NULL AND quantity IS NULL) OR (item_id IS NOT NULL AND quantity IS NOT NULL AND quantity > 0)),
    CHECK ((paid_amount = 0 AND status = 'pending') OR
        (paid_amount > 0 AND paid_amount < total_amount AND status = 'partial') OR
        (paid_amount = total_amount AND status = 'paid'))
);
CREATE INDEX purchases_tenant_status ON purchases(tenant_id, status);
CREATE INDEX purchases_tenant_item ON purchases(tenant_id, item_id);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchases_isolation ON purchases USING (tenant_id = app_tenant_id());

CREATE OR REPLACE FUNCTION fn_get_purchase_by_id(p_tenant_id uuid, p_purchase_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_purchase json;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    SELECT json_build_object(
        'id', id, 'tenantId', tenant_id, 'supplierId', supplier_id,
        'description', description, 'totalAmount', total_amount, 'purchasedAt', purchased_at,
        'dueDate', due_date, 'paidAmount', paid_amount, 'status', status,
        'createdAt', created_at, 'itemId', item_id, 'quantity', quantity
    ) INTO v_purchase FROM purchases
    WHERE id = p_purchase_id AND tenant_id = p_tenant_id;
    RETURN v_purchase;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_create_purchase(
    p_tenant_id uuid, p_supplier_id uuid, p_description text, p_total_amount numeric,
    p_purchased_at date, p_due_date date, p_item_id uuid, p_quantity numeric,
    INOUT p_purchase json DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    IF p_supplier_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM suppliers WHERE id = p_supplier_id AND tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'SUPPLIER_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    IF p_item_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM inventory_items WHERE id = p_item_id AND tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'ITEM_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO purchases(tenant_id, supplier_id, description, total_amount, purchased_at, due_date, item_id, quantity)
    VALUES (p_tenant_id, p_supplier_id, p_description, p_total_amount, COALESCE(p_purchased_at, CURRENT_DATE), p_due_date, p_item_id, p_quantity)
    RETURNING id INTO v_id;
    p_purchase := fn_get_purchase_by_id(p_tenant_id, v_id);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_register_purchase_payment(
    p_tenant_id uuid, p_purchase_id uuid, p_amount numeric, INOUT p_purchase json DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE v_purchase purchases;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_purchase FROM purchases
    WHERE id = p_purchase_id AND tenant_id = p_tenant_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PURCHASE_NOT_IN_TENANT' USING ERRCODE = 'P0001';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'PAYMENT_MUST_BE_POSITIVE' USING ERRCODE = 'P0001';
    END IF;
    IF v_purchase.paid_amount + p_amount > v_purchase.total_amount THEN
        RAISE EXCEPTION 'PAYMENT_EXCEEDS_TOTAL' USING ERRCODE = 'P0001';
    END IF;
    UPDATE purchases SET paid_amount = paid_amount + p_amount,
        status = CASE WHEN paid_amount + p_amount = total_amount THEN 'paid' ELSE 'partial' END
    WHERE id = p_purchase_id AND tenant_id = p_tenant_id;
    p_purchase := fn_get_purchase_by_id(p_tenant_id, p_purchase_id);
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_all_purchases(p_tenant_id uuid, p_status text)
RETURNS json LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_purchases json;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    SELECT COALESCE(json_agg(fn_get_purchase_by_id(p_tenant_id, id) ORDER BY created_at, id), '[]')
    INTO v_purchases FROM purchases
    WHERE tenant_id = p_tenant_id AND (p_status IS NULL OR status = p_status);
    RETURN v_purchases;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_payables_summary(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_summary json;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    SELECT json_build_object(
        'totalPending', COALESCE(sum(total_amount - paid_amount), 0),
        'totalPaid', COALESCE(sum(paid_amount), 0),
        'countPending', count(*) FILTER (WHERE status <> 'paid'),
        'overdueCount', count(*) FILTER (WHERE due_date < CURRENT_DATE AND status <> 'paid')
    ) INTO v_summary FROM purchases WHERE tenant_id = p_tenant_id;
    RETURN v_summary;
END;
$$;
COMMIT;
