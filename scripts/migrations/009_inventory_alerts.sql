-- 009_inventory_alerts: stock alert aggregation (Fase 2 / M2, T4).
BEGIN;

CREATE OR REPLACE FUNCTION fn_get_stock_alerts(p_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
    v_low_items json;
    v_low_lots json;
    v_expired_lots json;
BEGIN
    SELECT COALESCE(json_agg(json_build_object(
        'id', i.id, 'name', i.name, 'category', i.category,
        'stockQty', i.stock_qty, 'minStock', i.min_stock, 'stage', i.stage)), '[]')
    INTO v_low_items
    FROM inventory_items i
    WHERE i.tenant_id = p_tenant_id AND i.tenant_id = app_tenant_id()
      AND i.is_active AND i.stock_qty <= i.min_stock;

    SELECT COALESCE(json_agg(json_build_object(
        'id', s.id, 'itemId', s.item_id, 'lotCode', s.lot_code,
        'totalDoses', s.total_doses, 'availableDoses', s.available_doses,
        'expiresAt', s.expires_at, 'status', s.status)), '[]')
    INTO v_low_lots
    FROM semen_lots s
    WHERE s.tenant_id = p_tenant_id AND s.tenant_id = app_tenant_id()
      AND s.status = 'available' AND s.available_doses <= 3;

    SELECT COALESCE(json_agg(json_build_object(
        'id', s.id, 'itemId', s.item_id, 'lotCode', s.lot_code,
        'availableDoses', s.available_doses, 'expiresAt', s.expires_at)), '[]')
    INTO v_expired_lots
    FROM semen_lots s
    WHERE s.tenant_id = p_tenant_id AND s.tenant_id = app_tenant_id()
      AND s.status = 'available' AND s.expires_at IS NOT NULL AND s.expires_at < CURRENT_DATE;

    RETURN json_build_object(
        'lowStockItems', v_low_items,
        'lowDoseLots', v_low_lots,
        'expiredLots', v_expired_lots
    );
END;
$$;

COMMIT;
