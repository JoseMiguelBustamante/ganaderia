BEGIN;

CREATE OR REPLACE FUNCTION fn_get_reports_summary(p_tenant_id uuid, p_from date, p_to date)
RETURNS json LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
    v_from date := COALESCE(p_from, COALESCE(p_to, CURRENT_DATE) - 29);
    v_to date := COALESCE(p_to, CURRENT_DATE);
    v_animals json;
    v_phases json;
    v_alerts json;
    v_consumption json;
    v_purchases json;
    v_executions bigint;
BEGIN
    IF (p_tenant_id = app_tenant_id()) IS NOT TRUE THEN
        RAISE EXCEPTION 'TENANT_MISMATCH' USING ERRCODE = '42501';
    END IF;
    -- Current/latest completed phase for each animal in each protocol.
    SELECT COALESCE(json_agg(json_build_object(
        'phaseNumber', phase_number, 'phaseName', name, 'count', animal_count
    ) ORDER BY phase_number, name), '[]') INTO v_phases FROM (
        SELECT latest.phase_number, p.name, count(DISTINCT latest.animal_id) AS animal_count
        FROM (
            SELECT DISTINCT ON (animal_id, protocol_id) animal_id, protocol_id, phase_number
            FROM phase_executions WHERE tenant_id = p_tenant_id
            ORDER BY animal_id, protocol_id, phase_number DESC
        ) latest JOIN protocol_phases p ON p.protocol_id = latest.protocol_id
            AND p.phase_number = latest.phase_number AND p.tenant_id = p_tenant_id
        GROUP BY latest.phase_number, p.name
    ) grouped;
    SELECT json_build_object('total', count(*), 'active', count(*) FILTER (WHERE status = 'active'),
        'byPhase', v_phases) INTO v_animals FROM animals WHERE tenant_id = p_tenant_id;

    -- Reuse the canonical alert rules (active items <= minimum, available lots <=3, expired available lots).
    v_alerts := fn_get_stock_alerts(p_tenant_id);
    SELECT json_build_object('movements', count(*), 'totalUnits', COALESCE(sum(-delta_qty), 0))
    INTO v_consumption FROM stock_movements
    WHERE tenant_id = p_tenant_id AND delta_qty < 0
        AND created_at >= v_from::timestamptz AND created_at < (v_to + 1)::timestamptz;
    SELECT json_build_object('total', COALESCE(sum(total_amount), 0),
        'paid', COALESCE(sum(paid_amount), 0), 'pending', COALESCE(sum(total_amount - paid_amount), 0))
    INTO v_purchases FROM purchases WHERE tenant_id = p_tenant_id AND purchased_at BETWEEN v_from AND v_to;
    SELECT count(*) INTO v_executions FROM phase_executions WHERE tenant_id = p_tenant_id;

    RETURN json_build_object('animals', v_animals,
        'inventory', json_build_object(
            'lowStockItems', json_array_length(v_alerts->'lowStockItems'),
            'expiredLots', json_array_length(v_alerts->'expiredLots'),
            'lowDoseLots', json_array_length(v_alerts->'lowDoseLots')),
        'consumption', v_consumption, 'purchases', v_purchases,
        'executions', json_build_object('total', v_executions));
END;
$$;
COMMIT;
