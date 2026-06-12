// Order-related types extracted from main types.ts

export interface OrderStatusHistory {
  status: string;
  date: string;
  note?: string;
}

export interface OrderLineItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantTitle?: string;
}

export interface Order {
  id: string;
  customerName: string;
  total: number;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discountAmount?: number;
  couponCode?: string;
  shippingMethodName?: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered';
  history: OrderStatusHistory[];
  date: string;
  items: number;
  lineItems?: OrderLineItem[];
  paymentMethod?: string;
  email?: string;
  isInternal?: boolean;
  notes?: string;
  orderData?: Record<string, any>;
}
