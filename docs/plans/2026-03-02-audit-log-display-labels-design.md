# Audit Log Display Labels

## Summary

Change how audit log actions are displayed in the UI to use context-aware, natural-language labels. DB values stay as `create` / `update` / `delete`. Display-only change.

## Action Label Mapping

| Entity         | create   | update  | delete  |
|---------------|----------|---------|---------|
| Order          | Sold     | Updated | n/a     |
| Inventory Item | Added    | Updated | Removed |
| Shop           | Added    | Updated | Removed |
| Category       | Added    | Updated | Removed |

## Dashboard Activity — Include Entity Names

Pull names from `new_values` / `old_values` already stored in audit rows:

- **Order create**: "Sold to {shop_name}" — requires storing shop name in `newValues` at write time
- **Inventory/Shop/Category create**: "Added {name}"
- **Deletes**: "Removed {name}" from `old_values.name`
- **Updates**: "Updated {name}" from `new_values.name` or `old_values.name`

## Files to Change

1. `orders.ts` — include shop name in `newValues` when logging audit event
2. `dashboard-client.tsx` — replace inline Created/Updated/Deleted with context-aware text including names
3. `audit-log-client.tsx` — update `actionLabel()` and `summarizeChanges()` to use context-aware verbs
