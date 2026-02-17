import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/products - 取得所有商品
router.get('/', authenticate, async (_req, res: Response): Promise<void> => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      inventory: { select: { quantity: true, minQuantity: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(products);
});

// GET /api/products/:id - 取得單一商品
router.get('/:id', authenticate, async (req, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { category: true, inventory: true },
  });

  if (!product) {
    res.status(404).json({ message: '商品不存在' });
    return;
  }
  res.json(product);
});

// POST /api/products - 新增商品
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, sku, barcode, description, price, cost, categoryId, imageUrl, initialStock = 0 } = req.body;

  if (!name || !sku || !price || !categoryId) {
    res.status(400).json({ message: '請填寫必要欄位：名稱、SKU、價格、分類' });
    return;
  }

  const product = await prisma.product.create({
    data: {
      name,
      sku,
      barcode,
      description,
      price,
      cost: cost || 0,
      categoryId,
      imageUrl,
      inventory: {
        create: {
          quantity: initialStock,
          movements: initialStock > 0
            ? { create: { type: 'IN', quantity: initialStock, note: '初始庫存' } }
            : undefined,
        },
      },
    },
    include: { category: true, inventory: true },
  });

  res.status(201).json(product);
});

// PUT /api/products/:id - 更新商品
router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res: Response): Promise<void> => {
  const { name, sku, barcode, description, price, cost, categoryId, imageUrl, isActive } = req.body;

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { name, sku, barcode, description, price, cost, categoryId, imageUrl, isActive },
    include: { category: true, inventory: true },
  });

  res.json(product);
});

// DELETE /api/products/:id - 停用商品 (軟刪除)
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res: Response): Promise<void> => {
  await prisma.product.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ message: '商品已停用' });
});

export default router;
