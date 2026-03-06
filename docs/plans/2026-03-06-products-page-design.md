# Products Page & Order Mode Design

## Overview

A new `/products` page serving two purposes:
1. **Showcase mode** - Customer-facing product catalog (read-only)
2. **Order mode** - Internal order-building interface with qty/price/discount controls

One page, two modes. Same responsive grid layout, different levels of interactivity.

## Showcase Mode (Customer View)

- Responsive product grid: 2 cols mobile, 3 cols tablet, 4 cols desktop
- Product cards: large square image, product name, bold price - nothing else
- Items grouped by category with sticky section headers
- Top bar: search input + horizontally scrollable category filter pills
- Out-of-stock items greyed out with overlay (not hidden - customers see the full range)
- No stock numbers, no editable fields

## Order Mode (Internal)

Same grid and cards, plus:
- **Quantity control**: +/- stepper appears when item is added
- **Editable unit price**: pre-filled from inventory, overridable
- **Discount % field**: defaults to 0, shows discounted subtotal per item
- **Stock quantity visible**: for internal reference
- **Sticky bottom bar**: item count + running total + "Review Order" button
  - Tap to expand into full cart review with line items, subtotals, discounts
  - Shop name displayed in the bar
- **Shop selector**: if entered via "Start Order" on products page, shop picker appears first. If entered from shop detail, shop is pre-selected.

## Entry Points

1. `/products` - Showcase mode. "Start Order" button in top bar triggers shop picker, then switches to order mode.
2. Shop detail page "New Order" button navigates to `/products?shop=<id>&mode=order`

## URL Structure

- `/products` - Showcase mode
- `/products?shop=<shopId>&mode=order` - Order mode with shop pre-selected

## Review & Place Order

Expanding the bottom bar or tapping "Review Order" shows full order summary. Reuses the existing review table, warnings, and PDF export flow. Place order calls existing `placeOrder()` server action.

## Data Requirements

- Full `InventoryItem[]` (needs images) via `getInventoryItems()`
- `Category[]` via `getCategories()`
- Order mode: shop info resolved from query param via `getShops()`

## Navigation

Add "Products" entry to sidebar and bottom tabs, positioned between Inventory and Shops.

## Discount Model

- Per-item discount percentage (0-100%)
- Displayed on each product tile in order mode
- Subtotal per item = qty * unit_price * (1 - discount/100)
- Order total = sum of all discounted subtotals
