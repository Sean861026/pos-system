import apiClient from './client';
import type { PaymentMethod, CartItem } from '../types';

// =====================
// 認證
// =====================
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  me: () => apiClient.get('/auth/me'),
};

// =====================
// 商品分類
// =====================
export const categoryApi = {
  getAll: () => apiClient.get('/categories'),
  create: (data: { name: string; color?: string; sortOrder?: number }) =>
    apiClient.post('/categories', data),
  update: (id: string, data: Partial<{ name: string; color: string; sortOrder: number; isActive: boolean }>) =>
    apiClient.put(`/categories/${id}`, data),
  delete: (id: string) => apiClient.delete(`/categories/${id}`),
};

// =====================
// 商品
// =====================
export const productApi = {
  getAll: () => apiClient.get('/products'),
  getById: (id: string) => apiClient.get(`/products/${id}`),
  create: (data: {
    name: string; sku: string; price: number; cost?: number;
    categoryId: string; barcode?: string; description?: string;
    imageUrl?: string; initialStock?: number;
  }) => apiClient.post('/products', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
};

// =====================
// 訂單
// =====================
export const orderApi = {
  getAll: (params?: { page?: number; limit?: number; startDate?: string; endDate?: string; status?: string }) =>
    apiClient.get('/orders', { params }),
  getById: (id: string) => apiClient.get(`/orders/${id}`),
  create: (data: {
    items: { productId: string; quantity: number }[];
    paymentMethod: PaymentMethod;
    discountAmount?: number;
    note?: string;
  }) => apiClient.post('/orders', data),
  // 從購物車建立訂單
  checkout: (cartItems: CartItem[], paymentMethod: PaymentMethod, discountAmount = 0, note?: string) =>
    apiClient.post('/orders', {
      items: cartItems.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      paymentMethod,
      discountAmount,
      note,
    }),
  refund: (id: string) => apiClient.post(`/orders/${id}/refund`),
};

// =====================
// 庫存
// =====================
export const inventoryApi = {
  getAll: () => apiClient.get('/inventory'),
  getLowStock: () => apiClient.get('/inventory/low-stock'),
  getMovements: (productId: string) => apiClient.get(`/inventory/${productId}/movements`),
  adjust: (productId: string, quantity: number, note?: string) =>
    apiClient.post(`/inventory/${productId}/adjust`, { quantity, note }),
};

// =====================
// 使用者管理
// =====================
export const userApi = {
  getAll: () => apiClient.get('/users'),
  create: (data: { name: string; email: string; password: string; role: string }) =>
    apiClient.post('/users', data),
  update: (id: string, data: Partial<{ name: string; email: string; role: string; isActive: boolean; password: string }>) =>
    apiClient.put(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
};

// =====================
// 報表
// =====================
export const reportApi = {
  getSummary: () => apiClient.get('/reports/sales/summary'),
  getDailySales: (days?: number) => apiClient.get('/reports/sales/daily', { params: { days } }),
  getTopProducts: (params?: { limit?: number; startDate?: string; endDate?: string }) =>
    apiClient.get('/reports/products/top', { params }),
  getPaymentMethods: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get('/reports/payment-methods', { params }),
};
