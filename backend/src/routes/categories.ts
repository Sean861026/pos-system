import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/categories
router.get('/', authenticate, async (_req, res: Response): Promise<void> => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json(categories);
});

// POST /api/categories
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res: Response): Promise<void> => {
  const { name, color, sortOrder } = req.body;
  if (!name) {
    res.status(400).json({ message: '請填寫分類名稱' });
    return;
  }
  const category = await prisma.category.create({
    data: { name, color, sortOrder },
  });
  res.status(201).json(category);
});

// PUT /api/categories/:id
router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), async (req, res: Response): Promise<void> => {
  const { name, color, sortOrder, isActive } = req.body;
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name, color, sortOrder, isActive },
  });
  res.json(category);
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res: Response): Promise<void> => {
  await prisma.category.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ message: '分類已停用' });
});

export default router;
