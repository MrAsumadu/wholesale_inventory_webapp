# Audit Log Display Labels — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make audit log display labels context-aware and include entity names (e.g. "Sold to Midlands Retail" instead of "Created Order").

**Architecture:** Display-only changes in 3 UI/action files. DB values (`create`/`update`/`delete`) stay unchanged. One small data change: pass shop name into `placeOrder` so the audit log stores it in `newValues`.

**Tech Stack:** Next.js, React, TypeScript, Supabase

---

### Task 1: Pass shop name into placeOrder and store in audit newValues

**Files:**
- Modify: `my-app/lib/actions/orders.ts:100-128`
- Modify: `my-app/components/orders/new-order-flow.tsx:134-153`
- Modify: `my-app/lib/actions/__tests__/orders.test.ts:150-176`

**Step 1: Update the placeOrder signature to accept shopName**

In `my-app/lib/actions/orders.ts`, add `shopName: string` as a third parameter and include it in `newValues`:

```typescript
export async function placeOrder(
  shopId: string,
  lineItems: {
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
  }[],
  shopName: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_shop_id: shopId,
    p_line_items: lineItems,
  });

  if (data) {
    await logAuditEvent({
      entityType: "order",
      entityId: String(data),
      action: "create",
      newValues: { shop_id: shopId, shop_name: shopName, line_items: lineItems } as Record<string, unknown>,
    });
  }

  updateTag("orders");
  updateTag("inventory");
  updateTag("shops");
  return { data, error };
}
```

**Step 2: Update the caller in new-order-flow.tsx**

In `my-app/components/orders/new-order-flow.tsx:143`, pass `shopName`:

```typescript
const result = await placeOrder(shopId, lineItems, shopName);
```

**Step 3: Update the test**

In `my-app/lib/actions/__tests__/orders.test.ts`, update the `placeOrder` calls to pass a shop name:

- Line 157: `const result = await placeOrder("s1", lineItems, "Test Shop");`
- Line 173: `const result = await placeOrder("s1", [], "Test Shop");`

**Step 4: Run tests**

Run: `cd my-app && npx jest lib/actions/__tests__/orders.test.ts --no-coverage`
Expected: All pass

**Step 5: Commit**

```bash
git add my-app/lib/actions/orders.ts my-app/components/orders/new-order-flow.tsx my-app/lib/actions/__tests__/orders.test.ts
git commit -m "feat: pass shop name into placeOrder for audit log"
```

---

### Task 2: Update audit log page labels (audit-log-client.tsx)

**Files:**
- Modify: `my-app/components/audit-log/audit-log-client.tsx:49-112`

**Step 1: Update actionLabel to be context-aware**

Replace `actionLabel(action)` with `actionLabel(action, entityType)`:

```typescript
function actionLabel(action: AuditAction, entityType?: AuditEntityType) {
  if (entityType === "order" && action === "create") return "Sold";
  switch (action) {
    case "create":
      return "Added";
    case "update":
      return "Updated";
    case "delete":
      return "Removed";
  }
}
```

**Step 2: Update summarizeChanges to use context-aware verbs**

```typescript
function summarizeChanges(log: AuditLog): string {
  const vals = (log.new_values ?? log.old_values) as Record<string, unknown> | null;
  const name = vals?.name ?? vals?.item_name;

  if (log.action === "create") {
    if (log.entity_type === "order") {
      const shopName = (log.new_values as Record<string, unknown>)?.shop_name;
      if (shopName) return `Sold to "${shopName}"`;
      return "Sold";
    }
    if (name) return `Added "${name}"`;
    return "New record";
  }
  if (log.action === "delete") {
    if (name) return `Removed "${name}"`;
    return "Record removed";
  }
  if (log.action === "update" && log.new_values) {
    const keys = Object.keys(log.new_values).filter(
      (k) => k !== "id" && k !== "created_at"
    );
    if (keys.length === 0) return "Updated";
    if (keys.length <= 2) return `Changed ${keys.join(", ")}`;
    return `Changed ${keys.length} fields`;
  }
  return "-";
}
```

**Step 3: Update the actionLabel call site**

Find where `actionLabel(log.action)` is called in the component's JSX and change it to `actionLabel(log.action, log.entity_type)`. Search for the `<Badge` usage around line 230+.

**Step 4: Run the dev server and verify the audit log page**

Run: `cd my-app && npm run build`
Expected: Build succeeds with no type errors

**Step 5: Commit**

```bash
git add my-app/components/audit-log/audit-log-client.tsx
git commit -m "feat: context-aware labels on audit log page"
```

---

### Task 3: Update dashboard recent activity labels (dashboard-client.tsx)

**Files:**
- Modify: `my-app/components/dashboard-client.tsx:35-41,360-389`

**Step 1: Replace the inline label rendering with a helper function**

Add a new function and remove the now-unused `activityEntityLabel`:

```typescript
function activityDescription(log: AuditLog): string {
  const vals = (log.new_values ?? log.old_values) as Record<string, unknown> | null;
  const name = vals?.name ?? vals?.item_name;
  const entityLabel = {
    category: "category",
    inventory_item: "item",
    shop: "shop",
    order: "order",
  }[log.entity_type];

  if (log.action === "create") {
    if (log.entity_type === "order") {
      const shopName = (log.new_values as Record<string, unknown>)?.shop_name;
      if (shopName) return `Sold to ${shopName}`;
      return "Sold order";
    }
    if (name) return `Added ${name}`;
    return `Added ${entityLabel}`;
  }
  if (log.action === "delete") {
    if (name) return `Removed ${name}`;
    return `Removed ${entityLabel}`;
  }
  if (name) return `Updated ${name}`;
  return `Updated ${entityLabel}`;
}
```

**Step 2: Replace the JSX at lines 374-381**

Change from:
```tsx
<p className="text-sm font-medium">
  {log.action === "create"
    ? "Created"
    : log.action === "update"
    ? "Updated"
    : "Deleted"}{" "}
  {activityEntityLabel(log.entity_type)}
</p>
```

To:
```tsx
<p className="text-sm font-medium">
  {activityDescription(log)}
</p>
```

**Step 3: Remove the unused `activityEntityLabel` function** (lines 35-42)

**Step 4: Remove `AuditEntityType` from the import** if no longer used in this file (check if `AuditEntityType` is referenced elsewhere in the file first — it isn't).

**Step 5: Build**

Run: `cd my-app && npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add my-app/components/dashboard-client.tsx
git commit -m "feat: context-aware labels with names in dashboard activity"
```
