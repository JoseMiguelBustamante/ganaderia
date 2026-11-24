-- 020_report_exports: rows for CSV exports (operar con confianza, T2).
-- Read-only helpers: purchases and stock movements within a date range,
-- tenant-scoped like every other query.
BEGIN;

CREATE OR REPLACE FUNCTION fn_get_purchases_for_export(
    p_tenant_id uuid, p_from date, p_to date
)
RETURNS TABLE (
    purchased_at date, description text, supplier text,
    total_amount numeric, paid_amount numeric, status text, due_date date
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT p.purchased_at, p.description, COALESCE(s.name, ''),
           p.total_amount, p.paid_amount, p.status, p.due_date
    FROM purchases p
    LEFT JOIN suppliers s ON s.id = p.supplier_id AND s.tenant_id = p.tenant_id
    WHERE p.tenant_id = p_tenant_id AND p.tenant_id = app_tenant_id()
      AND (p_from IS NULL OR p.purchased_at >= p_from)
      AND (p_to IS NULL OR p.purchased_at <= p_to)
    ORDER BY p.purchased_at, p.description;
$$;

CREATE OR REPLACE FUNCTION fn_get_movements_for_export(
    p_tenant_id uuid, p_from date, p_to date
)
RETURNS TABLE (
    occurred_at timestamptz, item text, category text, delta_qty numeric,
    reason text, animal_tag text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT m.created_at, i.name, i.category, m.delta_qty, m.reason,
           COALESCE(a.ear_tag, '')
    FROM stock_movements m
    JOIN inventory_items i ON i.id = m.item_id AND i.tenant_id = m.tenant_id
    LEFT JOIN animals a ON a.id = m.animal_id AND a.tenant_id = m.tenant_id
    WHERE m.tenant_id = p_tenant_id AND m.tenant_id = app_tenant_id()
      AND (p_from IS NULL OR m.created_at >= p_from::timestamptz)
      AND (p_to IS NULL OR m.created_at < (p_to + 1)::timestamptz)
    ORDER BY m.created_at;
$$;

COMMIT;
