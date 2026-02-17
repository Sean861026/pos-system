import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/reports/sales/summary - 銷售概況（今日/本週/本月）
router.get('/sales/summary', authenticate, requireRole('ADMIN', 'MANAGER'), async (_req, res: Response): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayStats, monthStats, totalOrders] = await Promise.all([
    prisma.order.aggregate({
      where: { status: 'COMPLETED', createdAt: { gte: startOfDay } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
  ]);

  res.json({
    today: {
      revenue: todayStats._sum.total || 0,
      orders: todayStats._count,
    },
    month: {
      revenue: monthStats._sum.total || 0,
      orders: monthStats._count,
    },
    total: { orders: totalOrders },
  });
});

// GET /api/reports/sales/daily - 每日銷售報表
router.get('/sales/daily', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res: Response): Promise<void> => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Number(days));

  const orders = await prisma.order.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: startDate },
    },
    select: { createdAt: true, total: true },
    orderBy: { createdAt: 'asc' },
  });

  // 按日期分組
  const dailyData: Record<string, { date: string; revenue: number; orders: number }> = {};
  orders.forEach((order) => {
    const date = order.createdAt.toISOString().slice(0, 10);
    if (!dailyData[date]) {
      dailyData[date] = { date, revenue: 0, orders: 0 };
    }
    dailyData[date].revenue += Number(order.total);
    dailyData[date].orders += 1;
  });

  res.json(Object.values(dailyData));
});

// GET /api/reports/products/top - 熱銷商品排行
router.get('/products/top', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res: Response): Promise<void> => {
  const { limit = 10, startDate, endDate } = req.query;

  const where: Record<string, unknown> = {
    order: { status: 'COMPLETED' },
  };
  if (startDate || endDate) {
    where.order = {
      status: 'COMPLETED',
      createdAt: {
        ...(startDate ? { gte: new Date(startDate as string) } : {}),
        ...(endDate ? { lte: new Date(endDate as string) } : {}),
      },
    };
  }

  const topProducts = await prisma.orderItem.groupBy({
    by: ['productId'],
    where,
    _sum: { quantity: true, subtotal: true },
    _count: true,
    orderBy: { _sum: { quantity: 'desc' } },
    take: Number(limit),
  });

  const productIds = topProducts.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true },
  });

  const result = topProducts.map((item) => ({
    product: products.find((p) => p.id === item.productId),
    totalQuantity: item._sum.quantity,
    totalRevenue: item._sum.subtotal,
    orderCount: item._count,
  }));

  res.json(result);
});

// GET /api/reports/payment-methods - 付款方式統計
router.get('/payment-methods', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res: Response): Promise<void> => {
  const { startDate, endDate } = req.query;

  const where: Record<string, unknown> = { status: 'COMPLETED' };
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date(endDate as string) } : {}),
    };
  }

  const stats = await prisma.order.groupBy({
    by: ['paymentMethod'],
    where,
    _sum: { total: true },
    _count: true,
  });

  res.json(stats);
});

export default router;
