// 使用者
export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// 商品分類
export interface Category {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
}

// 庫存
export interface Inventory {
  quantity: number;
  minQuantity: number;
}

// 商品
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  price: number;
  cost: number;
  imageUrl?: string;
  isActive: boolean;
  categoryId: string;
  category: Category;
  inventory?: Inventory;
}

// 購物車項目
export interface CartItem {
  product: Product;
  quantity: number;
}

// 付款方式
export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'LINE_PAY' | 'OTHER';

// 訂單狀態
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'CANCELLED';

// 訂單項目
export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: Product;
}

// 訂單
export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: string;
  cashier: { name: string };
  items: OrderItem[];
}

// 庫存異動
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';

export interface InventoryMovement {
  id: string;
  type: MovementType;
  quantity: number;
  note?: string;
  createdAt: string;
}

// 報表
export interface DailySalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  product: { id: string; name: string; sku: string };
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}
