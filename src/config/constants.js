export const constants = {
    // Auth (T3)
    SP_CREATE_TENANT_WITH_OWNER: 'sp_create_tenant_with_owner',
    FN_GET_TENANT_BY_SLUG: 'fn_get_tenant_by_slug',
    FN_GET_USER_BY_TENANT_AND_EMAIL: 'fn_get_user_by_tenant_and_email',
    FN_GET_USER_BY_ID: 'fn_get_user_by_id',
    // Animals (T4)
    SP_CREATE_ANIMAL: 'sp_create_animal',
    FN_GET_ALL_ANIMALS: 'fn_get_all_animals',
    FN_GET_ANIMAL_BY_ID: 'fn_get_animal_by_id',
    // Inventory and protocols (T5)
    SP_CREATE_INVENTORY_ITEM: 'sp_create_inventory_item',
    SP_ADD_STOCK: 'sp_add_stock',
    FN_GET_INVENTORY_ITEM_BY_ID: 'fn_get_inventory_item_by_id',
    FN_GET_ALL_INVENTORY_ITEMS: 'fn_get_all_inventory_items',
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
    // Stock alerts (Fase 2 / M2, T4)
    FN_GET_STOCK_ALERTS: 'fn_get_stock_alerts',
};
