# Order Review, Confirmation & Invoice PDF

## Problem
- Orders are placed immediately with no review step — users can't verify before committing
- Order placement is irreversible (stock is deducted atomically)
- Existing invoice modal (window.print()) renders content off-screen / broken

## Solution

### New Order Flow
```
Cart (existing) → Review Step → Place Order → Success Step (existing, enhanced)
```

### Review Step (new, inside existing modal)
- **Header**: "Review Order" with back arrow to return to cart
- **Content**: Simple line items table (Item, Qty, Unit Price, Subtotal) + grand total
- **Warning**: "This action cannot be undone. Stock will be deducted immediately."
- **Actions**:
  - "Export to PDF" — generates draft preview PDF (no invoice #, labeled "ORDER PREVIEW")
  - "Go Back" — returns to cart for editing
  - "Place Order" — primary button, places order

### Success Step (enhanced)
- Existing success message + order summary
- New "Export Invoice" button — generates full business invoice PDF with real order ID

### PDF Generation (jsPDF + jspdf-autotable)

**Draft Preview PDF** (before order):
- Header: "ORDER PREVIEW" watermark
- Date: current date
- Shop name and details
- Line items table
- Total
- No invoice number

**Final Invoice PDF** (after order):
- Header: "Shahjalal Inventory" branding
- Invoice #: first 8 chars of order UUID (uppercase)
- Date: order date
- Bill To: shop name, location, phone
- Line items table: Item, Qty, Unit Price, Subtotal
- Grand total

### Fix Existing Invoice Modal
- Replace window.print() with jsPDF generation
- Reuse same PDF generation utility for consistency

## Technical Changes
1. Install `jspdf` + `jspdf-autotable`
2. New utility: `lib/generate-order-pdf.ts` — shared PDF generation function
3. Modify `new-order-flow.tsx` — add "review" step between cart and success
4. Modify `invoice-modal.tsx` — replace window.print() with jsPDF
5. Update success step in `new-order-flow.tsx` to include "Export Invoice" button
