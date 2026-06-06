import type { Category, InventoryItem, Shop, Order, OrderLineItem } from "@/lib/types";
import type { DemoData } from "@/lib/demo/types";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const dateAhead = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

// Stable category ids (opaque strings — demo never touches Postgres)
const C = {
  beverages: "cat-beverages",
  grains: "cat-grains",
  tinned: "cat-tinned",
  snacks: "cat-snacks",
  household: "cat-household",
  oils: "cat-oils",
};

const img = (slug: string) => `/demo/${slug}.svg`;

function categories(): Category[] {
  const at = daysAgo(120);
  return [
    { id: C.beverages, name: "Beverages", image: img("beverages"), created_at: at },
    { id: C.grains, name: "Grains & Rice", image: img("grains"), created_at: at },
    { id: C.tinned, name: "Tinned Goods", image: img("tinned"), created_at: at },
    { id: C.snacks, name: "Snacks & Confectionery", image: img("snacks"), created_at: at },
    { id: C.household, name: "Household", image: img("household"), created_at: at },
    { id: C.oils, name: "Cooking Oils & Sauces", image: img("oils"), created_at: at },
  ];
}

// id, name, category, price (£ wholesale), qty, catSlug (for image), expiryDays|null
const ITEMS: [string, string, string, number, number, string, number | null][] = [
  ["item-supermalt", "Supermalt (Case of 24)", C.beverages, 13.5, 60, "beverages", 240],
  ["item-cola", "Coca-Cola (24 x 330ml)", C.beverages, 9.99, 48, "beverages", 300],
  ["item-water", "Still Water (24 x 500ml)", C.beverages, 4.2, 120, "beverages", 365],
  ["item-lucozade", "Lucozade Energy (12 x 380ml)", C.beverages, 8.4, 8, "beverages", 200],
  ["item-basmati", "Basmati Rice (20kg sack)", C.grains, 24.5, 35, "grains", 540],
  ["item-jasmine", "Jasmine Rice (10kg)", C.grains, 15.0, 26, "grains", 540],
  ["item-penne", "Pasta Penne (Box of 20)", C.grains, 9.0, 40, "grains", 420],
  ["item-flour", "Plain Flour (16 x 1.5kg)", C.grains, 11.2, 6, "grains", 300],
  ["item-tomatoes", "Chopped Tomatoes (24 x 400g)", C.tinned, 11.0, 50, "tinned", 600],
  ["item-beans", "Baked Beans (24 x 415g)", C.tinned, 10.5, 44, "tinned", 600],
  ["item-sardines", "Sardines in Oil (Case of 50)", C.tinned, 18.0, 22, "tinned", 720],
  ["item-sweetcorn", "Sweetcorn (24 x 340g)", C.tinned, 9.6, 9, "tinned", 600],
  ["item-plantain", "Plantain Chips (Box of 30)", C.snacks, 12.0, 30, "snacks", 150],
  ["item-digestives", "Digestive Biscuits (48 packs)", C.snacks, 14.4, 25, "snacks", 180],
  ["item-nuts", "Mixed Nuts (12 x 200g)", C.snacks, 16.8, 7, "snacks", 120],
  ["item-washingup", "Washing-up Liquid (12 x 500ml)", C.household, 9.0, 38, "household", null],
  ["item-kitchenroll", "Kitchen Roll (24 rolls)", C.household, 8.4, 33, "household", null],
  ["item-binbags", "Bin Bags (Box of 200)", C.household, 6.5, 60, "household", null],
  ["item-bleach", "Bleach (12 x 750ml)", C.household, 7.2, 18, "household", null],
  ["item-vegoil", "Vegetable Oil (10L)", C.oils, 16.0, 28, "oils", 300],
  ["item-palmoil", "Palm Oil (5L)", C.oils, 12.5, 5, "oils", 300],
  ["item-tomatopaste", "Tomato Paste (Case of 24)", C.oils, 10.0, 42, "oils", 540],
];

function inventory(): InventoryItem[] {
  return ITEMS.map(([id, name, cat, price, qty, slug, exp], idx) => ({
    id,
    name,
    image: img(slug),
    price,
    quantity: qty,
    expiration_date: exp == null ? null : dateAhead(exp),
    category_id: cat,
    created_at: daysAgo(110 - idx),
  }));
}

const S = {
  peckham: "shop-peckham",
  dalston: "shop-dalston",
  brixton: "shop-brixton",
  tooting: "shop-tooting",
  whitechapel: "shop-whitechapel",
};

function shops(): Shop[] {
  const at = daysAgo(100);
  return [
    { id: S.peckham, name: "Peckham Local Foods", owner: "Adaeze Okafor", location: "Rye Lane, Peckham, London SE15 5BS", phone: "020 7639 1122", opening_time: "07:00", closing_time: "21:00", created_at: at },
    { id: S.dalston, name: "Dalston Express Mart", owner: "Mehmet Yilmaz", location: "Kingsland High St, Dalston, London E8 2JS", phone: "020 7254 3344", opening_time: "06:30", closing_time: "22:30", created_at: at },
    { id: S.brixton, name: "Brixton Village Grocers", owner: "Joseph Mensah", location: "Coldharbour Lane, Brixton, London SW9 8PS", phone: "020 7274 5566", opening_time: "08:00", closing_time: "20:00", created_at: at },
    { id: S.tooting, name: "Tooting Broadway Stores", owner: "Priya Sharma", location: "Tooting High St, London SW17 0RH", phone: "020 8672 7788", opening_time: "07:30", closing_time: "21:30", created_at: at },
    { id: S.whitechapel, name: "Whitechapel Cash & Carry", owner: "Imran Khan", location: "Whitechapel Rd, London E1 1DU", phone: "020 7247 9900", opening_time: "06:00", closing_time: "23:00", created_at: at },
  ];
}

const uuid = (short: string) => `demo-${short}`; // deterministic, unique, opaque

// orderId, shopId, daysAgo, status, [ [itemId, itemName, qty, unitPrice], ... ]
const ORDERS: [string, string, number, "pending" | "completed", [string, string, number, number][]][] = [
  ["order-1", S.peckham, 2, "completed", [["item-basmati", "Basmati Rice (20kg sack)", 4, 24.5], ["item-tomatoes", "Chopped Tomatoes (24 x 400g)", 6, 11.0]]],
  ["order-2", S.dalston, 4, "completed", [["item-supermalt", "Supermalt (Case of 24)", 5, 13.5], ["item-plantain", "Plantain Chips (Box of 30)", 3, 12.0]]],
  ["order-3", S.brixton, 6, "completed", [["item-vegoil", "Vegetable Oil (10L)", 4, 16.0], ["item-beans", "Baked Beans (24 x 415g)", 5, 10.5]]],
  ["order-4", S.whitechapel, 1, "pending", [["item-basmati", "Basmati Rice (20kg sack)", 6, 23.0], ["item-tomatopaste", "Tomato Paste (Case of 24)", 4, 10.0]]],
  ["order-5", S.tooting, 9, "completed", [["item-kitchenroll", "Kitchen Roll (24 rolls)", 8, 8.4]]],
  ["order-6", S.peckham, 0, "pending", [["item-cola", "Coca-Cola (24 x 330ml)", 10, 9.99], ["item-digestives", "Digestive Biscuits (48 packs)", 4, 14.4]]],
];

function orders(): Order[] {
  return ORDERS.map(([id, shopId, ago, status, lines]) => {
    const line_items: OrderLineItem[] = lines.map(([item_id, item_name, quantity, unit_price], i) => ({
      id: uuid(`line-${id}-${i}`),
      order_id: id,
      item_id,
      item_name,
      quantity,
      unit_price,
    }));
    const total = line_items.reduce((t, li) => t + li.quantity * li.unit_price, 0);
    return { id, shop_id: shopId, total, status, created_at: daysAgo(ago), line_items };
  });
}

/** Fresh, deep copy of the seed dataset on every call. */
export function buildSeed(): DemoData {
  return {
    categories: categories(),
    inventory_items: inventory(),
    shops: shops(),
    orders: orders(),
  };
}
