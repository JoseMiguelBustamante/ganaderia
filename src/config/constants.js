export const constants = {
    // Purchases and financial/operational reports
    SP_CREATE_PURCHASE: 'sp_create_purchase',
    SP_REGISTER_PURCHASE_PAYMENT: 'sp_register_purchase_payment',
    FN_GET_ALL_PURCHASES: 'fn_get_all_purchases',
    FN_GET_PURCHASE_BY_ID: 'fn_get_purchase_by_id',
    FN_GET_PAYABLES_SUMMARY: 'fn_get_payables_summary',
    FN_GET_ANIMAL_COSTS: 'fn_get_animal_costs',
    FN_GET_STAGE_COSTS: 'fn_get_stage_costs',
    FN_GET_REPORTS_SUMMARY: 'fn_get_reports_summary',
    // Tenant users (bloque T3)
    SP_CREATE_USER: 'sp_create_user',
    SP_DEACTIVATE_USER: 'sp_deactivate_user',
    SP_CHANGE_USER_PASSWORD: 'sp_change_user_password',
    FN_GET_ALL_USERS: 'fn_get_all_users',
    // Auth (T3)
    SP_CREATE_TENANT_WITH_OWNER: 'sp_create_tenant_with_owner',
    FN_GET_TENANT_BY_SLUG: 'fn_get_tenant_by_slug',
    FN_GET_USER_BY_TENANT_AND_EMAIL: 'fn_get_user_by_tenant_and_email',
    FN_GET_USER_BY_ID: 'fn_get_user_by_id',
    FN_GET_LOGIN_CONTEXT_BY_EMAIL: 'fn_get_login_context_by_email',
    // Animals (T4)
    SP_CREATE_ANIMAL: 'sp_create_animal',
    FN_GET_ALL_ANIMALS: 'fn_get_all_animals',
    SP_UPDATE_ANIMAL: 'sp_update_animal',
    SP_DEACTIVATE_ANIMAL: 'sp_deactivate_animal',
    FN_GET_ANIMAL_BY_ID: 'fn_get_animal_by_id',
    // Inventory and protocols (T5)
    SP_CREATE_INVENTORY_ITEM: 'sp_create_inventory_item',
    SP_ADD_STOCK: 'sp_add_stock',
    FN_GET_INVENTORY_ITEM_BY_ID: 'fn_get_inventory_item_by_id',
    FN_GET_ALL_INVENTORY_ITEMS: 'fn_get_all_inventory_items',
    SP_UPDATE_INVENTORY_ITEM: 'sp_update_inventory_item',
    SP_DEACTIVATE_INVENTORY_ITEM: 'sp_deactivate_inventory_item',
    SP_CREATE_PROTOCOL: 'sp_create_protocol',
    SP_COMPLETE_PHASE: 'sp_complete_phase',
    FN_GET_PHASE_EXECUTIONS: 'fn_get_phase_executions',
    // Suppliers (Fase 2 / M2, T1)
    SP_CREATE_SUPPLIER: 'sp_create_supplier',
    SP_UPDATE_SUPPLIER: 'sp_update_supplier',
    SP_DEACTIVATE_SUPPLIER: 'sp_deactivate_supplier',
    FN_GET_SUPPLIER_BY_ID: 'fn_get_supplier_by_id',
    FN_GET_ALL_SUPPLIERS: 'fn_get_all_suppliers',
    // Semen lots (Fase 2 / M2, T3)
    SP_CREATE_SEMEN_LOT: 'sp_create_semen_lot',
    SP_CONSUME_SEMEN_LOT: 'sp_consume_semen_lot',
    FN_GET_SEMEN_LOT_BY_ID: 'fn_get_semen_lot_by_id',
    FN_GET_ALL_SEMEN_LOTS: 'fn_get_all_semen_lots',
    // Breeding protocol (Fase 3, T1)
    SP_CREATE_BREEDING_PROTOCOL: 'sp_create_breeding_protocol',
    FN_GET_ALL_PROTOCOLS: 'fn_get_all_protocols',
    // Teams (Fase 3, T3)
    SP_CREATE_TEAM: 'sp_create_team',
    FN_GET_ALL_TEAMS: 'fn_get_all_teams',
    // Protocol status (Fase 3, T4)
    FN_GET_PROTOCOL_STATUS: 'fn_get_protocol_status',
    // Stock alerts (Fase 2 / M2, T4)
    FN_GET_STOCK_ALERTS: 'fn_get_stock_alerts',
};
