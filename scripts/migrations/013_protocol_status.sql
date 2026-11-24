-- 013_protocol_status: per-animal protocol status (T4) for the animal card.
-- Pure SQL: state per phase derives from executions and the lowest
-- unexecuted phase (the current one). Tenancy guards live in the service,
-- which throws NotFoundError when the protocol or animal resolves empty.
CREATE OR REPLACE FUNCTION fn_get_protocol_status(
    p_tenant_id uuid, p_animal_id uuid, p_protocol_id uuid
)
RETURNS json
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT json_build_object(
        'protocol', CASE
            WHEN pd.id IS NOT NULL THEN json_build_object('id', pd.id, 'name', pd.name)
            ELSE NULL
        END,
        'animal', CASE
            WHEN a.id IS NOT NULL THEN json_build_object(
                'id', a.id, 'earTag', a.ear_tag,
                'name', a.name, 'sex', a.sex, 'status', a.status)
            ELSE NULL
        END,
        'phases', COALESCE(agg.phases, '[]'::json)
    )
    FROM (
        SELECT p_tenant_id AS tenant
    ) anchor
    LEFT JOIN protocol_definitions pd
        ON pd.id = p_protocol_id AND pd.tenant_id = p_tenant_id
        AND pd.tenant_id = app_tenant_id()
    LEFT JOIN animals a
        ON a.id = p_animal_id AND a.tenant_id = p_tenant_id
        AND a.tenant_id = app_tenant_id()
    CROSS JOIN LATERAL (
        SELECT COALESCE(json_agg(json_build_object(
            'phaseNumber', ph.phase_number,
            'name', ph.name,
            'state', CASE
                WHEN ex.id IS NOT NULL THEN 'completed'
                WHEN ph.phase_number = (
                    SELECT MIN(next_ph.phase_number) FROM protocol_phases next_ph
                    WHERE next_ph.protocol_id = p_protocol_id
                        AND next_ph.tenant_id = p_tenant_id
                        AND next_ph.tenant_id = app_tenant_id()
                        AND NOT EXISTS (
                            SELECT 1 FROM phase_executions done
                            WHERE done.animal_id = p_animal_id
                                AND done.protocol_id = next_ph.protocol_id
                                AND done.phase_number = next_ph.phase_number
                                AND done.tenant_id = p_tenant_id
                        )
                ) THEN 'current'
                ELSE 'pending'
            END,
            'executedAt', ex.executed_at,
            'teamId', ex.team_id,
            'notes', ex.notes
        ) ORDER BY ph.phase_number), '[]'::json) AS phases
        FROM protocol_phases ph
        LEFT JOIN phase_executions ex
            ON ex.protocol_id = ph.protocol_id AND ex.phase_number = ph.phase_number
            AND ex.animal_id = p_animal_id AND ex.tenant_id = ph.tenant_id
        WHERE ph.protocol_id = p_protocol_id AND ph.tenant_id = p_tenant_id
            AND ph.tenant_id = app_tenant_id()
    ) agg
    LIMIT 1;
$$;
