export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  expirationDate: string;
  categoryId: string;
}

export interface Shop {
  id: string;
  name: string;
  owner: string;
  location: string;
  phone: string;
  openingTime: string;
  closingTime: string;
}

export interface OrderLineItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  shopId: string;
  date: string;
  lineItems: OrderLineItem[];
  total: number;
}
