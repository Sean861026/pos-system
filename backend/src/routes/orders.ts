import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// 產生訂單編號
function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.getTime().toString().slice(-6);
  return `ORD-${date}-${time}`;
}

// GET /api/orders - 取得訂單列表
router.get('/', authenticate, async (req, res: Response): Promise<void> => {
  const { page = 1, limit = 20, startDate, endDate, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date(endDate as string) } : {}),
    };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        cashier: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ orders, total, page: Number(page), limit: Number(limit) });
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res: Response): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      cashier: { select: { name: true } },
      items: { include: { product: true } },
    },
  });

  if (!order) {
    res.status(404).json({ message: '訂單不存在' });
    return;
  }
  res.json(order);
});

// POST /api/orders - 建立新訂單（結帳）
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { items, paymentMethod, discountAmount = 0, note } = req.body;

  if (!items || items.length === 0) {
    res.status(400).json({ message: '購物車不能為空' });
    return;
  }

  if (!paymentMethod) {
    res.status(400).json({ message: '請選擇付款方式' });
    return;
  }

  // 取得所有商品資訊並驗證庫存
  const productIds = items.map((i: { productId: string }) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { inventory: true },
  });

  if (products.length !== productIds.length) {
    res.status(400).json({ message: '部分商品不存在或已下架' });
    return;
  }

  // 驗證庫存
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product?.inventory || product.inventory.quantity < item.quantity) {
      res.status(400).json({ message: `${product?.name || '商品'} 庫存不足` });
      return;
    }
  }

  // 計算金額
  const orderItems = items.map((item: { productId: string; quantity: number }) => {
    const product = products.find((p) => p.id === item.productId)!;
    const unitPrice = Number(product.price);
    const subtotal = unitPrice * item.quantity;
    return { productId: item.productId, quantity: item.quantity, unitPrice, subtotal };
  });

  const subtotal = orderItems.reduce((sum: number, i: { subtotal: number }) => sum + i.subtotal, 0);
  const total = subtotal - Number(discountAmount);

  // 建立訂單與更新庫存 (使用 Transaction)
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        status: 'COMPLETED',
        subtotal,
        discountAmount: Number(discountAmount),
        taxAmount: 0,
        total,
        paymentMethod,
        note,
        cashierId: req.userId!,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: { include: { product: true } },
        cashier: { select: { name: true } },
      },
    });

    // 更新庫存
    for (const item of orderItems) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: {
          quantity: { decrement: item.quantity },
          movements: {
            create: {
              type: 'OUT',
              quantity: item.quantity,
              note: `訂單 ${newOrder.orderNumber}`,
            },
          },
        },
      });
    }

    return newOrder;
  });

  res.status(201).json(order);
});

// POST /api/orders/:id/refund - 退款
router.post('/:id/refund', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res: Response): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });

  if (!order) {
    res.status(404).json({ message: '訂單不存在' });
    return;
  }

  if (order.status !== 'COMPLETED') {
    res.status(400).json({ message: `此訂單狀態為 ${order.status}，無法退款` });
    return;
  }

  // 退款並還原庫存（Transaction）
  const refunded = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: 'REFUNDED' },
      include: { items: { include: { product: true } }, cashier: { select: { name: true } } },
    });

    // 還原庫存
    for (const item of order.items) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: {
          quantity: { increment: item.quantity },
          movements: {
            create: {
              type: 'RETURN',
              quantity: item.quantity,
              note: `退款 ${order.orderNumber}`,
            },
          },
        },
      });
    }

    return updated;
  });

  res.json(refunded);
});

export default router;
