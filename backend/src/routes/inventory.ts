import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/inventory - 庫存列表（含低庫存警告）
router.get('/', authenticate, async (_req, res: Response): Promise<void> => {
  const inventories = await prisma.inventory.findMany({
    include: {
      product: {
        include: { category: true },
      },
    },
    orderBy: { product: { name: 'asc' } },
  });

  const result = inventories.map((inv) => ({
    ...inv,
    isLowStock: inv.quantity <= inv.minQuantity,
  }));

  res.json(result);
});

// GET /api/inventory/low-stock - 低庫存商品
router.get('/low-stock', authenticate, async (_req, res: Response): Promise<void> => {
  const inventories = await prisma.inventory.findMany({
    where: {
      quantity: { lte: prisma.inventory.fields.minQuantity },
    },
    include: {
      product: { include: { category: true } },
    },
  });
  res.json(inventories);
});

// GET /api/inventory/:productId/movements - 庫存異動記錄
router.get('/:productId/movements', authenticate, async (req, res: Response): Promise<void> => {
  const inventory = await prisma.inventory.findUnique({
    where: { productId: req.params.productId },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!inventory) {
    res.status(404).json({ message: '庫存記錄不存在' });
    return;
  }
  res.json(inventory.movements);
});

// POST /api/inventory/:productId/adjust - 手動調整庫存
router.post('/:productId/adjust', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res: Response): Promise<void> => {
  const { quantity, note } = req.body;

  if (quantity === undefined) {
    res.status(400).json({ message: '請填寫調整數量' });
    return;
  }

  const inventory = await prisma.inventory.findUnique({
    where: { productId: req.params.productId },
  });

  if (!inventory) {
    res.status(404).json({ message: '庫存記錄不存在' });
    return;
  }

  const newQuantity = inventory.quantity + Number(quantity);
  if (newQuantity < 0) {
    res.status(400).json({ message: '調整後庫存不能為負數' });
    return;
  }

  const updated = await prisma.inventory.update({
    where: { productId: req.params.productId },
    data: {
      quantity: newQuantity,
      movements: {
        create: {
          type: 'ADJUSTMENT',
          quantity: Number(quantity),
          note: note || '手動調整',
        },
      },
    },
    include: { product: true },
  });

  res.json(updated);
});

export default router;
